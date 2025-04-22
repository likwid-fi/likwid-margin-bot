import { DatabaseService } from "./services/database";
import { EventListener } from "./services/eventListener";
import { LiquidationWorker } from "./services/liquidationWorker";

async function main(chainId: number) {
  try {
    // init db
    const dbService = new DatabaseService();

    // init event listener
    // const chainId = 11155111; // Sepolia testnet
    const eventListener = new EventListener(dbService, chainId);
    await eventListener.initialize();

    // start listening to events
    await eventListener.startListening();
    console.log("Started listening for events...");

    const liquidationWorker = new LiquidationWorker(dbService, chainId);
    await liquidationWorker.initialize();
    await liquidationWorker.start();

    // keep program running
    process.stdin.resume();

    // listen to exit signals
    const cleanup = async () => {
      console.log("\nStopping event listener...");
      eventListener.stopListening();
      // give some time for event listener to finish cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));
      process.exit(0);
    };

    // listen to exit signals
    process.on("SIGINT", cleanup); // Ctrl+C
    process.on("SIGTERM", cleanup); // kill
    process.on("SIGUSR2", cleanup); // nodemon restart
    process.on("uncaughtException", async (error) => {
      console.error("Uncaught Exception:", error);
      await cleanup();
    });
    process.on("unhandledRejection", async (error) => {
      console.error("Unhandled Rejection:", error);
      await cleanup();
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}
// bsc-testnet
main(97).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
