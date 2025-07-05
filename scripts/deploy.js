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

    // Save deployed addresses
    const addresses = {
        mockTesla: await mockTesla.getAddress(),
        mockUSDC: await mockUSDC.getAddress(),
        deployer: deployer.address
    };

    console.log("\nDeployment completed!");
    console.log("Save these addresses to your .env file:");
    console.log(`TESLA_TOKEN=${addresses.mockTesla}`);
    console.log(`USDC_TOKEN=${addresses.mockUSDC}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 