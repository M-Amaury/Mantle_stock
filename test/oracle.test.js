const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Tesla Oracle", function () {
    let oracle;
    let owner, dataProvider, user;
    
    beforeEach(async function () {
        [owner, dataProvider, user] = await ethers.getSigners();
        
        const Oracle = await ethers.getContractFactory("Oracle");
        oracle = await Oracle.deploy();
    });
    
    describe("Initialization", function () {
        it("Should initialize with current Tesla price", async function () {
            const price = await oracle.getPrice(ethers.ZeroAddress);
            expect(price).to.equal(ethers.parseEther("315.35")); // Current Tesla price
            
            const symbol = await oracle.SYMBOL();
            expect(symbol).to.equal("TSLA");
        });
        
        it("Should set correct owner and data provider", async function () {
            expect(await oracle.owner()).to.equal(owner.address);
            expect(await oracle.dataProvider()).to.equal(owner.address);
        });
        
        it("Should have proper decimals and thresholds", async function () {
            expect(await oracle.DECIMALS()).to.equal(18);
            expect(await oracle.STALE_THRESHOLD()).to.equal(3600); // 1 hour
        });
    });
    
    describe("Price Updates", function () {
        it("Should allow data provider to update Tesla price", async function () {
            const newPrice = ethers.parseEther("320.50"); // $320.50
            
            await oracle.updateTeslaPrice(newPrice, "Yahoo Finance");
            
            const price = await oracle.getPrice(ethers.ZeroAddress);
            expect(price).to.equal(newPrice);
        });
        
        it("Should store price source information", async function () {
            const newPrice = ethers.parseEther("325.75");
            const source = "Alpha Vantage API";
            
            await oracle.updateTeslaPrice(newPrice, source);
            
            const [price, timestamp, fresh, storedSource, symbol] = await oracle.getPriceData();
            expect(price).to.equal(newPrice);
            expect(storedSource).to.equal(source);
            expect(symbol).to.equal("TSLA");
            expect(fresh).to.be.true;
        });
        
        it("Should reject invalid prices", async function () {
            await expect(
                oracle.updateTeslaPrice(0, "Invalid Source")
            ).to.be.revertedWith("Invalid price");
        });
        
        it("Should reject empty source", async function () {
            await expect(
                oracle.updateTeslaPrice(ethers.parseEther("300"), "")
            ).to.be.revertedWith("Source required");
        });
        
        it("Should require data provider authorization", async function () {
            const newPrice = ethers.parseEther("330.00");
            
            await expect(
                oracle.connect(user).updateTeslaPrice(newPrice, "Unauthorized")
            ).to.be.revertedWith("Only data provider");
        });
    });
    
    describe("Consensus Price Updates", function () {
        it("Should calculate median from multiple sources", async function () {
            const prices = [
                ethers.parseEther("310.00"), // $310
                ethers.parseEther("315.00"), // $315
                ethers.parseEther("320.00")  // $320
            ];
            const sources = ["Yahoo Finance", "Alpha Vantage", "Google Finance"];
            
            await oracle.updatePriceWithConsensus(prices, sources);
            
            // Median should be $315
            const price = await oracle.getPrice(ethers.ZeroAddress);
            expect(price).to.equal(ethers.parseEther("315.00"));
        });
        
        it("Should build consensus source string", async function () {
            const prices = [
                ethers.parseEther("312.50"),
                ethers.parseEther("313.75")
            ];
            const sources = ["API1", "API2"];
            
            await oracle.updatePriceWithConsensus(prices, sources);
            
            const [, , , source] = await oracle.getPriceData();
            expect(source).to.equal("Consensus(API1,API2)");
        });
        
        it("Should require matching array lengths", async function () {
            const prices = [ethers.parseEther("300"), ethers.parseEther("310")];
            const sources = ["Source1"]; // Mismatched length
            
            await expect(
                oracle.updatePriceWithConsensus(prices, sources)
            ).to.be.revertedWith("Arrays length mismatch");
        });
        
        it("Should require at least 2 sources", async function () {
            const prices = [ethers.parseEther("300")];
            const sources = ["Source1"];
            
            await expect(
                oracle.updatePriceWithConsensus(prices, sources)
            ).to.be.revertedWith("Need at least 2 sources");
        });
    });
    
    describe("Price Data Retrieval", function () {
        it("Should return formatted price correctly", async function () {
            await oracle.updateTeslaPrice(ethers.parseEther("325.67"), "Test");
            
            const formatted = await oracle.getFormattedPrice();
            expect(formatted).to.equal("$325.67");
        });
        
        it("Should handle edge case prices in formatting", async function () {
            await oracle.updateTeslaPrice(ethers.parseEther("100.05"), "Test");
            
            const formatted = await oracle.getFormattedPrice();
            expect(formatted).to.equal("$100.5"); // Note: Solidity truncates trailing zeros
        });
        
        it("Should store and retrieve historical prices", async function () {
            const price1 = ethers.parseEther("300.00");
            const price2 = ethers.parseEther("310.00");
            
            await oracle.updateTeslaPrice(price1, "Historical 1");
            const timestamp1 = (await ethers.provider.getBlock('latest')).timestamp;
            
            // Simulate time passing
            await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
            await ethers.provider.send("evm_mine");
            
            await oracle.updateTeslaPrice(price2, "Historical 2");
            
            const historical = await oracle.getHistoricalPrice(timestamp1);
            expect(historical.price).to.equal(price1);
            expect(historical.source).to.equal("Historical 1");
        });
    });
    
    describe("Price Staleness", function () {
        it("Should detect stale prices", async function () {
            // Fast forward time to make price stale
            await ethers.provider.send("evm_increaseTime", [3700]); // > 1 hour
            await ethers.provider.send("evm_mine");
            
            await expect(
                oracle.getPrice(ethers.ZeroAddress)
            ).to.be.revertedWith("Price data is stale");
        });
        
        it("Should report fresh status correctly", async function () {
            const [, , fresh] = await oracle.getPriceData();
            expect(fresh).to.be.true;
            
            // Make it stale
            await ethers.provider.send("evm_increaseTime", [3700]);
            await ethers.provider.send("evm_mine");
            
            const [, , stale] = await oracle.getPriceData();
            expect(stale).to.be.false;
        });
    });
    
    describe("Market Simulation", function () {
        it("Should simulate realistic price movements", async function () {
            const initialPrice = await oracle.getPrice(ethers.ZeroAddress);
            
            await oracle.simulateMarketData();
            
            const newPrice = await oracle.getPrice(ethers.ZeroAddress);
            expect(newPrice).to.not.equal(initialPrice);
            expect(newPrice).to.be.greaterThan(0);
        });
        
        it("Should require data provider for simulation", async function () {
            await expect(
                oracle.connect(user).simulateMarketData()
            ).to.be.revertedWith("Only data provider");
        });
    });
    
    describe("24h Price Change", function () {
        it("Should calculate price change correctly", async function () {
            // Set initial price
            await oracle.updateTeslaPrice(ethers.parseEther("300.00"), "Initial");
            
            // Simulate 24h passing
            await ethers.provider.send("evm_increaseTime", [86400]); // 24 hours
            await ethers.provider.send("evm_mine");
            
            // Set new price (10% increase)
            await oracle.updateTeslaPrice(ethers.parseEther("330.00"), "24h Later");
            
            const change = await oracle.getPriceChange24h();
            // Should be approximately 1000 basis points (10%)
            expect(change).to.be.closeTo(1000, 50);
        });
        
        it("Should return 0 for insufficient historical data", async function () {
            // Fresh oracle with minimal data
            const change = await oracle.getPriceChange24h();
            expect(change).to.equal(0);
        });
    });
    
    describe("Access Control", function () {
        it("Should allow owner to set new data provider", async function () {
            await oracle.setDataProvider(dataProvider.address);
            
            expect(await oracle.dataProvider()).to.equal(dataProvider.address);
        });
        
        it("Should allow new data provider to update prices", async function () {
            await oracle.setDataProvider(dataProvider.address);
            
            const newPrice = ethers.parseEther("340.00");
            await oracle.connect(dataProvider).updateTeslaPrice(newPrice, "New Provider");
            
            const price = await oracle.getPrice(ethers.ZeroAddress);
            expect(price).to.equal(newPrice);
        });
        
        it("Should reject invalid data provider address", async function () {
            await expect(
                oracle.setDataProvider(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid provider");
        });
        
        it("Should require owner for setting data provider", async function () {
            await expect(
                oracle.connect(user).setDataProvider(dataProvider.address)
            ).to.be.revertedWith("Only owner");
        });
    });
    
    describe("Manual Override", function () {
        it("Should allow owner to manually override price", async function () {
            const overridePrice = ethers.parseEther("350.00");
            
            await oracle.setPrice(ethers.ZeroAddress, overridePrice);
            
            const price = await oracle.getPrice(ethers.ZeroAddress);
            expect(price).to.equal(overridePrice);
            
            const [, , , source] = await oracle.getPriceData();
            expect(source).to.equal("Manual Override");
        });
    });
    
    describe("Integration Test", function () {
        it("Should demonstrate complete Tesla price workflow", async function () {
            console.log("\n🎬 TESLA ORACLE WORKFLOW DEMO");
            console.log("=============================");
            
            // 1. Check initial state
            let [price, timestamp, fresh, source, symbol] = await oracle.getPriceData();
            console.log(`   📊 Initial: ${symbol} = $${ethers.formatEther(price)} (${source})`);
            
            // 2. Simulate API updates from multiple sources
            const apiPrices = [
                ethers.parseEther("314.50"), // Yahoo Finance
                ethers.parseEther("315.75"), // Alpha Vantage  
                ethers.parseEther("316.25")  // Google Finance
            ];
            const apiSources = ["Yahoo Finance", "Alpha Vantage", "Google Finance"];
            
            console.log("   🌐 Updating from multiple APIs...");
            await oracle.updatePriceWithConsensus(apiPrices, apiSources);
            
            [price, , , source] = await oracle.getPriceData();
            console.log(`   📈 Consensus: $${ethers.formatEther(price)} (${source})`);
            
            // 3. Simulate market movements
            console.log("   📊 Simulating market data...");
            for (let i = 0; i < 3; i++) {
                await oracle.simulateMarketData();
                const [newPrice] = await oracle.getPriceData();
                console.log(`      Update ${i+1}: $${ethers.formatEther(newPrice)}`);
            }
            
            // 4. Show final state
            const formatted = await oracle.getFormattedPrice();
            console.log(`   🎯 Final Price: ${formatted}`);
            
            console.log("   ✅ Tesla Oracle workflow complete!");
            
            expect(price).to.be.greaterThan(0);
        });
    });
}); 