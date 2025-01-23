import dotenv from "dotenv";
import { ethers } from "ethers";

// 加载环境变量
dotenv.config();

// 环境变量验证函数
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
    marginHookManager: string;
    marginPositionManager: string;
  };
  currencies: {
    [address: string]: {
      name: string;
      minETHPrice: bigint; // minimum price needed to buy 1 ether of token
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
  gas: {
    gasLimit: bigint;
    maxPriorityFeePerGas: bigint;
    maxFeePerGas: bigint;
  };
  bot: {
    logLevel: string;
    retryAttempts: number;
    retryDelay: number;
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
        marginHookManager: "0x59036D328EFF4dAb2E33E04a60A5D810Df90C888",
        marginPositionManager: "0x3297e9416415A67c6fFb9786C71a4d8C21b78DeF",
      },
      currencies: {
        "0x0000000000000000000000000000000000000000": {
          name: "ETH",
          minETHPrice: ethers.parseEther("1"),
        },
        "0x692CA9D3078Aa6b54F2F0e33Ed20D30489854A21": {
          name: "PEPE",
          minETHPrice: ethers.parseEther("0.001"), // 1 ETH = 1000 PEPE
        },
      },
    },
  },

  wallet: {
    privateKey: requireEnv("PRIVATE_KEY"),
  },

  gas: {
    gasLimit: ethers.getBigInt(process.env.GAS_LIMIT || "300000"),
    maxPriorityFeePerGas: ethers.parseUnits(process.env.MAX_PRIORITY_FEE || "2", "gwei"),
    maxFeePerGas: ethers.parseUnits(process.env.MAX_FEE_PER_GAS || "50", "gwei"),
  },

  bot: {
    logLevel: process.env.LOG_LEVEL || "info",
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || "3"),
    retryDelay: parseInt(process.env.RETRY_DELAY || "1000"),
  },
} as const;

export function validateCurrency(chainId: number, currency: string) {
  const currencies = config.networks[chainId].currencies;
  if (!currencies) {
    return true;
  }
  return currencies.hasOwnProperty(currency);
}
