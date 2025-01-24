import { ContractService } from "./contracts";
import { DatabaseService } from "./database";
import { ethers } from "ethers";

interface PositionGroup {
  pool_id: string;
  margin_for_one: number;
}

interface Position {
  position_id: string;
}

export class LiquidationWorker {
  private db: DatabaseService;
  private contractService: ContractService;
  private isRunning: boolean = false;
  private chainId: number;
  private managerAddress: string;

  constructor(db: DatabaseService, contractService: ContractService, chainId: number, managerAddress: string) {
    this.db = db;
    this.contractService = contractService;
    this.chainId = chainId;
    this.managerAddress = managerAddress;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.checkLiquidations();
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

    for (const group of positionGroups) {
      try {
        const positions = this.db.getPositionsByGroup(
          this.chainId,
          group.pool_id,
          group.margin_for_one === 1
        ) as Position[];

        if (positions.length === 0) continue;

        const positionIds = positions.map((p) => BigInt(p.position_id));
        const liquidationStates = await this.contractService.checkLiquidateByIds(this.managerAddress, positionIds);

        const liquidateIds = positionIds.filter((_, index) => liquidationStates.liquidatedList[index]);

        if (liquidateIds.length > 0) {
          console.log(`Found ${liquidateIds.length} liquidateIds positions in pool ${group.pool_id}`);

          const burnParams = {
            poolId: group.pool_id,
            marginForOne: group.margin_for_one === 1,
            positionIds: liquidateIds,
            signature: "0x",
          };

          try {
            const tx = await this.contractService.liquidateBurn(burnParams);
            console.log(`Liquidation transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            if (receipt && receipt.status === 1) {
              console.log(`Successfully liquidated positions in pool ${group.pool_id}`);
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
