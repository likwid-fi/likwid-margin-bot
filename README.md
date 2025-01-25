# Likwid Margin Bot

## Overview

The Likwid Margin Bot is a service designed to monitor and execute liquidation transactions. It interacts with smart contracts to manage margin positions and handle liquidation processes efficiently.

## Features

- Monitors margin positions for liquidation.
- Executes liquidation transactions based on predefined conditions.
- Listens for events from smart contracts to keep track of changes in margin positions.
- Estimates gas costs for liquidation transactions.
- Configurable network and contract addresses.

## Installation

1. Clone the repository:

2. Install dependencies:

   ```bash
   cd likwid-margin-bot
   npm install
   ```

3. Create a `.env` file in the root directory and add your private key:

   ```plaintext
   PRIVATE_KEY=your_private_key_here
   ```

4. Build

   ```bash
   npm run build
   ```

## Configuration

The configuration is located in `src/config/config.ts`. You can modify the following settings:

- **Networks**: Configure the RPC URL and contract addresses for different networks.
- **Currencies**: Define the currencies and their minimum Ether prices.

### Example Configuration

```typescript
networks: {
  11155111: {
    rpcUrl: "https://ethereum-sepolia.publicnode.com",
    contracts: {
      startBlock: 7461647,
      marginChecker: "0xE50794a80Befe17c584026f6f40bbeC3Dc764D83",
      marginHookManager: "0x59036D328EFF4dAb2E33E04a60A5D810Df90C888",
      marginPositionManager: "0x913B98B271889D3fB4D375C181FC2E58f17EC6C5",
    },
    currencies: {
      "0x0000000000000000000000000000000000000000": {
        name: "ETH",
        minEtherPrice: ethers.parseEther("1"),
      },
      // Add more currencies as needed
    },
  },
}
```

## Usage

To start the workers, run the following command:

```bash
npm start
```

The worker will begin monitoring for liquidation opportunities and executing transactions as necessary.

## License

This project is licensed under the MIT License.
