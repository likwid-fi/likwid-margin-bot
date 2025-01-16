import { ContractRunner } from "ethers";
import type { MarginHookManager } from "../types/contracts/MarginHookManager";
import { MarginHookManager__factory } from "../types/contracts/factories/MarginHookManager__factory";
import type { MarginPositionManager } from "../types/contracts/MarginPositionManager";
import { MarginPositionManager__factory } from "../types/contracts/factories/MarginPositionManager__factory";
import type { MarginParamsStruct } from "../types/contracts/MarginPositionManager";

// 合约地址类型
export interface ContractAddresses {
  marginHookManager: string;
  marginPositionManager: string;
}

// 合约实例类型
export interface Contracts {
  marginHookManager: MarginHookManager;
  marginPositionManager: MarginPositionManager;
}

// 初始化合约
export async function initializeContracts(addresses: ContractAddresses, runner: ContractRunner): Promise<Contracts> {
  const marginHookManager = MarginHookManager__factory.connect(addresses.marginHookManager, runner);

  const marginPositionManager = MarginPositionManager__factory.connect(addresses.marginPositionManager, runner);

  return {
    marginHookManager,
    marginPositionManager,
  };
}

// 合约服务
export class ContractService {
  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // MarginPositionManager
  async getPosition(positionId: bigint) {
    return await this.contracts.marginPositionManager.getPosition(positionId);
  }

  async getPositions(positionIds: bigint[]) {
    return await this.contracts.marginPositionManager.getPositions(positionIds);
  }

  async estimatePNL(positionId: bigint, repayMillionth: bigint) {
    return await this.contracts.marginPositionManager.estimatePNL(positionId, repayMillionth);
  }

  async checkLiquidate(positionId: bigint) {
    return await this.contracts.marginPositionManager.checkLiquidate(positionId);
  }

  // MarginHookManager 合约调用
  async getHookStatus(poolId: string) {
    return await this.contracts.marginHookManager.getStatus(poolId);
  }

  async getReserves(poolId: string) {
    return await this.contracts.marginHookManager.getReserves(poolId);
  }

  async getAmountIn(poolId: string, zeroForOne: boolean, amountOut: bigint) {
    return await this.contracts.marginHookManager.getAmountIn(poolId, zeroForOne, amountOut);
  }

  async getAmountOut(poolId: string, zeroForOne: boolean, amountIn: bigint) {
    return await this.contracts.marginHookManager.getAmountOut(poolId, zeroForOne, amountIn);
  }
}
