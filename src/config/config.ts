import dotenv from "dotenv";
import { ethers } from "ethers";

// Load environment variables
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

interface NetworkConfig {
  rpcUrl: string;
  contracts: {
    startBlock: number;
    marginChecker: string;
    pairPoolManager: string;
    marginPositionManager: string;
    lendingPoolManager: string;
    likwidPancakeswap: string;
    pancakeswapQuoterV2: string;
  };
  currencies: {
    [address: string]: {
      name: string;
      // minimum ETH needed to buy 10^18 wei of token
      // symbol=TEST;decimals=8;1 ETH=3333 TEST; minEtherPrice=(1 * 10^18) / ((10^8) * 3333) * (10^18)=3000300*(10^18)
      minEtherPrice: bigint;
    };
  };
}

interface Config {
  networks: {
    [chainId: number]: NetworkConfig;
  };
  wallet: {
    privateKey: string;
  };
}

// 配置对象
export const config: Config = {
  // 网络配置
  networks: {
    11155111: {
      rpcUrl: "https://ethereum-sepolia.publicnode.com",
      contracts: {
        startBlock: 7461647,
        marginChecker: "0x27354b639DCBA5dC85343019367f3b494161aA48",
        pairPoolManager: "0x59036D328EFF4dAb2E33E04a60A5D810Df90C888",
        marginPositionManager: "0xE6D26C9B26613b84c2C903a52348879A8dAF422F",
        lendingPoolManager: "0xE6D26C9B26613b84c2C903a52348879A8dAF422F",
        likwidPancakeswap: "0xa6BcB4e1C6Cf22E9Ee8afEceF8d02F336FDF4362",
        pancakeswapQuoterV2: "",
      },
      currencies: {
        "0x0000000000000000000000000000000000000000": {
          name: "ETH",
          minEtherPrice: ethers.parseEther("1"),
        },
        "0x692CA9D3078Aa6b54F2F0e33Ed20D30489854A21": {
          name: "PEPE",
          minEtherPrice: ethers.parseEther("0.001"), // 1 ETH = 1000 PEPE
        },
        "0x8b099f91c710ce9e5ee5b7f2e83db9bac3378975": {
          name: "LIKWID",
          minEtherPrice: ethers.parseEther("0.001"), // 1 ETH = 1000 LIKWID
        },
      },
    },
    97: {
      rpcUrl: "http://10.148.0.7:8545",
      contracts: {
        startBlock: 50594712,
        marginChecker: "0xD25Cf4015AB593aEa3989d9B4809f9Bf7e56A4fE",
        pairPoolManager: "0xeA4330F7852b4D7a100E5F0C4A345A471CE2b34f",
        marginPositionManager: "0x86E05FdB1Df8AA16975C64ca275e0e705483Eb79",
        lendingPoolManager: "0xa6BcB4e1C6Cf22E9Ee8afEceF8d02F336FDF4362",
        likwidPancakeswap: "0xa6BcB4e1C6Cf22E9Ee8afEceF8d02F336FDF4362",
        pancakeswapQuoterV2: "",
      },
      currencies: {
        "0x0000000000000000000000000000000000000000": {
          name: "BHB",
          minEtherPrice: ethers.parseEther("1"),
        },
        "0x664576b0abefb3068d7f80f560b05cf4d06cfb70": {
          name: "LIKWID",
          minEtherPrice: ethers.parseEther("0.000001"), // 1 ETH = 1000_000 LIKWID
        },
      },
    },
    56: {
      // BSC_MAINNET
      rpcUrl: requireEnv("BSC_MAINNET_RPC"),
      contracts: {
        startBlock: 50231527,
        marginChecker: "0x0Caf19c06ea707e831c03715eC822bfAc484E511",
        lendingPoolManager: "0x58B5Fb66b90259b8B97888BB6eC2b63A5723cb35",
        pairPoolManager: "0x4C136fc2DCE4CaBDd9a5BABFF48BA06bEfA356DC",
        marginPositionManager: "0x2Fb40cAf8b8963D1Ad08c6e4Bf6db2596E062B74",
        likwidPancakeswap: "0xbe544eE57669103Fe193201cE0448d3c468298Dc",
        pancakeswapQuoterV2: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      },
      currencies: {
        "0x0000000000000000000000000000000000000000": {
          name: "BNB",
          minEtherPrice: ethers.parseEther("1"),
        },
        "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c": {
          name: "BTCB",
          minEtherPrice: ethers.parseEther("156.207"), // 1 BNB = 0.006392 BTCB
        },
      },
    },
  },

  wallet: {
    privateKey: requireEnv("PRIVATE_KEY"),
  },
} as const;

export function validateCurrency(chainId: number, currency: string) {
  const currencies = config.networks[chainId].currencies;
  if (!currencies) {
    return true;
  }
  return currencies.hasOwnProperty(currency);
}

export function getCurrencyMinEtherPrice(chainId: number, currency: string) {
  const currencies = config.networks[chainId].currencies;
  return currencies[currency].minEtherPrice;
}
