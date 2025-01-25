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
    marginHookManager: string;
    marginPositionManager: string;
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
        marginChecker: "0xE50794a80Befe17c584026f6f40bbeC3Dc764D83",
        marginHookManager: "0x59036D328EFF4dAb2E33E04a60A5D810Df90C888",
        marginPositionManager: "0x913B98B271889D3fB4D375C181FC2E58f17EC6C5",
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
