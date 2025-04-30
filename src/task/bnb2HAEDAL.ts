import { ethers } from "ethers";
import { ArbitrageWorker, ONE_MILLION } from "../services/arbitrageWorker";

export async function bnb2HAEDAL(worker: ArbitrageWorker) {
  if (worker.chainId == 56) {
    console.log("bnb2HAEDAL.chainId:", worker.chainId);
    const payValue = ethers.parseEther("0.05"); // 0.05 BNB
    const poolId = "0x3f3d74aec65f5e5d53b620e6b092997f9881452a7f8f743a9b9f663c7956b204";
    const fee = 500n;
    const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const haedal = "0x3d9be0ac1001cd81c32464276d863d2ffdca4967";
    const [likwidHAEDAL, pancakeswapResult] = await Promise.all([
      worker.contractService.getAmountOut(poolId, true, payValue),
      worker.contractService.pancakeswapQuoteExactInputSingleV2(wbnb, haedal, payValue, fee),
    ]);
    const totalGas = worker.likwidSwapGas + pancakeswapResult.gasEstimate;
    const gasAmount = await worker.calculateTransactionFee(totalGas);
    console.log(
      "bnb2HAEDAL.likwidHAEDAL:",
      likwidHAEDAL,
      ";pancakeswapResult.amountOut:",
      pancakeswapResult.amountOut,
      ";gasAmount:",
      gasAmount
    );
    const costPPI = (gasAmount * ONE_MILLION) / payValue + 12000n; // 1.2% slipping
    const likwidPancakeswap = worker.contractService.getLikwidPancakeswap();
    const balance = await worker.provider.getBalance(likwidPancakeswap.getAddress());
    const sendValue = payValue > balance ? payValue - balance : 0;
    console.log("bnb2HAEDAL.likwidPancakeswap.balance:", balance, ";sendValue:", sendValue);
    const returnBNBMin = payValue + gasAmount;
    if (likwidHAEDAL > pancakeswapResult.amountOut) {
      const cutCostAmount = (likwidHAEDAL * (ONE_MILLION - costPPI)) / ONE_MILLION;
      console.log("bnb2HAEDAL.likwidToPancakeswap.cutCostAmount:", cutCostAmount);
      if (cutCostAmount > pancakeswapResult.amountOut) {
        const likwidOutMin = (likwidHAEDAL * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
        let pancakeBNB = (
          await worker.contractService.pancakeswapQuoteExactInputSingleV2(haedal, wbnb, likwidOutMin, fee)
        ).amountOut;
        if (pancakeBNB > returnBNBMin) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // sleep 10s
          pancakeBNB = (
            await worker.contractService.pancakeswapQuoteExactInputSingleV2(haedal, wbnb, likwidOutMin, fee)
          ).amountOut;
          if (pancakeBNB < returnBNBMin) {
            console.log(
              "bnb2HAEDAL.pancakeswapToLikwid.likwidOutMin:",
              likwidOutMin,
              ";pancakeBNB:",
              pancakeBNB,
              ";returnBNBMin:",
              returnBNBMin
            );
            return;
          }
          const tx = await likwidPancakeswap.likwidToPancakeswap(
            poolId,
            ethers.ZeroAddress,
            haedal,
            fee,
            payValue,
            likwidOutMin,
            returnBNBMin,
            { value: sendValue, gasLimit: totalGas }
          );
          console.log("bnb2HAEDAL.likwidToPancakeswap.tx.tx:", tx.hash);
          const receipt = await tx.wait();
          console.log("bnb2HAEDAL.likwidToPancakeswap.receipt.status:", receipt?.status);
        } else {
          console.log(
            "bnb2HAEDAL.pancakeswapToLikwid.likwidOutMin:",
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
      console.log("bnb2HAEDAL.pancakeswapToLikwid.cutCostAmount:", cutCostAmount);
      if (cutCostAmount >= likwidHAEDAL) {
        const pancakesOutMin = (pancakeswapResult.amountOut * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
        let likwidBNB = await worker.contractService.getAmountOut(poolId, false, pancakesOutMin);
        if (likwidBNB > returnBNBMin) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // sleep 10s
          likwidBNB = await worker.contractService.getAmountOut(poolId, false, pancakesOutMin);
          if (likwidBNB < returnBNBMin) {
            console.log(
              "bnb2HAEDAL.pancakeswapToLikwid.pancakesOutMin:",
              pancakesOutMin,
              ";likwidBNB:",
              likwidBNB,
              ";returnBNBMin:",
              returnBNBMin
            );
            return;
          }
          const tx = await likwidPancakeswap.pancakeswapToLikwid(
            ethers.ZeroAddress,
            haedal,
            fee,
            poolId,
            payValue,
            pancakesOutMin,
            returnBNBMin,
            { value: sendValue, gasLimit: totalGas }
          );
          console.log("bnb2HAEDAL.pancakeswapToLikwid.tx.tx:", tx.hash);
          const receipt = await tx.wait();
          console.log("bnb2HAEDAL.pancakeswapToLikwid.receipt.status:", receipt?.status);
        } else {
          console.log(
            "bnb2HAEDAL.pancakeswapToLikwid.pancakesOutMin:",
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
  console.log("bnb2HAEDAL");
}
