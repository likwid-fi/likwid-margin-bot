import { ethers } from "ethers";
import { ArbitrageWorker, ONE_MILLION } from "../services/arbitrageWorker";

export async function bnb2Token(worker: ArbitrageWorker, poolId: string, token: string) {
  if (worker.chainId == 56) {
    console.log("bnb2Token.chainId:", worker.chainId, ",token:", token);
    const payValue = ethers.parseEther("0.05"); // 0.05 BNB
    const fee = 10000n;
    const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const likwidToken = await worker.contractService.getAmountOut(poolId, true, payValue);
    console.log("likwidToken:", likwidToken);
    const pancakeswapResult = await worker.contractService.pancakeswapQuoteExactInputSingleV2(
      wbnb,
      token,
      payValue,
      fee
    );
    console.log("pancakeswapResult:", pancakeswapResult);
    const totalGas = worker.likwidSwapGas + pancakeswapResult.gasEstimate;
    const gasAmount = await worker.calculateTransactionFee(totalGas);
    console.log(
      "bnb2Token.likwidToken:",
      likwidToken,
      ";pancakeswapResult.amountOut:",
      pancakeswapResult.amountOut,
      ";gasAmount:",
      gasAmount
    );
    const costPPI = (gasAmount * ONE_MILLION) / payValue + 12000n; // 1.2% slipping
    const likwidPancakeswap = worker.contractService.getLikwidPancakeswap();
    const balance = await worker.provider.getBalance(likwidPancakeswap.getAddress());
    const sendValue = payValue > balance ? payValue - balance : 0;
    console.log("bnb2Token.likwidPancakeswap.balance:", balance, ";sendValue:", sendValue);
    const returnBNBMin = payValue + gasAmount;
    if (likwidToken > pancakeswapResult.amountOut) {
      const cutCostAmount = (likwidToken * (ONE_MILLION - costPPI)) / ONE_MILLION;
      console.log("bnb2Token.likwidToPancakeswap.cutCostAmount:", cutCostAmount);
      if (cutCostAmount > pancakeswapResult.amountOut) {
        const likwidOutMin = (likwidToken * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
        let pancakeBNB = (
          await worker.contractService.pancakeswapQuoteExactInputSingleV2(token, wbnb, likwidOutMin, fee)
        ).amountOut;
        if (pancakeBNB > returnBNBMin) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // sleep 10s
          pancakeBNB = (await worker.contractService.pancakeswapQuoteExactInputSingleV2(token, wbnb, likwidOutMin, fee))
            .amountOut;
          if (pancakeBNB < returnBNBMin) {
            console.log(
              "bnb2Token.pancakeswapToLikwid.likwidOutMin:",
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
            token,
            fee,
            payValue,
            likwidOutMin,
            returnBNBMin,
            { value: sendValue, gasLimit: totalGas }
          );
          console.log("bnb2Token.likwidToPancakeswap.tx.tx:", tx.hash);
          const receipt = await tx.wait();
          console.log("bnb2Token.likwidToPancakeswap.receipt.status:", receipt?.status);
        } else {
          console.log(
            "bnb2Token.pancakeswapToLikwid.likwidOutMin:",
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
      console.log("bnb2Token.pancakeswapToLikwid.cutCostAmount:", cutCostAmount);
      if (cutCostAmount >= likwidToken) {
        const pancakesOutMin = (pancakeswapResult.amountOut * (ONE_MILLION - 3000n)) / ONE_MILLION; // 0.3% slipping
        let likwidBNB = await worker.contractService.getAmountOut(poolId, false, pancakesOutMin);
        if (likwidBNB > returnBNBMin) {
          await new Promise((resolve) => setTimeout(resolve, 10000)); // sleep 10s
          likwidBNB = await worker.contractService.getAmountOut(poolId, false, pancakesOutMin);
          if (likwidBNB < returnBNBMin) {
            console.log(
              "bnb2Token.pancakeswapToLikwid.pancakesOutMin:",
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
            token,
            fee,
            poolId,
            payValue,
            pancakesOutMin,
            returnBNBMin,
            { value: sendValue, gasLimit: totalGas }
          );
          console.log("bnb2Token.pancakeswapToLikwid.tx.tx:", tx.hash);
          const receipt = await tx.wait();
          console.log("bnb2Token.pancakeswapToLikwid.receipt.status:", receipt?.status);
        } else {
          console.log(
            "bnb2Token.pancakeswapToLikwid.pancakesOutMin:",
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
  console.log("bnb2Token");
}
