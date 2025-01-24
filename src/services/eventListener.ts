import { ethers } from "ethers";
import { DatabaseService } from "./database";
import type { MarginPositionManager } from "../types/contracts/MarginPositionManager";
import type { MarginHookManager } from "../types/contracts/MarginHookManager";
import { Contracts, ContractService, initializeContracts } from "./contracts";
import type { TypedEventLog, TypedListener, TypedContractEvent } from "../types/contracts/common";
import { config, validateCurrency } from "../config/config";

type MarginEvent = TypedContractEvent<
  [
    poolId: string,
    owner: string,
    positionId: bigint,
    marginAmount: bigint,
    marginTotal: bigint,
    borrowAmount: bigint,
    marginForOne: boolean
  ]
>;

type BurnEvent = TypedContractEvent<[poolId: string, sender: string, positionId: bigint, burnType: bigint]>;

export class EventListener {
  private db: DatabaseService;
  private provider: ethers.Provider;
  private contracts!: Contracts;
  private isRunning: boolean = false;
  private startBlock: number = 0;
  private chainId: number;

  constructor(db: DatabaseService, chainId: number) {
    this.db = db;
    this.chainId = chainId;
    const network = config.networks[chainId];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.provider = provider;
    this.startBlock = network.contracts.startBlock;
  }

  async initialize() {
    const network = config.networks[this.chainId];
    const wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
    this.contracts = await initializeContracts(network.contracts, wallet);
  }

  // start listening to events
  async startListening() {
    if (this.isRunning) return;
    this.isRunning = true;

    // listen to new events
    this.listenToNewEvents();

    // sync historical events
    await this.syncHistoricalEvents();
  }

  // stop listening to events
  stopListening() {
    this.isRunning = false;
    this.contracts.marginPositionManager.removeAllListeners();
    this.contracts.marginHookManager.removeAllListeners();
  }

  // listen to new events
  private listenToNewEvents() {
    this.contracts.marginPositionManager.on(this.contracts.marginPositionManager.filters.Margin, (async (
      poolId: string,
      owner: string,
      positionId: bigint,
      marginAmount: bigint,
      marginTotal: bigint,
      borrowAmount: bigint,
      marginForOne: boolean,
      event: TypedEventLog<MarginEvent>
    ) => {
      await this.handleMarginEvent({
        poolId,
        owner,
        positionId,
        marginAmount,
        marginTotal,
        borrowAmount,
        marginForOne,
        event,
      });
    }) as TypedListener<MarginEvent>);
    this.contracts.marginPositionManager.on(this.contracts.marginPositionManager.filters.Burn, (async (
      poolId: string,
      sender: string,
      positionId: bigint,
      burnType: bigint,
      event: TypedEventLog<BurnEvent>
    ) => {
      await this.handleBurnEvent({
        poolId,
        sender,
        positionId,
        burnType,
        event,
      });
    }) as TypedListener<BurnEvent>);
  }

