import { ContractRunner, ethers } from "ethers";
import type { UniswapV2Pair } from "../types/contracts/UniswapV2Pair";
import { UniswapV2Pair__factory } from "../types/contracts/factories/UniswapV2Pair__factory";
import { DatabaseService } from "./database";
import { config } from "../config/config";

interface V2PairAddresses {
  DOGE: string;
  SHIB: string;
  AAVE: string;
  E: string;
}

export interface Contracts {
  DOGE: UniswapV2Pair;
  SHIB: UniswapV2Pair;
  AAVE: UniswapV2Pair;
  E: UniswapV2Pair;
}

export async function initializeETH(
  addresses: V2PairAddresses,
  etherRunner: ContractRunner,
  bscRunner: ContractRunner
): Promise<Contracts> {
  const DOGE = UniswapV2Pair__factory.connect(addresses.DOGE, etherRunner);
  const SHIB = UniswapV2Pair__factory.connect(addresses.SHIB, etherRunner);
  const AAVE = UniswapV2Pair__factory.connect(addresses.AAVE, etherRunner);
  const E = UniswapV2Pair__factory.connect(addresses.E, bscRunner);
  return {
    DOGE,
    SHIB,
    AAVE,
    E,
  };
}

export class V2PairService {
  private db: DatabaseService;
  private ethProvider: ethers.Provider;
  private bscProvider: ethers.Provider;
  private contracts!: Contracts;
  private addresses!: V2PairAddresses;

  constructor(db: DatabaseService) {
    this.db = db;
    const ethNetwork = config.networks[1];
    const ethProvider = new ethers.JsonRpcProvider(ethNetwork.rpcUrl);
    this.ethProvider = ethProvider;
    const bscNetwork = config.networks[56];
    const bscProvider = new ethers.JsonRpcProvider(bscNetwork.rpcUrl);
    this.bscProvider = bscProvider;

    this.addresses = {
      DOGE: "0x308C6fbD6a14881Af333649f17f2FdE9cd75e2a6",
      SHIB: "0x811beed0119b4afce20d2583eb608c6f7af1954f",
      AAVE: "0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f",
      E: "0x72bdfde78b4ccd308fa61a2b7572ce76063f026a",
    };
  }

  async initialize() {
    this.contracts = await initializeETH(this.addresses, this.ethProvider, this.bscProvider);
  }

  public async syncETHEvents() {
    const chainId = 1;
    let lastSyncedBlock = this.db.getLastSyncedBlock(chainId);
    if (lastSyncedBlock === 0) {
      lastSyncedBlock = 10569000;
    }
    const currentBlock = await this.ethProvider.getBlockNumber();
    const batchSize = 1000;
    const events = this.contracts.SHIB.interface;

    const topics = [[events.getEvent("Transfer").topicHash]];
    while (lastSyncedBlock < currentBlock) {
      try {
        for (let fromBlock = lastSyncedBlock; fromBlock <= currentBlock; fromBlock += batchSize) {
          const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
          console.log(`syncETHEvents syncing from block ${fromBlock} to block ${toBlock}`);
          const filter = {
            address: [this.addresses.SHIB, this.addresses.AAVE, this.addresses.DOGE],
            fromBlock,
            toBlock,
            topics,
          };
          const events = await this.ethProvider.getLogs(filter);
          console.log(`syncETHEvents syncing get ${events.length} events`);
          for (const log of events) {
            const parsedLog = this.contracts.AAVE.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            if (!parsedLog) continue;
            const logTime = (await log.getBlock()).date?.getTime();
            this.db.saveV2LpLog({
              chainId: chainId,
              v2_pair: log.address,
              tx_hash: log.transactionHash,
              log_index: log.index,
              from: parsedLog.args.from,
              to: parsedLog.args.to,
              amount: parsedLog.args.value + "",
              block_number: log.blockNumber,
              log_time: logTime == null ? 0 : logTime,
            });
          }
          this.db.updateLastSyncedBlock(chainId, toBlock);
          lastSyncedBlock = toBlock;
        }
      } catch (error) {
        console.error("syncETHEvents error syncing eth events:", error);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // sleep 2s
      }
    }
  }

  public async syncBSCEvents() {
    const chainId = 56;
    let lastSyncedBlock = this.db.getLastSyncedBlock(chainId);
    if (lastSyncedBlock === 0) {
      lastSyncedBlock = 50230484;
    }
    const currentBlock = await this.bscProvider.getBlockNumber();
    console.log(`syncBSCEvents currentBlock:${currentBlock}`);
    const batchSize = 1000;
    const events = this.contracts.E.interface;

    const topics = [[events.getEvent("Transfer").topicHash]];
    while (lastSyncedBlock < currentBlock) {
      try {
        for (let fromBlock = lastSyncedBlock; fromBlock <= currentBlock; fromBlock += batchSize) {
          const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
          console.log(`syncBSCEvents syncing from block ${fromBlock} to block ${toBlock}`);
          const filter = {
            address: [this.addresses.E],
            fromBlock,
            toBlock,
            topics,
          };
          const events = await this.bscProvider.getLogs(filter);
          console.log(`syncBSCEvents syncing get ${events.length} events`);
          for (const log of events) {
            const parsedLog = this.contracts.E.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            if (!parsedLog) continue;
            const logTime = (await log.getBlock()).date?.getTime();
            this.db.saveV2LpLog({
              chainId: chainId,
              v2_pair: log.address,
              tx_hash: log.transactionHash,
              log_index: log.index,
              from: parsedLog.args.from,
              to: parsedLog.args.to,
              amount: parsedLog.args.value + "",
              block_number: log.blockNumber,
              log_time: logTime == null ? 0 : logTime,
            });
          }
          this.db.updateLastSyncedBlock(chainId, toBlock);
          lastSyncedBlock = toBlock;
        }
      } catch (error) {
        console.error("syncBSCEvents error syncing eth events:", error);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // sleep 2s
      }
    }
  }
}
