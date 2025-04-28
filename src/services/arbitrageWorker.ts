import { ethers } from "ethers";
import { config } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";

const ONE_MILLION = 10n ** 6n;

export class ArbitrageWorker {
  private provider: ethers.Provider;
  private contractService!: ContractService;
  private isRunning: boolean = false;
  private chainId: number;
  private recipient: string = "";
  private reconnectInterval: NodeJS.Timeout | null = null;
  private likwidSwapGas: bigint = 1000000n;

  constructor(chainId: number) {
    this.chainId = chainId;
    const network = config.networks[chainId];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.provider = provider;
  }

  async initialize() {
    const network = config.networks[this.chainId];
    const wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
    this.recipient = wallet.address;
    const contracts = await initializeContracts(network.contracts, wallet);
    this.contractService = new ContractService(contracts);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runTasks();
  }

  async runTasks() {
    console.log("Tasks starting...");
    try {
      await Promise.all([this.bnb2BTCB()]);
      console.log("Tasks finished successfully.");
    } catch (error) {
      console.error("Error during tasks execution:", error);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } finally {
      if (this.isRunning) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await this.runTasks();
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  private async calculateTransactionFee(estimateGas: bigint): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 1n; // Use 1n if gasPrice is undefined
    return estimateGas * gasPrice;
  }

  private async bnb2BTCB() {
    if (this.chainId == 56) {
      console.log("bnb2BTCB.chainId:", this.chainId);
      const payValue = ethers.parseEther("0.1"); // 0.1 BNB
      const poolId = "0x6bc9f32e08e71ad40ad83153e1f98ad8930454408a345a123f20e031d774c22b";
      const fee = 100n;
      const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; //token1
      const btcb = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"; //token0
      const [likwidBTCB, pancakeswapResult] = await Promise.all([
        this.contractService.getAmountOut(poolId, true, payValue),
        this.contractService.pancakeswapQuoteExactInputSingleV2(wbnb, btcb, payValue, fee),
      ]);
      const totalGas = this.likwidSwapGas + pancakeswapResult.gasEstimate;
      const gasAmount = await this.calculateTransactionFee(totalGas);
      console.log(
        "bnb2BTCB.likwidBTCB:",
        likwidBTCB,
        ";pancakeswapResult.amountOut:",
        pancakeswapResult.amountOut,
        ";gasAmount:",
        gasAmount
      );
      const costPPI = (gasAmount * ONE_MILLION) / payValue + 12000n; // 1.2% slipping
      const likwidPancakeswap = this.contractService.getLikwidPancakeswap();
      const balance = await this.provider.getBalance(likwidPancakeswap.getAddress());
      const sendValue = payValue > balance ? payValue - balance : 0;
      console.log("bnb2BTCB.likwidPancakeswap.balance:", balance, ";sendValue:", sendValue);
      const returnBNBMin = payValue + gasAmount;
      if (likwidBTCB > pancakeswapResult.amountOut) {
        const cutCostAmount = (likwidBTCB * (ONE_MILLION - costPPI)) / ONE_MILLION;
        console.log("bnb2BTCB.likwidToPancakeswap.cutCostAmount:", cutCostAmount);
        if (cutCostAmount > pancakeswapResult.amountOut) {
          const likwidOutMin = (likwidBTCB * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
          const pancakeBNB = (
            await this.contractService.pancakeswapQuoteExactInputSingleV2(btcb, wbnb, likwidOutMin, fee)
          ).amountOut;
          if (pancakeBNB > returnBNBMin) {
            const tx = await likwidPancakeswap.likwidToPancakeswap(
              poolId,
              ethers.ZeroAddress,
              btcb,
              fee,
              payValue,
              likwidOutMin,
              returnBNBMin,
              { value: sendValue }
            );
            console.log("bnb2BTCB.likwidToPancakeswap.tx.tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("bnb2BTCB.likwidToPancakeswap.receipt.status:", receipt?.status);
          } else {
            console.log(
              "bnb2BTCB.pancakeswapToLikwid.likwidOutMin:",
              likwidOutMin,
              ";pancakeBNB:",
              pancakeBNB,
              ";returnBNBMin:",
              returnBNBMin
            );
          }
        }
      } else {
        const cutCostAmount = (pancakeswapResult.amountOut * (ONE_MILLION - costPPI)) / ONE_MILLION;
        console.log("bnb2BTCB.pancakeswapToLikwid.cutCostAmount:", cutCostAmount);
        if (cutCostAmount >= likwidBTCB) {
          const pancakesOutMin = (pancakeswapResult.amountOut * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
          const likwidBNB = await this.contractService.getAmountOut(poolId, false, pancakesOutMin);

          if (likwidBNB > returnBNBMin) {
            const tx = await likwidPancakeswap.pancakeswapToLikwid(
              ethers.ZeroAddress,
              btcb,
              fee,
              poolId,
              payValue,
              pancakesOutMin,
              returnBNBMin,
              { value: sendValue }
            );
            console.log("bnb2BTCB.pancakeswapToLikwid.tx.tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("bnb2BTCB.pancakeswapToLikwid.receipt.status:", receipt?.status);
          } else {
            console.log(
              "bnb2BTCB.pancakeswapToLikwid.pancakesOutMin:",
              pancakesOutMin,
              ";likwidBNB:",
              likwidBNB,
              ";returnBNBMin:",
              returnBNBMin
            );
          }
        }
      }
    }
    console.log("bnb2BTCB");
  }
}