  // sync historical events from contracts
  private async syncHistoricalEvents() {
    const hookManagerAddress = await this.contracts.marginHookManager.getAddress();
    const positionManagerAddress = await this.contracts.marginPositionManager.getAddress();
    let lastSyncedBlock = this.db.getLastSyncedBlock(this.chainId);
    if (lastSyncedBlock === 0) {
      lastSyncedBlock = this.startBlock;
    }
    const currentBlock = await this.provider.getBlockNumber();
    const batchSize = 1000;
    const hookEvents = this.contracts.marginHookManager.interface;
    const positionEvents = this.contracts.marginPositionManager.interface;

    const topics = [
      [
        hookEvents.getEvent("Initialize").topicHash,
        positionEvents.getEvent("Margin").topicHash,
        positionEvents.getEvent("Burn").topicHash,
        positionEvents.getEvent("RepayClose").topicHash,
        positionEvents.getEvent("Modify").topicHash,
      ],
    ];
    for (let fromBlock = lastSyncedBlock + 1; fromBlock <= currentBlock; fromBlock += batchSize) {
      const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
      console.log(`Syncing from block ${fromBlock} to block ${toBlock}`);
      const filter = {
        address: [hookManagerAddress, positionManagerAddress],
        fromBlock,
        toBlock,
        topics,
      };
      const events = await this.provider.getLogs(filter);
      for (const log of events) {
        if (log.address === hookManagerAddress) {
          const parsedLog = this.contracts.marginHookManager.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (!parsedLog) continue;
          this.db.savePool({
            chainId: this.chainId,
            poolId: parsedLog.args.id,
            currency0: parsedLog.args.currency0,
            currency1: parsedLog.args.currency1,
          });
        } else {
          const parsedLog = this.contracts.marginPositionManager.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (!parsedLog) continue;
          if (parsedLog.name === "Margin") {
            const poolId = parsedLog.args.poolId;
            const pool = this.db.getPool(this.chainId, poolId);
            if (!pool) continue;
            const marginToken = parsedLog.args.marginForOne ? pool.currency1 : pool.currency0;
            console.log(marginToken, validateCurrency(this.chainId, marginToken));
            if (!validateCurrency(this.chainId, marginToken)) {
              console.log("Jump", parsedLog.args.positionId, marginToken);
              continue;
            }
            this.db.savePosition({
              chainId: this.chainId,
              managerAddress: positionManagerAddress,
              positionId: parsedLog.args.positionId,
              poolId: poolId,
              ownerAddress: parsedLog.args.owner,
              marginAmount: parsedLog.args.marginAmount,
              marginTotal: parsedLog.args.marginTotal,
              borrowAmount: parsedLog.args.borrowAmount,
              marginForOne: parsedLog.args.marginForOne,
              marginToken: marginToken,
            });
          } else if (parsedLog.name === "Burn") {
            console.log("Burn", parsedLog.args.positionId);
            this.db.deletePosition(this.chainId, positionManagerAddress, parsedLog.args.positionId);
          } else {
            const position = await this.contracts.marginPositionManager.getPosition(parsedLog.args.positionId);
            if (!position) continue;
            console.log("Update", parsedLog.args.positionId);
            this.db.updatePosition({
              chainId: this.chainId,
              managerAddress: positionManagerAddress,
              positionId: parsedLog.args.positionId,
              marginAmount: position.marginAmount,
              marginTotal: position.marginTotal,
              borrowAmount: position.borrowAmount,
            });
          }
        }
      }
      this.db.updateLastSyncedBlock(this.chainId, toBlock);
    }
  }

  // 处理 Margin 事件
  private async handleMarginEvent(params: {
    poolId: string;
    owner: string;
    positionId: bigint;
    marginAmount: bigint;
    marginTotal: bigint;
    borrowAmount: bigint;
    marginForOne: boolean;
    event: TypedEventLog<MarginEvent>;
  }) {
    const positionManagerAddress = await this.contracts.marginPositionManager.getAddress();
    const pool = this.db.getPool(this.chainId, params.poolId);
    if (!pool) return;
    const marginToken = params.marginForOne ? pool.currency1 : pool.currency0;
    this.db.savePosition({
      chainId: this.chainId,
      managerAddress: positionManagerAddress,
      positionId: params.positionId,
      poolId: params.poolId,
      ownerAddress: params.owner,
      marginAmount: params.marginAmount,
      marginTotal: params.marginTotal,
      borrowAmount: params.borrowAmount,
      marginForOne: params.marginForOne,
      marginToken: marginToken,
    });
  }

  // 处理 Burn 事件
  private async handleBurnEvent(params: {
    poolId: string;
    sender: string;
    positionId: bigint;
    burnType: bigint;
    event: TypedEventLog<BurnEvent>;
  }) {
    const positionManagerAddress = await this.contracts.marginPositionManager.getAddress();
    this.db.deletePosition(this.chainId, positionManagerAddress, Number(params.positionId));
  }
}
