import { ethers } from "ethers";
import { config, validateCurrency } from "../config/config";
import { Contracts, initializeContracts } from "./contracts";
import { DatabaseService } from "./database";

export class EventListener {
  private db: DatabaseService;
  private provider: ethers.Provider;
  private contracts!: Contracts;
  private isRunning: boolean = false;
  private isSyncing: boolean = false;
  private startBlock: number = 0;
  private chainId: number;
  private reconnectInterval: NodeJS.Timeout | null = null;

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

    this.reconnectInterval = setInterval(() => {
      if (this.isRunning) {
        this.syncHistoricalEvents();
      }
    }, 10 * 1000);

    // sync historical events
    await this.syncHistoricalEvents();
  }

  // stop listening to events
  stopListening() {
    this.isRunning = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  // sync historical events from contracts
  private async syncHistoricalEvents() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const hookManagerAddress = await this.contracts.pairPoolManager.getAddress();
      const positionManagerAddress = await this.contracts.marginPositionManager.getAddress();
      let lastSyncedBlock = this.db.getLastSyncedBlock(this.chainId);
      if (lastSyncedBlock === 0) {
        lastSyncedBlock = this.startBlock;
      }
      const currentBlock = await this.provider.getBlockNumber();
      const batchSize = 1000;
      const hookEvents = this.contracts.pairPoolManager.interface;
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
            const parsedLog = this.contracts.pairPoolManager.interface.parseLog({
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
              console.log(pool);
              if (!pool) continue;
              const marginToken = parsedLog.args.marginForOne ? pool.currency1 : pool.currency0;
              console.log(marginToken, validateCurrency(this.chainId, marginToken));
              if (!validateCurrency(this.chainId, marginToken)) {
                console.log("Pass position id:", parsedLog.args.positionId, "marginToken:", marginToken);
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
    } catch (error) {
      console.error("Error syncing historical events:", error);
    } finally {
      this.isSyncing = false;
    }
  }
}
