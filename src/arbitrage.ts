import { ArbitrageWorker } from "./services/arbitrageWorker";

async function main(chainId: number) {
  try {
    const arbitrageWorker = new ArbitrageWorker(chainId);
    await arbitrageWorker.initialize();
    await arbitrageWorker.start();
    console.log("arbitrageWorker starting...");
    // keep program running
    process.stdin.resume();

    // listen to exit signals
    const cleanup = async () => {
      console.log("\nStopping arbitrageWorker...");
      arbitrageWorker.stop();
      console.log("Stopped");
      // give some time for worker to finish cleanup
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
// bsc
main(56).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
