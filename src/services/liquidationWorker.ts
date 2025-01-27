import { config, getCurrencyMinEtherPrice } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";
import { DatabaseService } from "./database";
import { ethers } from "ethers";

interface PositionGroup {
  pool_id: string;
  margin_for_one: number;
}

interface Position {
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
    const contracts = await initializeContracts(network.contracts, wallet);
    this.contractService = new ContractService(contracts);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.checkLiquidations();
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
    const gasPrice = feeData.gasPrice || 1n; // Use 0n if gasPrice is undefined
    return estimateGas * gasPrice;
  }

  private async checkLiquidations() {
    const positionGroups = this.db.getPositionGroups(this.chainId) as PositionGroup[];
    console.log("checkLiquidations.positionGroups", positionGroups.length);

    for (const group of positionGroups) {
      try {
        const marginForOne = group.margin_for_one === 1;
        const positions = this.db.getPositionsByGroup(this.chainId, group.pool_id, marginForOne) as Position[];

        if (positions.length === 0) continue;

        const positionIds = positions.map((p) => BigInt(p.position_id));
        const managerAddress = await this.contractService.getMarginPositionManager().getAddress();
        const liquidationStates = await this.contractService.checkLiquidateByIds(managerAddress, positionIds);
        const liquidateIds = positionIds.filter((_, index) => liquidationStates.liquidatedList[index]);
        const liquidatePositions = positions.filter((_, index) => liquidationStates.liquidatedList[index]);

        let marginAmount = 0n;
        let assetAmount = 0n;
        for (let i = 0; i < liquidateIds.length; i++) {
          const position = liquidatePositions[i];
          marginAmount += BigInt(position.margin_amount);
          assetAmount += BigInt(position.margin_amount) + BigInt(position.margin_total);
        }
        const liquidateMillion = await this.contractService.getLiquidateMillion();
        const obtainTotal = (marginAmount * liquidateMillion) / 10n ** 6n;
        if (liquidateIds.length > 0 && obtainTotal > 0) {
          console.log(
            `Found ${liquidateIds.length} liquidateIds positions in pool ${group.pool_id},obtainTotal:${obtainTotal}`
          );

          const minEtherPrice = getCurrencyMinEtherPrice(this.chainId, positions[0].margin_token);
          const obtainAmount = (minEtherPrice * obtainTotal) / 10n ** 18n;

          const burnParams = {
            poolId: group.pool_id,
            marginForOne: marginForOne,
            positionIds: liquidateIds,
            signature: "0x",
          };

          try {
            const estimateGas = await this.contractService.estimateLiquidateBurn(burnParams);
            const txFee = await this.calculateTransactionFee(estimateGas);

            if (txFee > obtainAmount) {
              console.log(`Tx fee ${txFee} exceeds obtain amount ${obtainAmount}`);
              continue;
            }
            const tx = await this.contractService.liquidateBurn(burnParams);
            console.log(`Liquidation transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            if (receipt && receipt.status === 1) {
              console.log(
                `Successfully liquidated positions in pool ${group.pool_id}, delete positions:${liquidateIds}`
              );
              this.db.deletePositionByIds(this.chainId, managerAddress, liquidateIds);
            } else {
              console.error(`Failed to liquidate positions in pool ${group.pool_id}`);
            }
          } catch (error) {
            console.error(`Error liquidating positions in pool ${group.pool_id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error checking pool ${group.pool_id}:`, error);
      }
    }
  }
}
