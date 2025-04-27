// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "./external/IERC20.sol";
import {SafeERC20} from "./external/SafeERC20.sol";
import {LikwidBase} from "./LikwidBase.sol";
import {IUniversalRouter} from "./interfaces/pancakeswap/IUniversalRouter.sol";
import {Commands} from "./libraries/pancakeswap/Commands.sol";
import {ActionConstants} from "./libraries/pancakeswap/ActionConstants.sol";
import {ILikwidRouter} from "./interfaces/likwid/ILikwidRouter.sol";
import {PoolId} from "./libraries/likwid/PoolId.sol";
import {SwapParams} from "./libraries/likwid/SwapParams.sol";

contract LikwidPancakeswap is LikwidBase {
    using SafeERC20 for IERC20;

    IUniversalRouter public immutable universalRouter;

    constructor(address initialOwner, address _wrapNative, ILikwidRouter _likwidRouter, IUniversalRouter router)
        LikwidBase(initialOwner, _wrapNative, _likwidRouter)
    {
        universalRouter = router;
    }

    function _swapV3(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMin)
        internal
        returns (uint256 amountOut)
    {
        _deposit(tokenIn, amountIn);
        address _tokenIn = tokenIn;
        if (tokenIn == address(0)) {
            _tokenIn = wrapNative;
        }
        address _tokenOut = tokenOut;
        if (tokenOut == address(0)) {
            _tokenOut = wrapNative;
        }
        require(_tokenIn != _tokenOut, "PAIR_ERROR");
        uint256 startBalance = IERC20(_tokenOut).balanceOf(address(this));
        bytes memory commands = abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN)));
        bytes memory path = abi.encodePacked(_tokenIn, fee, _tokenOut);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(ActionConstants.MSG_SENDER, amountIn, amountOutMin, path, false);
        IERC20(_tokenIn).safeTransfer(address(universalRouter), amountIn);
        universalRouter.execute(commands, inputs, block.timestamp + 100);
        amountOut = IERC20(_tokenOut).balanceOf(address(this)) - startBalance;
        if (amountOutMin > 0) {
            require(amountOut >= amountOutMin, "InsufficientAmountOut");
        }
        _withdraw(tokenOut, amountOut);
    }

    function swapV3(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMin)
        external
        payable
        onlyOwner
        returns (uint256 amountOut)
    {
        amountOut = _swapV3(tokenIn, tokenOut, fee, amountIn, amountOutMin);
    }

    function likwidToPancakeswap(
        PoolId poolId,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 likwidIn,
        uint256 likwidOutMin,
        uint256 pancakesOutMin
    ) external payable returns (uint256 likwidOut, uint256 pancakesOut) {
        SwapParams memory swapParams = SwapParams({
            poolId: poolId,
            zeroForOne: tokenIn < tokenOut,
            to: address(this),
            amountIn: likwidIn,
            amountOutMin: likwidOutMin,
            amountOut: 0,
            deadline: block.timestamp + 100
        });
        uint256 sendValue;
        if (tokenIn == address(0)) {
            sendValue = likwidIn;
        } else {
            IERC20(tokenIn).forceApprove(address(likwidRouter), likwidIn);
        }
        likwidOut = likwidRouter.exactInput{value: sendValue}(swapParams);
        pancakesOut = _swapV3(tokenOut, tokenIn, fee, likwidOut, pancakesOutMin);
    }

    function pancakeswapToLikwid(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        PoolId poolId,
        uint256 pancakesIn,
        uint256 pancakesOutMin,
        uint256 likwidOutMin
    ) external payable returns (uint256 pancakesOut, uint256 likwidOut) {
        pancakesOut = _swapV3(tokenIn, tokenOut, fee, pancakesIn, pancakesOutMin);
        uint256 sendValue;
        if (tokenOut == address(0)) {
            sendValue = pancakesOut;
        } else {
            IERC20(tokenOut).forceApprove(address(likwidRouter), pancakesOut);
        }
        SwapParams memory swapParams = SwapParams({
            poolId: poolId,
            zeroForOne: tokenOut < tokenIn,
            to: address(this),
            amountIn: pancakesOut,
            amountOutMin: likwidOutMin,
            amountOut: 0,
            deadline: block.timestamp + 100
        });
        likwidOut = likwidRouter.exactInput{value: sendValue}(swapParams);
    }
}
