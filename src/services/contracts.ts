import { ContractRunner } from "ethers";
import type { MarginHookManager } from "../types/contracts/MarginHookManager";
import { MarginHookManager__factory } from "../types/contracts/factories/MarginHookManager__factory";
import type { MarginPositionManager } from "../types/contracts/MarginPositionManager";
import { MarginPositionManager__factory } from "../types/contracts/factories/MarginPositionManager__factory";
import type { MarginParamsStruct, BurnParamsStruct } from "../types/contracts/MarginPositionManager";
import { MarginChecker__factory } from "../types/contracts/factories/MarginChecker__factory";
import type { MarginChecker } from "../types/contracts/MarginChecker";

// 合约地址类型
export interface ContractAddresses {
  marginChecker: string;
  marginHookManager: string;
  marginPositionManager: string;
}

// 合约实例类型
export interface Contracts {
  marginChecker: MarginChecker;
  marginHookManager: MarginHookManager;
  marginPositionManager: MarginPositionManager;
}

// 初始化合约
export async function initializeContracts(addresses: ContractAddresses, runner: ContractRunner): Promise<Contracts> {
  const marginChecker = MarginChecker__factory.connect(addresses.marginChecker, runner);

  const marginHookManager = MarginHookManager__factory.connect(addresses.marginHookManager, runner);

  const marginPositionManager = MarginPositionManager__factory.connect(addresses.marginPositionManager, runner);

  return {
    marginChecker,
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
  getMarginPositionManager() {
    return this.contracts.marginPositionManager;
  }

  async getPosition(positionId: bigint) {
    return await this.contracts.marginPositionManager.getPosition(positionId);
  }

  async getPositions(positionIds: bigint[]) {
    return await this.contracts.marginPositionManager.getPositions(positionIds);
  }

  async estimatePNL(positionId: bigint, repayMillionth: bigint) {
    return await this.contracts.marginPositionManager.estimatePNL(positionId, repayMillionth);
  }

  async liquidateBurn(params: BurnParamsStruct) {
    return await this.contracts.marginPositionManager["liquidateBurn((bytes32,bool,uint256[],bytes))"](params);
  }

  // MarginChecker
  async checkLiquidate(manager: string, positionId: bigint) {
    return await this.contracts.marginChecker["checkLiquidate(address,uint256)"](manager, positionId);
  }

  async checkLiquidateByIds(manager: string, positionIds: bigint[]) {
    return await this.contracts.marginChecker["checkLiquidate(address,uint256[])"](manager, positionIds);
  }

  // MarginHookManager
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
