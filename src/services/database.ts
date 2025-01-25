import Database from "better-sqlite3";

interface SyncState {
  last_synced_block: number;
}

interface MarginPool {
  chain_id: number;
  pool_id: string;
  currency0: string;
  currency1: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string = "bot.db") {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private createTimestampTrigger(tableName: string, primaryKeys: string[]) {
    const whereClause = primaryKeys.map((key) => `${key} = NEW.${key}`).join(" AND ");

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_${tableName}_timestamp 
        AFTER UPDATE ON ${tableName}
        FOR EACH ROW
        BEGIN
          UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP
          WHERE ${whereClause};
        END;
    `);
  }

  private initializeTables() {
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS sync_state (
        chain_id INTEGER PRIMARY KEY,
        last_synced_block INTEGER NOT NULL
      );

    CREATE TABLE IF NOT EXISTS margin_pools (
        chain_id INTEGER ,
        pool_id TEXT ,
        currency0 TEXT,
        currency1 TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chain_id, pool_id)
      );

    CREATE TABLE IF NOT EXISTS margin_positions (
        chain_id INTEGER,
        manager_address TEXT,
        position_id INTEGER,
        pool_id TEXT,
        owner_address TEXT,
        margin_amount TEXT,
        margin_total TEXT,
        borrow_amount TEXT,
        margin_for_one BOOLEAN,
        margin_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chain_id, manager_address, position_id)
      );

    CREATE INDEX IF NOT EXISTS idx_margin_positions_pool_id 
      ON margin_positions(pool_id);
      
    CREATE INDEX IF NOT EXISTS idx_margin_positions_margin_token 
      ON margin_positions(margin_token);     
    `);

    this.createTimestampTrigger("margin_positions", ["chain_id", "manager_address", "position_id"]);
  }

  // Save pool
  savePool(params: { chainId: number; poolId: string; currency0: string; currency1: string }) {
    this.db
      .prepare(
        `INSERT INTO margin_pools (chain_id, pool_id, currency0, currency1) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(chain_id, pool_id) 
         DO UPDATE SET 
           currency0 = excluded.currency0,
           currency1 = excluded.currency1`
      )
      .run(params.chainId, params.poolId, params.currency0, params.currency1);
  }

  // Get pool
  getPool(chainId: number, poolId: string) {
    return this.db.prepare("SELECT * FROM margin_pools WHERE chain_id = ? AND pool_id = ?").get(chainId, poolId) as
      | MarginPool
      | undefined;
  }

  // Save position
  savePosition(params: {
    chainId: number;
    managerAddress: string;
    positionId: bigint;
    poolId: string;
    ownerAddress: string;
    marginAmount: bigint;
    marginTotal: bigint;
    borrowAmount: bigint;
    marginForOne: boolean;
    marginToken: string;
  }) {
    this.db
      .prepare(
        `INSERT INTO margin_positions (chain_id, manager_address, position_id, pool_id, owner_address, margin_amount, margin_total, borrow_amount, margin_for_one, margin_token) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(chain_id, manager_address, position_id) 
        DO UPDATE SET 
          margin_amount = excluded.margin_amount,
          margin_total = excluded.margin_total,
          borrow_amount = excluded.borrow_amount`
      )
      .run(
        params.chainId,
        params.managerAddress,
        Number(params.positionId),
        params.poolId,
        params.ownerAddress,
        params.marginAmount.toString(),
        params.marginTotal.toString(),
        params.borrowAmount.toString(),
        params.marginForOne ? 1 : 0,
        params.marginToken
      );
  }

  // Update position
  updatePosition(params: {
    chainId: number;
    managerAddress: string;
    positionId: bigint;
    marginAmount: bigint;
    marginTotal: bigint;
    borrowAmount: bigint;
  }) {
    this.db
      .prepare(
        `UPDATE margin_positions SET margin_amount = ?, margin_total = ?, borrow_amount = ? WHERE chain_id = ? AND manager_address = ? AND position_id = ?`
      )
      .run(
        params.chainId,
        params.managerAddress,
        params.positionId.toString(),
        params.marginAmount.toString(),
        params.marginTotal.toString(),
        params.borrowAmount.toString()
      );
  }

  // Get last synced block
  getLastSyncedBlock(chainId: number): number {
    const row = this.db.prepare("SELECT last_synced_block FROM sync_state WHERE chain_id = ?").get(chainId) as
      | SyncState
      | undefined;
    return row ? row.last_synced_block : 0;
  }

  // Update last synced block
  updateLastSyncedBlock(chainId: number, blockNumber: number) {
    this.db
      .prepare(
        `
      INSERT INTO sync_state (chain_id, last_synced_block)
      VALUES (?, ?)
      ON CONFLICT(chain_id) DO UPDATE SET last_synced_block = ?
    `
      )
      .run(chainId, blockNumber, blockNumber);
  }

  // Delete position
  deletePosition(chainId: number, managerAddress: string, positionId: number) {
    this.db
      .prepare("DELETE FROM margin_positions WHERE chain_id = ? AND manager_address = ? AND position_id = ?")
      .run(chainId, managerAddress, positionId);
  }

  deletePositionByIds(chainId: number, managerAddress: string, positionIds: bigint[]) {
    this.db
      .prepare("DELETE FROM margin_positions WHERE chain_id = ? AND manager_address = ? AND position_id IN (?)")
      .run(chainId, managerAddress, positionIds);
  }

  // Get position groups
  getPositionGroups(chainId: number) {
    return this.db
      .prepare(
        `SELECT DISTINCT pool_id, margin_for_one 
           FROM margin_positions 
           WHERE chain_id = ?`
      )
      .all(chainId);
  }

  // Get positions by group
  getPositionsByGroup(chainId: number, poolId: string, marginForOne: boolean) {
    return this.db
      .prepare(
        `SELECT * FROM margin_positions 
           WHERE chain_id = ? 
           AND pool_id = ? 
           AND margin_for_one = ?`
      )
      .all(chainId, poolId, marginForOne ? 1 : 0);
  }
}
