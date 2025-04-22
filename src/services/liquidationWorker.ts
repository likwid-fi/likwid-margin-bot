import { config, getCurrencyMinEtherPrice } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";
import { DatabaseService } from "./database";
import { ethers } from "ethers";

interface Position {
  pool_id: string;
  position_id: string;
  margin_amount: string;
  margin_total: string;
  margin_token: string;
}

export class LiquidationWorker {
  private db: DatabaseService;
  private provider: ethers.Provider;
  private contractService!: ContractService;
  private isRunning: boolean = false;
  private chainId: number;
  private recipient: string = "";

  constructor(db: DatabaseService, chainId: number) {
    this.db = db;
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

    while (this.isRunning) {
      try {
        await this.liquidateBurn();
        // sleep 10 seconds
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        console.error("Error in liquidation check:", error);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  private async calculateTransactionFee(estimateGas: bigint): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 1n; // Use 1n if gasPrice is undefined
    return estimateGas * gasPrice;
  }

  private async liquidateBurn() {
    const positions = this.db.getPositions(this.chainId) as Position[];
    console.log("liquidateBurn.positionIds", positions.length);
    const positionIds = positions.map((p) => BigInt(p.position_id));
    const managerAddress = await this.contractService.getMarginPositionManager().getAddress();
    const liquidationStates = await this.contractService.checkLiquidateByIds(managerAddress, positionIds);
    const liquidatePositions = positions.filter((_, index) => liquidationStates.liquidatedList[index]);
    for (const position of liquidatePositions) {
      const profit = (BigInt(position.margin_amount) + BigInt(position.margin_total)) / 100n;
      const minEtherPrice = getCurrencyMinEtherPrice(this.chainId, positions[0].margin_token);
      const obtainAmount = (minEtherPrice * profit) / 10n ** 18n;
      const positionId = BigInt(position.position_id);
      try {
        const estimateGas = await this.contractService.estimateLiquidateBurn(positionId);
        const txFee = await this.calculateTransactionFee(estimateGas);
        // delete position
        this.db.deletePosition(this.chainId, managerAddress, positionId);

        if (txFee > obtainAmount) {
          console.log(`Tx fee ${txFee} exceeds obtain amount ${obtainAmount}`);
          continue;
        }
        const tx = await this.contractService.liquidateBurn(positionId);
        console.log(`Liquidation transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        if (receipt && receipt.status === 1) {
          console.log(`Successfully liquidated position, delete positions:${positionId}`);
          if (this.recipient != "") {
            // withdraw profit.It can operate for a while and handle withdrawals in a unified batch later.
            await (
              await this.contractService.withdraw(this.recipient, position.pool_id, position.margin_token, profit)
            ).wait();
          }
        } else {
          console.error(`Failed to liquidate position ${positionId}`);
        }
      } catch (error) {
        console.error(`Error liquidating position ${positionId}:`, error);
      }
    }
  }

  private async liquidateCallExample() {
    const positions = this.db.getPositions(this.chainId) as Position[];
    console.log("liquidateCallExample.positionIds", positions.length);
    const positionIds = positions.map((p) => BigInt(p.position_id));
    const managerAddress = await this.contractService.getMarginPositionManager().getAddress();
    const liquidationStates = await this.contractService.checkLiquidateByIds(managerAddress, positionIds);
    const liquidatePositions = positions.filter((_, index) => liquidationStates.liquidatedList[index]);
    for (const position of liquidatePositions) {
      const profit = BigInt(position.margin_amount) + BigInt(position.margin_total);
      const positionId = BigInt(position.position_id);
      try {
        const repayAmount =
          ((await this.contractService
            .getMarginChecker()
            ["getLiquidateRepayAmount(address,uint256)"](managerAddress, positionId)) *
            101n) /
          100n;
        const pool = this.db.getPool(this.chainId, position.pool_id);
        if (!pool) continue;
        const borrowToken = position.margin_total == pool.currency1 ? pool.currency0 : pool.currency1;
        let payValue = 0n;
        if (borrowToken == "0x0000000000000000000000000000000000000000") {
          payValue = repayAmount;
        } else {
          // approve token
        }
        const tx = await this.contractService.getMarginPositionManager().liquidateCall(positionId, { value: payValue });
        const receipt = await tx.wait();
        if (receipt && receipt.status === 1) {
          console.log(`Successfully liquidated position, delete positions:${positionId}`);
          if (this.recipient != "") {
            // withdraw profit.It can operate for a while and handle withdrawals in a unified batch later.
            await (
              await this.contractService.withdraw(this.recipient, position.pool_id, position.margin_token, profit)
            ).wait();
          }
        } else {
          console.error(`Failed to liquidate position ${positionId}`);
        }
      } catch (error) {
        console.error(`Error liquidating position ${positionId}:`, error);
      }
    }
  }
}
