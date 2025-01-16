const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, ZeroAddress } = require("ethers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("LiquidityPool", function () {
  let TokenA;
  let TokenB;
  let LiquidityPool;
  let tokenA;
  let tokenB;
  let liquidityPool;
  let owner;
  let user1;
  let user2;
  let user3;

  const INITIAL_SUPPLY = parseEther("1000000");
  const ZERO_ADDRESS = ZeroAddress;
  const MINIMUM_LIQUIDITY = 1000;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy test tokens
    TokenA = await ethers.getContractFactory("TokenA");
    TokenB = await ethers.getContractFactory("TokenB");
    tokenA = await TokenA.deploy();
    tokenB = await TokenB.deploy();

    // Deploy liquidity pool
    LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    liquidityPool = await LiquidityPool.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress()
    );

    // Transfer initial tokens to users using getAddress()
    await tokenA.transfer(await user1.getAddress(), parseEther("10000"));
    await tokenB.transfer(await user1.getAddress(), parseEther("10000"));
    await tokenA.transfer(await user2.getAddress(), parseEther("10000"));
    await tokenB.transfer(await user2.getAddress(), parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct token addresses", async function () {
      expect(await liquidityPool.getTokenA()).to.equal(
        await tokenA.getAddress()
      );
      expect(await liquidityPool.getTokenB()).to.equal(
        await tokenB.getAddress()
      );
    });

    it("Should fail with zero addresses", async function () {
      await expect(
        LiquidityPool.deploy(ZeroAddress, await tokenB.getAddress())
      ).to.be.revertedWithCustomError(liquidityPool, "InvalidTokenError");

      await expect(
        LiquidityPool.deploy(await tokenA.getAddress(), ZeroAddress)
      ).to.be.revertedWithCustomError(liquidityPool, "InvalidTokenError");
    });

    it("Should fail with same token addresses", async function () {
      await expect(
        LiquidityPool.deploy(
          await tokenA.getAddress(),
          await tokenA.getAddress()
        )
      ).to.be.revertedWithCustomError(liquidityPool, "InvalidTokenError");
    });
  });

  describe("Initial Liquidity", function () {
    const amountA = parseEther("1000");
    const amountB = parseEther("1000");

    beforeEach(async function () {
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), amountA);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), amountB);
    });

    it("Should provide initial liquidity correctly", async function () {
      await expect(liquidityPool.connect(user1).addLiquidity(amountA, amountB))
        .to.emit(liquidityPool, "LiquidityAdded")
        .withArgs(await user1.getAddress(), amountA, amountB, anyValue);

      const [reserveA, reserveB] = await liquidityPool.getReserves();
      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);
    });

    it("Should lock minimum liquidity", async function () {
      await liquidityPool.connect(user1).addLiquidity(amountA, amountB);
      const totalShares = await liquidityPool.totalShares();
      expect(totalShares).to.be.gt(MINIMUM_LIQUIDITY);
    });

    it("Should fail with zero amounts", async function () {
      await expect(
        liquidityPool.connect(user1).addLiquidity(0, amountB)
      ).to.be.revertedWithCustomError(liquidityPool, "ZeroAmountError");

      await expect(
        liquidityPool.connect(user1).addLiquidity(amountA, 0)
      ).to.be.revertedWithCustomError(liquidityPool, "ZeroAmountError");
    });
  });

  describe("Adding Liquidity", function () {
    const initialA = parseEther("1000");
    const initialB = parseEther("1000");
    const addA = parseEther("500");
    const addB = parseEther("500");

    beforeEach(async function () {
      // Add initial liquidity
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialA);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialB);
      await liquidityPool.connect(user1).addLiquidity(initialA, initialB);

      // Approve additional liquidity
      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addA);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), addB);
    });

    it("Should add liquidity proportionally", async function () {
      const sharesBefore = await liquidityPool.totalShares();

      await liquidityPool.connect(user2).addLiquidity(addA, addB);

      const sharesAfter = await liquidityPool.totalShares();
      expect(sharesAfter).to.be.gt(sharesBefore);
    });

    it("Should handle uneven liquidity provision", async function () {
      const smallAddA = parseEther("100");
      const largeAddB = parseEther("1000");

      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), smallAddA);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), largeAddB);

      await liquidityPool.connect(user2).addLiquidity(smallAddA, largeAddB);

      const [reserveA, reserveB] = await liquidityPool.getReserves();
      const expectedReserveA = initialA + smallAddA;
      const expectedReserveB = initialB + largeAddB;

      // Check that actual reserves are less than or equal to expected
      expect(reserveA).to.be.lte(expectedReserveA);
      expect(reserveB).to.be.lte(expectedReserveB);

      // Check that constant product formula is maintained within acceptable range
      const initialK = initialA * initialB;
      const finalK = reserveA * reserveB;

      // Compare the ratio of final K to initial K
      // Should be greater than 0.99 (allowing for 1% loss due to fees/rounding)
      const kRatio = (finalK * BigInt(1e18)) / initialK;
      expect(kRatio).to.be.gte(BigInt(99e16)); // 0.99 * 1e18
    });
  });

  describe("Removing Liquidity", function () {
    const initialA = parseEther("1000");
    const initialB = parseEther("1000");

    beforeEach(async function () {
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialA);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialB);
      await liquidityPool.connect(user1).addLiquidity(initialA, initialB);
    });

    it("Should remove liquidity correctly", async function () {
      const shares = await liquidityPool.shares(user1.address);
      const [initialReserveA, initialReserveB] =
        await liquidityPool.getReserves();

      await liquidityPool.connect(user1).removeLiquidity(shares);

      const [finalReserveA, finalReserveB] = await liquidityPool.getReserves();
      expect(finalReserveA).to.be.lt(initialReserveA);
      expect(finalReserveB).to.be.lt(initialReserveB);
    });

    it("Should fail when removing too much liquidity", async function () {
      const shares = await liquidityPool.shares(await user1.getAddress());
      await expect(
        liquidityPool.connect(user1).removeLiquidity(shares + BigInt(1))
      ).to.be.revertedWithCustomError(liquidityPool, "InsufficientSharesError");
    });

    it("Should fail when removing zero liquidity", async function () {
      await expect(
        liquidityPool.connect(user1).removeLiquidity(0)
      ).to.be.revertedWithCustomError(liquidityPool, "ZeroAmountError");
    });
  });

  describe("Swapping", function () {
    const initialA = parseEther("10000");
    const initialB = parseEther("10000");
    const swapAmount = parseEther("100");

    beforeEach(async function () {
      // Add initial liquidity
      await tokenA
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialA);
      await tokenB
        .connect(user1)
        .approve(await liquidityPool.getAddress(), initialB);
      await liquidityPool.connect(user1).addLiquidity(initialA, initialB);

      // Approve tokens for swapping
      await tokenA
        .connect(user2)
        .approve(await liquidityPool.getAddress(), swapAmount);
      await tokenB
        .connect(user2)
        .approve(await liquidityPool.getAddress(), swapAmount);
    });

    it("Should swap TokenA for TokenB", async function () {
      const deadline = (await time.latest()) + 3600;
      const expectedOutput = await liquidityPool.getAmountOut(
        await tokenA.getAddress(),
        swapAmount
      );

      await expect(
        liquidityPool.connect(user2).swap(
          await tokenA.getAddress(),
          swapAmount,
          (expectedOutput * BigInt(95)) / BigInt(100), // 5% slippage
          deadline
        )
      ).to.emit(liquidityPool, "Swapped");
    });

    it("Should fail with expired deadline", async function () {
      const deadline = (await time.latest()) - 1;

      await expect(
        liquidityPool
          .connect(user2)
          .swap(await tokenA.getAddress(), swapAmount, 0, deadline)
      ).to.be.revertedWithCustomError(liquidityPool, "InvalidDeadlineError");
    });

    it("Should fail with insufficient output amount", async function () {
      const deadline = (await time.latest()) + 3600;
      const expectedOutput = await liquidityPool.getAmountOut(
        await tokenA.getAddress(),
        swapAmount
      );

      await expect(
        liquidityPool.connect(user2).swap(
          await tokenA.getAddress(),
          swapAmount,
          expectedOutput + BigInt(1), // Require more than possible
          deadline
        )
      ).to.be.revertedWithCustomError(liquidityPool, "SlippageExceededError");
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and unpause correctly", async function () {
      await liquidityPool.connect(owner).pause();
      expect(await liquidityPool.isPaused()).to.be.true;

      await liquidityPool.connect(owner).unpause();
      expect(await liquidityPool.isPaused()).to.be.false;
    });

    it("Should prevent operations when paused", async function () {
      await liquidityPool.connect(owner).pause();
      await expect(
        liquidityPool
          .connect(user1)
          .addLiquidity(parseEther("1"), parseEther("1"))
      ).to.be.revertedWithCustomError(liquidityPool, "PoolPausedError");
    });

    it("Should only allow owner to pause/unpause", async function () {
      await expect(
        liquidityPool.connect(user1).pause()
      ).to.be.revertedWithCustomError(
        liquidityPool,
        "OwnableUnauthorizedAccount"
      );

      await expect(
        liquidityPool.connect(user1).unpause()
      ).to.be.revertedWithCustomError(
        liquidityPool,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
