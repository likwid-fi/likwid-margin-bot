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

    function _swap(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMin)
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
        bytes memory commands;
        bytes[] memory inputs = new bytes[](1);
        if (fee > 0) {
            commands = abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN)));
            bytes memory path = abi.encodePacked(_tokenIn, fee, _tokenOut);
            inputs[0] = abi.encode(ActionConstants.MSG_SENDER, amountIn, amountOutMin, path, false);
        } else {
            commands = abi.encodePacked(bytes1(uint8(Commands.V2_SWAP_EXACT_IN)));
            address[] memory path = new address[](2);
            path[0] = _tokenIn;
            path[1] = _tokenOut;
            inputs[0] = abi.encode(ActionConstants.MSG_SENDER, amountIn, amountOutMin, path, false);
        }

        IERC20(_tokenIn).safeTransfer(address(universalRouter), amountIn);
        universalRouter.execute(commands, inputs, block.timestamp + 100);
        amountOut = IERC20(_tokenOut).balanceOf(address(this)) - startBalance;
        if (amountOutMin > 0) {
            require(amountOut >= amountOutMin, "InsufficientAmountOut");
        }
        _withdraw(tokenOut, amountOut);
    }

    function swap(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint256 amountOutMin)
        external
        payable
        onlyCaller
        returns (uint256 amountOut)
    {
        amountOut = _swap(tokenIn, tokenOut, fee, amountIn, amountOutMin);
    }

    function likwidToPancakeswap(
        PoolId poolId,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 likwidIn,
        uint256 likwidOutMin,
        uint256 pancakesOutMin
    ) external payable onlyCaller returns (uint256 likwidOut, uint256 pancakesOut) {
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
        pancakesOut = _swap(tokenOut, tokenIn, fee, likwidOut, pancakesOutMin);
        if (pancakesOutMin > 0) {
            require(pancakesOut >= pancakesOutMin, "InsufficientPancakesOutMin");
        }
    }

    function pancakeswapToLikwid(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        PoolId poolId,
        uint256 pancakesIn,
        uint256 pancakesOutMin,
        uint256 likwidOutMin
    ) external payable onlyCaller returns (uint256 pancakesOut, uint256 likwidOut) {
        pancakesOut = _swap(tokenIn, tokenOut, fee, pancakesIn, pancakesOutMin);
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
        if (likwidOutMin > 0) {
            require(likwidOut >= likwidOutMin, "InsufficientLikwidOut");
        }
    }
}
