import { DatabaseService } from "./services/database";
import { V2PairService } from "./services/v2pair";

async function main() {
  // init db
  const dbService = new DatabaseService();

  // init event listener
  // const chainId = 11155111; // Sepolia testnet
  const v2pairService = new V2PairService(dbService);
  await v2pairService.initialize();

  await Promise.all([v2pairService.syncETHEvents(), v2pairService.syncBSCEvents()]);
}
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
