const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, ZeroAddress } = require("ethers");

describe("Token", function () {
  let TokenA;
  let TokenB;
  let tokenA;
  let tokenB;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy tokens
    TokenA = await ethers.getContractFactory("TokenA");
    TokenB = await ethers.getContractFactory("TokenB");

    tokenA = await TokenA.deploy();
    tokenB = await TokenB.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await tokenA.owner()).to.equal(await owner.getAddress());
      expect(await tokenB.owner()).to.equal(await owner.getAddress());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalanceA = await tokenA.balanceOf(await owner.getAddress());
      const ownerBalanceB = await tokenB.balanceOf(await owner.getAddress());
      expect(await tokenA.totalSupply()).to.equal(ownerBalanceA);
      expect(await tokenB.totalSupply()).to.equal(ownerBalanceB);
    });

    it("Should have correct name and symbol", async function () {
      expect(await tokenA.name()).to.equal("TokenA");
      expect(await tokenA.symbol()).to.equal("TKA");
      expect(await tokenB.name()).to.equal("TokenB");
      expect(await tokenB.symbol()).to.equal("TKB");
    });

    it("Should have 18 decimals", async function () {
      expect(await tokenA.decimals()).to.equal(18);
      expect(await tokenB.decimals()).to.equal(18);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = parseEther("50");
      await tokenA.transfer(await addr1.getAddress(), amount);
      expect(await tokenA.balanceOf(await addr1.getAddress())).to.equal(amount);

      await tokenA.connect(addr1).transfer(await addr2.getAddress(), amount);
      expect(await tokenA.balanceOf(await addr2.getAddress())).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      await expect(
        tokenA.connect(addr1).transfer(await owner.getAddress(), 1)
      ).to.be.revertedWithCustomError(tokenA, "ERC20InsufficientBalance");
    });

    it("Should update balances after transfers", async function () {
      const amount = parseEther("100");
      const initialOwnerBalance = await tokenA.balanceOf(
        await owner.getAddress()
      );

      await tokenA.transfer(await addr1.getAddress(), amount);
      await tokenA.transfer(await addr2.getAddress(), amount);

      // Use BigInt for calculations
      expect(await tokenA.balanceOf(await owner.getAddress())).to.equal(
        initialOwnerBalance - BigInt(2) * amount
      );
      expect(await tokenA.balanceOf(await addr1.getAddress())).to.equal(amount);
      expect(await tokenA.balanceOf(await addr2.getAddress())).to.equal(amount);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegation", async function () {
      const amount = parseEther("100");
      await tokenA.approve(await addr1.getAddress(), amount);
      expect(
        await tokenA.allowance(
          await owner.getAddress(),
          await addr1.getAddress()
        )
      ).to.equal(amount);
    });

    it("Should update allowance on delegation", async function () {
      const amount = parseEther("100");
      await tokenA.approve(await addr1.getAddress(), amount);
      await tokenA
        .connect(addr1)
        .transferFrom(
          await owner.getAddress(),
          await addr2.getAddress(),
          amount / BigInt(2)
        );
      expect(
        await tokenA.allowance(
          await owner.getAddress(),
          await addr1.getAddress()
        )
      ).to.equal(amount / BigInt(2));
    });

    it("Should not allow transfer beyond allowance", async function () {
      const amount = parseEther("100");
      await tokenA.approve(await addr1.getAddress(), amount);
      await expect(
        tokenA
          .connect(addr1)
          .transferFrom(
            await owner.getAddress(),
            await addr2.getAddress(),
            amount + BigInt(1)
          )
      ).to.be.revertedWithCustomError(tokenA, "ERC20InsufficientAllowance");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const amount = parseEther("1000");
      const initialSupply = await tokenA.totalSupply();

      await tokenA.mint(await addr1.getAddress(), amount);

      expect(await tokenA.balanceOf(await addr1.getAddress())).to.equal(amount);
      expect(await tokenA.totalSupply()).to.equal(initialSupply + amount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const amount = parseEther("1000");
      await expect(
        tokenA.connect(addr1).mint(await addr2.getAddress(), amount)
      ).to.be.revertedWithCustomError(tokenA, "OwnableUnauthorizedAccount");
    });

    it("Should emit Transfer event on mint", async function () {
      const amount = parseEther("1000");
      await expect(tokenA.mint(await addr1.getAddress(), amount))
        .to.emit(tokenA, "Transfer")
        .withArgs(ZeroAddress, await addr1.getAddress(), amount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero transfers", async function () {
      await expect(tokenA.transfer(await addr1.getAddress(), 0)).to.not.be
        .reverted;
    });

    it("Should handle zero approvals", async function () {
      await expect(tokenA.approve(await addr1.getAddress(), 0)).to.not.be
        .reverted;
    });

    it("Should not allow transfer to zero address", async function () {
      const amount = parseEther("100");
      await expect(
        tokenA.transfer(ZeroAddress, amount)
      ).to.be.revertedWithCustomError(tokenA, "ERC20InvalidReceiver");
    });

    it("Should not allow approve to zero address", async function () {
      const amount = parseEther("100");
      await expect(
        tokenA.approve(ZeroAddress, amount)
      ).to.be.revertedWithCustomError(tokenA, "ERC20InvalidSpender");
    });

    it("Should not allow minting to zero address", async function () {
      const amount = parseEther("100");
      await expect(
        tokenA.mint(ZeroAddress, amount)
      ).to.be.revertedWithCustomError(tokenA, "ERC20InvalidReceiver");
    });
  });
});
