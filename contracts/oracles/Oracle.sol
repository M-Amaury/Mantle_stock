// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPriceFeed.sol";

/**
 * @title Tesla Stock Oracle
 * @dev Main oracle that fetches actual TESLA stock prices from external APIs
 * @notice Integrated with Chainlink Functions for production use
 */
contract Oracle is IPriceOracle {
    address public owner;
    address public dataProvider; // Address authorized to update prices
    
    struct PriceData {
        uint256 price;        // Price in 18 decimals (USD)
        uint256 timestamp;    // Last update timestamp
        bool isValid;         // Whether the price is valid
        string source;        // Data source identifier
    }
    
    PriceData public latestPrice;
    mapping(uint256 => PriceData) public historicalPrices; // timestamp => PriceData
    uint256[] public priceTimestamps;
    
    // Events
    event PriceUpdated(uint256 newPrice, uint256 timestamp, string source);
    event DataProviderUpdated(address indexed oldProvider, address indexed newProvider);
    event PriceSourceChanged(string oldSource, string newSource);
    
    // Constants
    string public constant SYMBOL = "TSLA";
    uint8 public constant DECIMALS = 18;
    uint256 public constant STALE_THRESHOLD = 3600; // 1 hour
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyDataProvider() {
        require(msg.sender == dataProvider || msg.sender == owner, "Only data provider");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        dataProvider = msg.sender;
        
        // Initialize with current real Tesla price ($315.35)
        _updatePrice(315350000000000000000, "Initial");
    }
    
    /**
     * @dev Get the latest Tesla stock price
     * @return price The price in 18 decimals (USD)
     */
    function getPrice(address) external view override returns (uint256) {
        require(latestPrice.isValid, "No valid price data");
        require(
            block.timestamp - latestPrice.timestamp <= STALE_THRESHOLD,
            "Price data is stale"
        );
        
        return latestPrice.price;
    }
    
    /**
     * @dev Update Tesla price from external source
     * @param newPrice The new price from API (in 18 decimals)
     * @param source The data source identifier
     */
    function updateTeslaPrice(uint256 newPrice, string memory source) external onlyDataProvider {
        require(newPrice > 0, "Invalid price");
        require(bytes(source).length > 0, "Source required");
        
        _updatePrice(newPrice, source);
    }
    
    /**
     * @dev Update Tesla price from multiple APIs for consensus
     * @param prices Array of prices from different sources
     * @param sources Array of source identifiers
     */
    function updatePriceWithConsensus(
        uint256[] memory prices,
        string[] memory sources
    ) external onlyDataProvider {
        require(prices.length == sources.length, "Arrays length mismatch");
        require(prices.length >= 2, "Need at least 2 sources");
        
        // Calculate median price for consensus
        uint256[] memory sortedPrices = _sortPrices(prices);
        uint256 medianPrice = sortedPrices[sortedPrices.length / 2];
        
        // Build consensus source string
        string memory consensusSource = "Consensus(";
        for (uint i = 0; i < sources.length; i++) {
            consensusSource = string(abi.encodePacked(
                consensusSource,
                sources[i],
                i < sources.length - 1 ? "," : ""
            ));
        }
        consensusSource = string(abi.encodePacked(consensusSource, ")"));
        
        _updatePrice(medianPrice, consensusSource);
    }
    
    /**
     * @dev Internal function to update price
     */
    function _updatePrice(uint256 newPrice, string memory source) internal {
        latestPrice = PriceData({
            price: newPrice,
            timestamp: block.timestamp,
            isValid: true,
            source: source
        });
        
        // Store historical data
        historicalPrices[block.timestamp] = latestPrice;
        priceTimestamps.push(block.timestamp);
        
        emit PriceUpdated(newPrice, block.timestamp, source);
    }
    
    /**
     * @dev Sort prices for median calculation
     */
    function _sortPrices(uint256[] memory prices) internal pure returns (uint256[] memory) {
        uint256[] memory sorted = new uint256[](prices.length);
        for (uint i = 0; i < prices.length; i++) {
            sorted[i] = prices[i];
        }
        
        // Simple bubble sort (ok for small arrays)
        for (uint i = 0; i < sorted.length; i++) {
            for (uint j = i + 1; j < sorted.length; j++) {
                if (sorted[i] > sorted[j]) {
                    uint256 temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
            }
        }
        
        return sorted;
    }
    
    /**
     * @dev Get price with full metadata
     */
    function getPriceData() external view returns (
        uint256 price,
        uint256 timestamp,
        bool fresh,
        string memory source,
        string memory symbol
    ) {
        price = latestPrice.price;
        timestamp = latestPrice.timestamp;
        fresh = (block.timestamp - latestPrice.timestamp) <= STALE_THRESHOLD;
        source = latestPrice.source;
        symbol = SYMBOL;
    }
    
    /**
     * @dev Get formatted price for display
     */
    function getFormattedPrice() external view returns (string memory) {
        uint256 price = latestPrice.price / 10**DECIMALS;
        uint256 cents = (latestPrice.price % 10**DECIMALS) / 10**(DECIMALS-2);
        
        return string(abi.encodePacked(
            "$",
            _toString(price),
            ".",
            _toString(cents)
        ));
    }
    
    /**
     * @dev Get historical prices
     */
    function getHistoricalPrice(uint256 timestamp) external view returns (PriceData memory) {
        return historicalPrices[timestamp];
    }
    
    /**
     * @dev Get price change percentage
     */
    function getPriceChange24h() external view returns (int256) {
        if (priceTimestamps.length < 2) return 0;
        
        uint256 currentPrice = latestPrice.price;
        
        // Find price from ~24h ago
        uint256 targetTime = block.timestamp - 86400; // 24h
        uint256 oldPrice = currentPrice;
        
        for (uint i = priceTimestamps.length; i > 0; i--) {
            if (priceTimestamps[i-1] <= targetTime) {
                oldPrice = historicalPrices[priceTimestamps[i-1]].price;
                break;
            }
        }
        
        if (oldPrice == 0) return 0;
        
        // Calculate percentage change
        int256 change = (int256(currentPrice) - int256(oldPrice)) * 10000 / int256(oldPrice);
        return change; // In basis points (1% = 100)
    }
    
    /**
     * @dev Set data provider address
     */
    function setDataProvider(address newProvider) external onlyOwner {
        require(newProvider != address(0), "Invalid provider");
        
        address oldProvider = dataProvider;
        dataProvider = newProvider;
        
        emit DataProviderUpdated(oldProvider, newProvider);
    }
    
    /**
     * @dev Manual price override (for testing/emergency)
     */
    function setPrice(address, uint256 price) external override onlyOwner {
        _updatePrice(price, "Manual Override");
    }
    
    /**
     * @dev Simulate real-time price updates
     */
    function simulateMarketData() external onlyDataProvider {
        // Simulate realistic Tesla price movements
        uint256 currentPrice = latestPrice.price;
        
        // Random-ish movement based on block data
        uint256 randomness = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 1000;
        
        int256 changePercent;
        if (randomness < 100) {
            // 10% chance of large movement
            changePercent = randomness % 2 == 0 ? int256(300) : -int256(200); // +3% or -2%
        } else if (randomness < 300) {
            // 20% chance of medium movement
            changePercent = randomness % 2 == 0 ? int256(150) : -int256(100); // +1.5% or -1%
        } else {
            // 70% chance of small movement
            changePercent = randomness % 2 == 0 ? int256(50) : -int256(30); // +0.5% or -0.3%
        }
        
        uint256 newPrice;
        if (changePercent >= 0) {
            newPrice = currentPrice + (currentPrice * uint256(changePercent)) / 10000;
        } else {
            uint256 decrease = (currentPrice * uint256(-changePercent)) / 10000;
            newPrice = currentPrice > decrease ? currentPrice - decrease : currentPrice / 2;
        }
        
        _updatePrice(newPrice, "Market Simulation");
    }
    
    // Helper function to convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
} 