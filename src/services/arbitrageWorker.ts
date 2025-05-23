import { ethers } from "ethers";
import { config } from "../config/config";
import { ContractService, initializeContracts } from "./contracts";
import { bnb2HAEDAL } from "../task/bnb2HAEDAL";
import { throwDeprecation } from "process";

export const ONE_MILLION = 10n ** 6n;

export class ArbitrageWorker {
  private isRunning: boolean = false;
  public provider: ethers.Provider;
  public likwidSwapGas: bigint = 1000000n;
  public chainId: number;
  public contractService!: ContractService;

  constructor(chainId: number) {
    this.chainId = chainId;
    const network = config.networks[chainId];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.provider = provider;
  }

  async initialize() {
    const network = config.networks[this.chainId];
    const wallet = new ethers.Wallet(config.wallet.privateKey, this.provider);
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
    const self = this;
    try {
      await Promise.all([bnb2HAEDAL(self)]);
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

  public async calculateTransactionFee(estimateGas: bigint): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || 1n; // Use 1n if gasPrice is undefined
    return estimateGas * gasPrice;
  }

  private async bnb2BTCB() {
    if (this.chainId == 56) {
      console.log("bnb2BTCB.chainId:", this.chainId);
      const payValue = ethers.parseEther("0.1"); // 0.1 BNB
      const poolId = "0x6bc9f32e08e71ad40ad83153e1f98ad8930454408a345a123f20e031d774c22b";
      const fee = 500n;
      const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
      const btcb = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
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

  private async bnb2SKYAI() {
    if (this.chainId == 56) {
      console.log("bnb2SKYAI.chainId:", this.chainId);
      const payValue = ethers.parseEther("0.1"); // 0.1 BNB
      const poolId = "0x5b1a0326b66d3c3f9363e6a9fcf39535e7da5109ba1fe9405d3c8cff7ca46019";
      const fee = 500n;
      const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
      const skyai = "0x92aa03137385f18539301349dcfc9ebc923ffb10";
      const [likwidSKYAI, pancakeswapResult] = await Promise.all([
        this.contractService.getAmountOut(poolId, true, payValue),
        this.contractService.pancakeswapQuoteExactInputSingleV2(wbnb, skyai, payValue, fee),
      ]);
      const totalGas = this.likwidSwapGas + pancakeswapResult.gasEstimate;
      const gasAmount = await this.calculateTransactionFee(totalGas);
      console.log(
        "bnb2SKYAI.likwidSKYAI:",
        likwidSKYAI,
        ";pancakeswapResult.amountOut:",
        pancakeswapResult.amountOut,
        ";gasAmount:",
        gasAmount
      );
      const costPPI = (gasAmount * ONE_MILLION) / payValue + 12000n; // 1.2% slipping
      const likwidPancakeswap = this.contractService.getLikwidPancakeswap();
      const balance = await this.provider.getBalance(likwidPancakeswap.getAddress());
      const sendValue = payValue > balance ? payValue - balance : 0;
      console.log("bnb2SKYAI.likwidPancakeswap.balance:", balance, ";sendValue:", sendValue);
      const returnBNBMin = payValue + gasAmount;
      if (likwidSKYAI > pancakeswapResult.amountOut) {
        const cutCostAmount = (likwidSKYAI * (ONE_MILLION - costPPI)) / ONE_MILLION;
        console.log("bnb2SKYAI.likwidToPancakeswap.cutCostAmount:", cutCostAmount);
        if (cutCostAmount > pancakeswapResult.amountOut) {
          const likwidOutMin = (likwidSKYAI * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
          const pancakeBNB = (
            await this.contractService.pancakeswapQuoteExactInputSingleV2(skyai, wbnb, likwidOutMin, fee)
          ).amountOut;
          if (pancakeBNB > returnBNBMin) {
            const tx = await likwidPancakeswap.likwidToPancakeswap(
              poolId,
              ethers.ZeroAddress,
              skyai,
              fee,
              payValue,
              likwidOutMin,
              returnBNBMin,
              { value: sendValue }
            );
            console.log("bnb2SKYAI.likwidToPancakeswap.tx.tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("bnb2SKYAI.likwidToPancakeswap.receipt.status:", receipt?.status);
          } else {
            console.log(
              "bnb2SKYAI.pancakeswapToLikwid.likwidOutMin:",
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
        console.log("bnb2SKYAI.pancakeswapToLikwid.cutCostAmount:", cutCostAmount);
        if (cutCostAmount >= likwidSKYAI) {
          const pancakesOutMin = (pancakeswapResult.amountOut * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
          const likwidBNB = await this.contractService.getAmountOut(poolId, false, pancakesOutMin);

          if (likwidBNB > returnBNBMin) {
            const tx = await likwidPancakeswap.pancakeswapToLikwid(
              ethers.ZeroAddress,
              skyai,
              fee,
              poolId,
              payValue,
              pancakesOutMin,
              returnBNBMin,
              { value: sendValue }
            );
            console.log("bnb2SKYAI.pancakeswapToLikwid.tx.tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("bnb2SKYAI.pancakeswapToLikwid.receipt.status:", receipt?.status);
          } else {
            console.log(
              "bnb2SKYAI.pancakeswapToLikwid.pancakesOutMin:",
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
    console.log("bnb2SKYAI");
  }
}
