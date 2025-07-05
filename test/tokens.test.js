const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mock Tokens", function () {
    let mockTesla, mockUSDC;
    let owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        const MockTesla = await ethers.getContractFactory("MockTesla");
        mockTesla = await MockTesla.deploy();

        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();
    });

    describe("Tesla Token", function () {
        it("Should have correct name and symbol", async function () {
            expect(await mockTesla.name()).to.equal("Mock Tesla Stock");
            expect(await mockTesla.symbol()).to.equal("mTSLA");
            expect(await mockTesla.decimals()).to.equal(18);
        });

        it("Should mint initial supply to owner", async function () {
            const balance = await mockTesla.balanceOf(owner.address);
            expect(balance).to.equal(ethers.parseEther("1000000"));
        });

        it("Should allow owner to mint", async function () {
            await mockTesla.mint(addr1.address, ethers.parseEther("100"));
            expect(await mockTesla.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
        });
    });

    describe("USDC Token", function () {
        it("Should have correct decimals", async function () {
            expect(await mockUSDC.decimals()).to.equal(6);
            expect(await mockUSDC.symbol()).to.equal("mUSDC");
        });

        it("Should mint initial supply", async function () {
            const balance = await mockUSDC.balanceOf(owner.address);
            expect(balance).to.equal(ethers.parseUnits("10000000", 6));
        });
    });
}); 