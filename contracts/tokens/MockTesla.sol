// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockTesla is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor() ERC20("Mock Tesla Stock", "mTSLA") {
        _decimals = 18;
        _mint(msg.sender, 1000000 * 10**_decimals); // Initial supply for testing
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    // Mint function for testing scenarios
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Burn function for deflationary testing
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 