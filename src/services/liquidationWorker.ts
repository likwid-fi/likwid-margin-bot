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

  private async checkLiquidations() {
    const positionGroups = this.db.getPositionGroups(this.chainId) as PositionGroup[];
    console.log("checkLiquidations.positionGroups", positionGroups.length);

    for (const group of positionGroups) {
      try {
        const positions = this.db.getPositionsByGroup(
          this.chainId,
          group.pool_id,
          group.margin_for_one === 1
        ) as Position[];

        if (positions.length === 0) continue;

        const positionIds = positions.map((p) => BigInt(p.position_id));
        const managerAddress = await this.contractService.getMarginPositionManager().getAddress();
        const liquidationStates = await this.contractService.checkLiquidateByIds(managerAddress, positionIds);
        const liquidateIds = positionIds.filter((_, index) => liquidationStates.liquidatedList[index]);
        const liquidatePositions = positions.filter((_, index) => liquidationStates.liquidatedList[index]);
        const releaseAmountList = liquidationStates.releaseAmountList.filter(
          (_, index) => liquidationStates.liquidatedList[index]
        );
        let obtainTotal = 0n;
        for (let i = 0; i < liquidateIds.length; i++) {
          const position = liquidatePositions[i];
          const assetAmount = BigInt(position.margin_amount) + BigInt(position.margin_total) - releaseAmountList[i];
          if (assetAmount > 0) {
            obtainTotal += assetAmount;
          }
        }
        if (liquidateIds.length > 0 && obtainTotal > 0) {
          console.log(
            `Found ${liquidateIds.length} liquidateIds positions in pool ${group.pool_id},obtainTotal:${obtainTotal}`
          );

          const minEtherPrice = getCurrencyMinEtherPrice(this.chainId, positions[0].margin_token);
          const obtainAmount = (minEtherPrice * obtainTotal) / (10n ^ 18n);

          const burnParams = {
            poolId: group.pool_id,
            marginForOne: group.margin_for_one === 1,
            positionIds: liquidateIds,
            signature: "0x",
          };

          try {
            const estimateGas = await this.contractService.estimateLiquidateBurn(burnParams);
            if (estimateGas > obtainAmount) {
              console.log(
                `estimateGas > obtainAmount condition not met, estimateGas: ${estimateGas}, obtainAmount: ${obtainAmount}`
              );
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
