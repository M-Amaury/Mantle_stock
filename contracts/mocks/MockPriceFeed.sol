// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPriceFeed.sol";

contract MockPriceFeed is IPriceFeed {
    int256 private _price;
    uint8 private _decimals;
    string private _description;
    uint80 private _roundId;
    
    constructor(
        int256 initialPrice,
        uint8 decimals_,
        string memory description_
    ) {
        _price = initialPrice;
        _decimals = decimals_;
        _description = description_;
        _roundId = 1;
    }
    
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _price,
            block.timestamp,
            block.timestamp,
            _roundId
        );
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    // Update price for testing scenarios
    function updatePrice(int256 newPrice) external {
        _price = newPrice;
        _roundId++;
    }
    
    // Simulate crash scenario
    function simulateCrash(int256 crashPrice) external {
        _price = crashPrice;
        _roundId++;
    }
} 