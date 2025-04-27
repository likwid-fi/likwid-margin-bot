//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolId} from "./PoolId.sol";

struct SwapParams {
    PoolId poolId;
    bool zeroForOne;
    address to;
    uint256 amountIn;
    uint256 amountOutMin;
    uint256 amountOut;
    uint256 deadline;
}
