const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, ZeroAddress } = require("ethers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LiquidityPool Integration Tests", function () {
  let tokenA;
  let tokenB;
  let liquidityPool;
  let owner;
  let user1;
  let user2;
  let user3;

  const INITIAL_MINT = parseEther("100000");
  const INITIAL_LIQUIDITY = parseEther("10000");

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy tokens
    const TokenA = await ethers.getContractFactory("TokenA");
    const TokenB = await ethers.getContractFactory("TokenB");
    tokenA = await TokenA.deploy();
    tokenB = await TokenB.deploy();

    // Deploy pool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress()
    );

    // Setup initial token distribution
    await tokenA.mint(await user1.getAddress(), INITIAL_MINT);
    await tokenB.mint(await user1.getAddress(), INITIAL_MINT);
    await tokenA.mint(await user2.getAddress(), INITIAL_MINT);
    await tokenB.mint(await user2.getAddress(), INITIAL_MINT);

    // Update all .address to getAddress()
    await tokenA
      .connect(user1)
      .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
    await tokenB
      .connect(user1)
      .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
  });

  describe("Full Lifecycle", function () {
    it("Should handle a complete cycle of operations", async function () {
      // 1. Initial liquidity provision
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await liquidityPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY, INITIAL_LIQUIDITY);

      // 2. Multiple users adding liquidity
      const additionalLiquidity = parseEther("5000");
      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), additionalLiquidity);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), additionalLiquidity);
      await liquidityPool
        .connect(user2)
        .addLiquidity(additionalLiquidity, additionalLiquidity);

      // 3. Perform swaps
      const swapAmount = parseEther("1000");
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), swapAmount);
      const expectedOutput = await liquidityPool.getAmountOut(
        await tokenA.getAddress(),
        swapAmount
      );
      const deadline = (await time.latest()) + 3600;

      await liquidityPool
        .connect(user1)
        .swap(
          await tokenA.getAddress(),
          swapAmount,
          (expectedOutput * BigInt(95)) / BigInt(100),
          deadline
        );

      // 4. Remove partial liquidity
      const user2Shares = await liquidityPool.shares(await user2.getAddress());
      const halfShares = user2Shares / BigInt(2);
      await liquidityPool.connect(user2).removeLiquidity(halfShares);

      // 5. More swaps after liquidity removal
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), swapAmount);
      const newExpectedOutput = await liquidityPool.getAmountOut(
        await tokenB.getAddress(),
        swapAmount
      );
      await liquidityPool
        .connect(user2)
        .swap(
          await tokenB.getAddress(),
          swapAmount,
          (newExpectedOutput * BigInt(95)) / BigInt(100),
          deadline
        );

      // 6. Emergency pause and attempted operations
      await liquidityPool.connect(owner).pause();
      await expect(
        liquidityPool.connect(user1).addLiquidity(swapAmount, swapAmount)
      ).to.be.revertedWithCustomError(liquidityPool, "PoolPausedError");

      // 7. Resume operations
      await liquidityPool.connect(owner).unpause();
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), swapAmount);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), swapAmount);
      await liquidityPool.connect(user1).addLiquidity(swapAmount, swapAmount);

      // 8. Final state verification
      const [finalReserveA, finalReserveB] = await liquidityPool.getReserves();
      expect(finalReserveA).to.be.gt(0);
      expect(finalReserveB).to.be.gt(0);
      expect(await liquidityPool.totalShares()).to.be.gt(0);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle rapid price changes", async function () {
      // Setup initial liquidity
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await liquidityPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY, INITIAL_LIQUIDITY);

      // Perform multiple swaps rapidly
      const swapAmount = parseEther("1000");
      const deadline = (await time.latest()) + 3600;

      for (let i = 0; i < 5; i++) {
        await tokenA
          .connect(user2)
          .approve(await liquidityPool.getAddress(), swapAmount);
        const expectedOutput = await liquidityPool.getAmountOut(
          await tokenA.getAddress(),
          swapAmount
        );
        await liquidityPool
          .connect(user2)
          .swap(
            await tokenA.getAddress(),
            swapAmount,
            (expectedOutput * BigInt(95)) / BigInt(100),
            deadline
          );

        // Swap back
        const reversedAmount = (expectedOutput * BigInt(95)) / BigInt(100);
        await tokenB
          .connect(user2)
          .approve(await liquidityPool.getAddress(), reversedAmount);
        const reverseExpectedOutput = await liquidityPool.getAmountOut(
          await tokenB.getAddress(),
          reversedAmount
        );
        await liquidityPool
          .connect(user2)
          .swap(
            await tokenB.getAddress(),
            reversedAmount,
            (reverseExpectedOutput * BigInt(95)) / BigInt(100),
            deadline
          );
      }

      const [finalReserveA, finalReserveB] = await liquidityPool.getReserves();
      expect(finalReserveA).to.be.gt(0);
      expect(finalReserveB).to.be.gt(0);
    });

    it("Should handle multiple users interacting simultaneously", async function () {
      // Initial setup
      const setupAmount = parseEther("5000");
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), setupAmount);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), setupAmount);
      await liquidityPool.connect(user1).addLiquidity(setupAmount, setupAmount);

      // Ensure users have enough tokens for operations
      await tokenA.mint(await user2.getAddress(), INITIAL_MINT);
      await tokenB.mint(await user2.getAddress(), INITIAL_MINT);
      await tokenA.mint(await user3.getAddress(), INITIAL_MINT);
      await tokenB.mint(await user3.getAddress(), INITIAL_MINT);

      // Approve tokens for operations
      const addAmount = parseEther("1000");
      const swapAmount = parseEther("100");
      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addAmount);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addAmount);
      await tokenA
        .connect(user3)
        .approve(await liquidityPool.getAddress(), swapAmount);

      // Execute operations sequentially
      const deadline = (await time.latest()) + 3600;

      // User2 adds liquidity
      await liquidityPool.connect(user2).addLiquidity(addAmount, addAmount);

      // User3 performs swap
      const expectedOutput = await liquidityPool.getAmountOut(
        await tokenA.getAddress(),
        swapAmount
      );
      await liquidityPool
        .connect(user3)
        .swap(
          await tokenA.getAddress(),
          swapAmount,
          (expectedOutput * BigInt(95)) / BigInt(100),
          deadline
        );

      // User1 removes liquidity
      const user1Shares = await liquidityPool.shares(await user1.getAddress());
      const removeAmount = user1Shares / BigInt(4);
      await liquidityPool.connect(user1).removeLiquidity(removeAmount);

      // Verify final state
      const [finalReserveA, finalReserveB] = await liquidityPool.getReserves();
      expect(finalReserveA).to.be.gt(0);
      expect(finalReserveB).to.be.gt(0);
      expect(await liquidityPool.totalShares()).to.be.gt(0);
    });

    it("Should handle extreme price impact scenarios", async function () {
      // Setup initial liquidity
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await liquidityPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY, INITIAL_LIQUIDITY);

      // Attempt a very large swap
      const largeSwapAmount = (INITIAL_LIQUIDITY * BigInt(9)) / BigInt(10); // 90% of pool
      const deadline = (await time.latest()) + 3600;
      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), largeSwapAmount);

      const expectedOutput = await liquidityPool.getAmountOut(
        await tokenA.getAddress(),
        largeSwapAmount
      );
      expect(expectedOutput).to.be.lt(largeSwapAmount); // High price impact

      await liquidityPool
        .connect(user2)
        .swap(
          await tokenA.getAddress(),
          largeSwapAmount,
          (expectedOutput * BigInt(95)) / BigInt(100),
          deadline
        );

      const [reserveA, reserveB] = await liquidityPool.getReserves();
      expect(reserveA).to.be.gt(INITIAL_LIQUIDITY);
      expect(reserveB).to.be.lt(INITIAL_LIQUIDITY);
    });

    it("Should handle edge cases in liquidity provision", async function () {
      // Setup initial liquidity with uneven amounts
      const liquidityA = parseEther("1000");
      const liquidityB = parseEther("3000");

      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), liquidityA);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), liquidityB);
      await liquidityPool.connect(user1).addLiquidity(liquidityA, liquidityB);

      // Try to add liquidity with different ratios
      const addA = parseEther("500");
      const addB = parseEther("2000");

      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addA);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addB);
      await liquidityPool.connect(user2).addLiquidity(addA, addB);

      const [reserveA, reserveB] = await liquidityPool.getReserves();
      const expectedReserveA = liquidityA + addA;
      const expectedReserveB = liquidityB + addB;

      // Check that actual reserves are less than or equal to expected
      expect(reserveA).to.be.lte(expectedReserveA);
      expect(reserveB).to.be.lte(expectedReserveB);

      // Check that constant product formula is maintained within acceptable range
      const initialK = liquidityA * liquidityB;
      const finalK = reserveA * reserveB;

      // Compare the ratio of final K to initial K
      // Should be greater than 0.99 (allowing for 1% loss due to fees/rounding)
      const kRatio = (finalK * BigInt(1e18)) / initialK;
      expect(kRatio).to.be.gte(BigInt(99e16)); // 0.99 * 1e18
    });

    it("Should maintain constant product invariant", async function () {
      // Setup initial liquidity
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), INITIAL_LIQUIDITY);
      await liquidityPool
        .connect(user1)
        .addLiquidity(INITIAL_LIQUIDITY, INITIAL_LIQUIDITY);

      const [initialReserveA, initialReserveB] =
        await liquidityPool.getReserves();
      const initialProduct = initialReserveA * initialReserveB;

      // Perform a series of operations
      const swapAmount = parseEther("100");
      const deadline = (await time.latest()) + 3600;

      // Multiple swaps
      for (let i = 0; i < 3; i++) {
        await tokenA
          .connect(user2)
          .approve(await liquidityPool.getAddress(), swapAmount);
        const expectedOutput = await liquidityPool.getAmountOut(
          await tokenA.getAddress(),
          swapAmount
        );
        await liquidityPool
          .connect(user2)
          .swap(
            await tokenA.getAddress(),
            swapAmount,
            (expectedOutput * BigInt(95)) / BigInt(100),
            deadline
          );
      }

      const [finalReserveA, finalReserveB] = await liquidityPool.getReserves();
      const finalProduct = finalReserveA * finalReserveB;

      // Allow for small rounding differences
      expect(finalProduct).to.be.closeTo(
        initialProduct,
        initialProduct / BigInt(100)
      ); // 1% tolerance
    });
  });
});
