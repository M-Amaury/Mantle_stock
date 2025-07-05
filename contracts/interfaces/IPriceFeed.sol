// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
        
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
}

interface IPriceOracle {
    function getPrice(address asset) external view returns (uint256);
    function setPrice(address asset, uint256 price) external; // For testing
} 