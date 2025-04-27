import { ContractRunner } from "ethers";
import type { PairPoolManager } from "../types/contracts/PairPoolManager";
import { PairPoolManager__factory } from "../types/contracts/factories/PairPoolManager__factory";
import type { MarginPositionManager } from "../types/contracts/MarginPositionManager";
import { MarginPositionManager__factory } from "../types/contracts/factories/MarginPositionManager__factory";
import type { MarginChecker } from "../types/contracts/MarginChecker";
import { MarginChecker__factory } from "../types/contracts/factories/MarginChecker__factory";
import type { LendingPoolManager } from "../types/contracts/LendingPoolManager";
import { LendingPoolManager__factory } from "../types/contracts/factories/LendingPoolManager__factory";
import type { LikwidPancakeswap } from "../types/contracts/LikwidPancakeswap";
import { LikwidPancakeswap__factory } from "../types/contracts/factories/LikwidPancakeswap__factory";

export interface ContractAddresses {
  marginChecker: string;
  pairPoolManager: string;
  marginPositionManager: string;
  lendingPoolManager: string;
  likwidPancakeswap: string;
}

export interface Contracts {
  marginChecker: MarginChecker;
  pairPoolManager: PairPoolManager;
  marginPositionManager: MarginPositionManager;
  lendingPoolManager: LendingPoolManager;
  likwidPancakeswap: LikwidPancakeswap;
}

export async function initializeContracts(addresses: ContractAddresses, runner: ContractRunner): Promise<Contracts> {
  const marginChecker = MarginChecker__factory.connect(addresses.marginChecker, runner);

  const pairPoolManager = PairPoolManager__factory.connect(addresses.pairPoolManager, runner);

  const marginPositionManager = MarginPositionManager__factory.connect(addresses.marginPositionManager, runner);

  const lendingPoolManager = LendingPoolManager__factory.connect(addresses.lendingPoolManager, runner);

  const likwidPancakeswap = LikwidPancakeswap__factory.connect(addresses.likwidPancakeswap, runner);

  return {
    marginChecker,
    pairPoolManager,
    marginPositionManager,
    lendingPoolManager,
    likwidPancakeswap,
  };
}

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
    const positionManager = this.contracts.marginPositionManager.getAddress();
    return await this.contracts.marginChecker.getPositions(positionManager, positionIds);
  }

  async estimatePNL(positionId: bigint, repayMillionth: bigint) {
    const positionManager = this.contracts.marginPositionManager.getAddress();
    return await this.contracts.marginChecker["estimatePNL(address,uint256,uint256)"](
      positionManager,
      positionId,
      repayMillionth
    );
  }

  async estimateLiquidateBurn(positionId: bigint) {
    return await this.contracts.marginPositionManager.liquidateBurn.estimateGas(positionId);
  }

  async liquidateBurn(positionId: bigint) {
    return await this.contracts.marginPositionManager.liquidateBurn(positionId);
  }

  // MarginChecker
  getMarginChecker() {
    return this.contracts.marginChecker;
  }

  async checkLiquidate(manager: string, positionId: bigint) {
    return await this.contracts.marginChecker["checkLiquidate(address,uint256)"](manager, positionId);
  }

  async checkLiquidateByIds(manager: string, positionIds: bigint[]) {
    return await this.contracts.marginChecker["checkLiquidate(address,uint256[])"](manager, positionIds);
  }

  async getLiquidateMillion() {
    return await this.contracts.marginChecker.liquidationMarginLevel();
  }

  // PairPoolManager
  async getHookStatus(poolId: string) {
    return await this.contracts.pairPoolManager.getStatus(poolId);
  }

  async getReserves(poolId: string) {
    return await this.contracts.pairPoolManager.getReserves(poolId);
  }

  async getAmountIn(poolId: string, zeroForOne: boolean, amountOut: bigint) {
    return await this.contracts.pairPoolManager.getAmountIn(poolId, zeroForOne, amountOut);
  }

  async getAmountOut(poolId: string, zeroForOne: boolean, amountIn: bigint) {
    return await this.contracts.pairPoolManager.getAmountOut(poolId, zeroForOne, amountIn);
  }

  //LendingPoolManager
  async withdraw(recipient: string, poolId: string, currency: string, amount: bigint) {
    return await this.contracts.lendingPoolManager.withdraw(recipient, poolId, currency, amount);
  }
}
