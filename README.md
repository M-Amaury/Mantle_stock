# StockVault Protocol

DeFi lending protocol with synthetic stock assets and automated put options hedging on Mantle Network.

## Features

- Lending/borrowing synthetic stock assets (TESLA/USDC)
- Automated put options for downside protection
- Chainlink price feeds integration
- AMM pool for liquidity

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Mantle testnet
npm run deploy:testnet
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your private key and RPC endpoints
3. Fund your account with Mantle testnet ETH

## Architecture

- `contracts/tokens/` - Mock ERC20 tokens (TESLA, USDC)
- `contracts/interfaces/` - Core interfaces
- `scripts/` - Deployment scripts
- `test/` - Contract tests

Built for ETHGlobal Cannes 🚀 