// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolId} from "../libraries/likwid/PoolId.sol";

interface ILikwidPancakeswap {
    function likwidToPancakeswap(
        PoolId poolId,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 likwidIn,
        uint256 likwidOutMin,
        uint256 pancakesOutMin
    ) external payable returns (uint256 likwidOut, uint256 pancakesOut);

    function pancakeswapToLikwid(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        PoolId poolId,
        uint256 pancakesIn,
        uint256 pancakesOutMin,
        uint256 likwidOutMin
    ) external payable returns (uint256 pancakesOut, uint256 likwidOut);
}
