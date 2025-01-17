# DeFi Liquidity Pool

A decentralized liquidity pool application enabling users to swap tokens and manage liquidity. Built with Solidity smart contracts and a Next.js frontend, leveraging the Hardhat development environment.

## Table of Contents

- [Architecture](#architecture)
  - [Smart Contract Architecture](#smart-contract-architecture)
  - [Frontend Architecture](#frontend-architecture)
- [Setup](#setup)
- [Features](#features)
- [Technical Details](#technical-details)
- [Testing](#testing)

## Architecture

### Smart Contract Architecture

The smart contract architecture consists of three main components:

```mermaid
classDiagram
    class ICustomToken {
        <<interface>>
        +mint(address to, uint256 amount)
        +decimals() : uint8
        +name() : string
        +symbol() : string
    }
    class IERC20 {
        <<interface>>
        +totalSupply() : uint256
        +balanceOf(address) : uint256
        +transfer(address, uint256) : bool
        +approve(address, uint256) : bool
        +transferFrom(address, address, uint256) : bool
    }
    class ILiquidityPool {
        <<interface>>
        +addLiquidity(uint256, uint256) : uint256
        +removeLiquidity(uint256) : (uint256, uint256)
        +swap(address, uint256, uint256, uint256) : uint256
        +getReserves() : (uint256, uint256)
        +getAmountOut(address, uint256) : uint256
    }
    class TokenA {
        +constructor()
        +mint(address, uint256)
    }
    class TokenB {
        +constructor()
        +mint(address, uint256)
    }
    class LiquidityPool {
        -_reserveA: uint256
        -_reserveB: uint256
        -_totalShares: uint256
        +constructor(address _tokenA, address _tokenB)
        +addLiquidity(uint256, uint256) : uint256
        +removeLiquidity(uint256) : (uint256, uint256)
        +swap(address, uint256, uint256, uint256) : uint256
    }

    ICustomToken <|-- TokenA
    ICustomToken <|-- TokenB
    IERC20 <|-- ICustomToken
    ILiquidityPool <|-- LiquidityPool
```

#### Token Contracts (TokenA.sol & TokenB.sol)

- ERC20 standard tokens using OpenZeppelin implementation.
- Features:
  - Minting functionality.
  - Standard token operations (transfer, approve).
  - Owner-controlled minting.

#### Liquidity Pool Contract (LiquidityPool.sol)

- Core AMM (Automated Market Maker) functionality.
- Features:
  - Liquidity provision and removal.
  - Token swapping with constant product formula.
  - Fee calculation and collection.
  - Emergency pause mechanism.
- Security Measures:
  - Reentrancy guard.
  - Overflow protection.
  - Slippage control and transaction deadlines.

### Frontend Architecture

```mermaid
flowchart TB
A[App Entry _app.tsx] --> B[Web3Provider]
B --> C[NotificationProvider]
C --> D[Layout Component]
D --> E[Pages]
E --> F[Pool Page]
E --> G[Swap Page]
F --> H[Common Components]
G --> H
H --> I[Button]
H --> J[Loading]
H --> K[Notification]

subgraph "Web3 Integration"
    L[useTokenBalance Hook]
    M[useTokenApproval Hook]
    N[useTransaction Hook]
end

F --> L
F --> M
F --> N
G --> L
G --> M
G --> N
```

#### Core Components

- **Layout.tsx**: Main application layout.
- **Header.tsx**: Navigation and wallet connection.
- **Button.tsx**: Reusable button component.
- **Loading.tsx**: Manages loading states.
- **NotificationContainer.tsx**: Handles transaction notifications.

#### Feature Components

- **SwapComponent.tsx**: Interface for token swapping.
- **PoolComponent.tsx**: Interface for managing liquidity.

#### Custom Hooks

- **useTokenBalance**: Updates token balances.
- **useTokenApproval**: Manages token approval workflow.
- **useTransaction**: Tracks transaction states.

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/dinesh3456/Defi-liquidity-pool.git
   cd defi-liquidity-pool
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:

   ```env
    NEXT_PUBLIC_WALLET_CONNECT_ID=your_wallet_connect_project_id
    NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/JwkRF_vQJWBYFj5wXkkhUnYi1A5TwFhs
    NEXT_PUBLIC_TOKENA_CONTRACT_ADDRESS=0xC280d96b5eacb5aCC13c4EC0f4f57690aED719a3
    NEXT_PUBLIC_TOKENB_CONTRACT_ADDRESS=0xc3457ef738160fd5Ee4A33DA9d1580cf2fD5e486
    NEXT_PUBLIC_LIQUIDITY_POOL_CONTRACT_ADDRESS=0xef26010E7609172B6C27aD2F14E3c6852dD5fae1 
   ```

4. Deploy contracts:

   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Features

### Token Swapping

- Automatic price calculation using AMM formula.
- Slippage protection and real-time price updates.

### Liquidity Management

- Add/remove liquidity with paired tokens.
- Real-time pool share updates.

### User Interface

- Wallet integration with RainbowKit.
- Mobile-responsive design with transaction notifications.

## Technical Details

### Project Structure

```
├── contracts/
│   ├── interfaces/
│   ├── Token.sol
│   └── LiquidityPool.sol
├── src/
│   ├── components/
│   ├── hooks/
│   ├── contexts/
│   ├── config/
│   └── pages/
└── test/
    ├── Token.test.js
    └── LiquidityPool.test.js
```

### Smart Contract Security

- Reentrancy protection.
- Access control mechanisms.
- Input validation and emergency pause functionality.

### Frontend Implementation

- React and TypeScript.
- TailwindCSS for styling.
- Wagmi for Web3 interactions.

## Testing

Run the test suite:

```bash
npx hardhat test
```
