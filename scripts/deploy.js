const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying contracts with the account:",
    await deployer.getAddress()
  );

  // Deploy TokenA
  console.log("\nDeploying TokenA...");
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("TokenA deployed to:", tokenAAddress);

  // Deploy TokenB
  console.log("\nDeploying TokenB...");
  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("TokenB deployed to:", tokenBAddress);

  // Deploy LiquidityPool
  console.log("\nDeploying LiquidityPool...");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy(
    tokenAAddress,
    tokenBAddress
  );
  await liquidityPool.waitForDeployment();
  const liquidityPoolAddress = await liquidityPool.getAddress();
  console.log("LiquidityPool deployed to:", liquidityPoolAddress);

  // Mint initial supply to deployer
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
  console.log("\nMinting initial token supply...");

  await tokenA.mint(await deployer.getAddress(), INITIAL_SUPPLY);
  console.log("Minted TokenA to deployer");

  await tokenB.mint(await deployer.getAddress(), INITIAL_SUPPLY);
  console.log("Minted TokenB to deployer");

  // Verify contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  try {
    await run("verify:verify", {
      address: tokenAAddress,
      constructorArguments: [],
    });
    console.log("TokenA verified");

    await run("verify:verify", {
      address: tokenBAddress,
      constructorArguments: [],
    });
    console.log("TokenB verified");

    await run("verify:verify", {
      address: liquidityPoolAddress,
      constructorArguments: [tokenAAddress, tokenBAddress],
    });
    console.log("LiquidityPool verified");
  } catch (error) {
    console.log("Error verifying contracts:", error);
  }

  // Print deployment summary
  console.log("\nDeployment Summary");
  console.log("=================");
  console.log("TokenA:", tokenAAddress);
  console.log("TokenB:", tokenBAddress);
  console.log("LiquidityPool:", liquidityPoolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
