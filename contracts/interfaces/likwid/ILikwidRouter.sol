//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SwapParams} from "../../libraries/likwid/SwapParams.sol";

interface ILikwidRouter {
    function exactInput(SwapParams calldata params) external payable returns (uint256 amountOut);
}
