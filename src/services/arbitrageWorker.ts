import { ethers } from "ethers";
import { config } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";
import { bnb2Token } from "../task/bnb2Token";

export const ONE_MILLION = 10n ** 6n;

export class ArbitrageWorker {
  private isRunning: boolean = false;
  public provider: ethers.Provider;
  public likwidSwapGas: bigint = 1000000n;
  public chainId: number;
  public contractService!: ContractService;

  constructor(chainId: number) {
    this.chainId = chainId;
    const network = config.networks[chainId];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.provider = provider;
  }

  async initialize() {
    const network = config.networks[this.chainId];
    const wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
    const contracts = await initializeContracts(network.contracts, wallet);
    this.contractService = new ContractService(contracts);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runTasks();
  }

  async runTasks() {
    console.log("Tasks starting...");
    const self = this;
    try {
      await Promise.all([
        bnb2Token(
          self,
          "0x35bbb1b8fa0a850951c71b0686186ecca1846a3feaecb65496b2b5a7134798c2",
          "0x758309c0d1342e0d5a778b83cdcebaa3f4554444"
        ),
      ]);
      console.log("Tasks finished successfully.");
    } catch (error) {
      console.error("Error during tasks execution:", error);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } finally {
      if (this.isRunning) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await this.runTasks();
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  public async calculateTransactionFee(estimateGas: bigint): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 1n; // Use 1n if gasPrice is undefined
    return estimateGas * gasPrice;
  }
}
