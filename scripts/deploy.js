const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying StockVault Protocol on Mantle...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy mock tokens
    const MockTesla = await ethers.getContractFactory("MockTesla");
    const mockTesla = await MockTesla.deploy();
    await mockTesla.waitForDeployment();
    console.log("Mock Tesla deployed to:", await mockTesla.getAddress());

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

    // Deploy price oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
    console.log("Price Oracle deployed to:", await priceOracle.getAddress());

    // Deploy mock price feed for TESLA ($200 initial price)
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const teslaPriceFeed = await MockPriceFeed.deploy(
        20000000000, // $200.00 in 8 decimals
        8,
        "TSLA / USD"
    );
    await teslaPriceFeed.waitForDeployment();
    console.log("TESLA Price Feed deployed to:", await teslaPriceFeed.getAddress());

    // Setup price feed in oracle
    await priceOracle.setPriceFeed(await mockTesla.getAddress(), await teslaPriceFeed.getAddress());
    console.log("Price feed configured for TESLA");

    // Save deployed addresses
    const addresses = {
        mockTesla: await mockTesla.getAddress(),
        mockUSDC: await mockUSDC.getAddress(),
        priceOracle: await priceOracle.getAddress(),
        teslaPriceFeed: await teslaPriceFeed.getAddress(),
        deployer: deployer.address
    };

    console.log("\nDeployment completed!");
    console.log("Save these addresses to your .env file:");
    console.log(`TESLA_TOKEN=${addresses.mockTesla}`);
    console.log(`USDC_TOKEN=${addresses.mockUSDC}`);
    console.log(`PRICE_ORACLE=${addresses.priceOracle}`);
    console.log(`TESLA_PRICE_FEED=${addresses.teslaPriceFeed}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 