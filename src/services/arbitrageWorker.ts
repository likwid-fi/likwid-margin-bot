import { ethers } from "ethers";
import { config } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";

interface Position {
  pool_id: string;
  position_id: string;
  margin_amount: string;
  margin_total: string;
  margin_token: string;
}

export class ArbitrageWorker {
  private provider: ethers.Provider;
  private contractService!: ContractService;
  private isRunning: boolean = false;
  private chainId: number;
  private recipient: string = "";
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(chainId: number) {
    this.chainId = chainId;
    const network = config.networks[chainId];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.provider = provider;
  }

  async initialize() {
    const network = config.networks[this.chainId];
    const wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
    this.recipient = wallet.address;
    const contracts = await initializeContracts(network.contracts, wallet);
    this.contractService = new ContractService(contracts);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.reconnectInterval = setInterval(async () => {
      if (this.isRunning) {
        await Promise.all([this.bnb2BTCB()]);
      }
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private async calculateTransactionFee(estimateGas: bigint): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 1n; // Use 1n if gasPrice is undefined
    return estimateGas * gasPrice;
  }

  private async bnb2BTCB() {
    console.log("bnb2BTCB");
  }
}
