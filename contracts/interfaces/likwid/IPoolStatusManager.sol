//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolId} from "../../libraries/likwid/PoolId.sol";
import {PoolStatus} from "../../libraries/likwid/PoolStatus.sol";

interface IPoolStatusManager {
    function getStatus(PoolId poolId) external view returns (PoolStatus memory _status);

    function getAmountOut(PoolStatus memory status, bool zeroForOne, uint256 amountIn)
        external
        view
        returns (uint256 amountOut, uint24 fee, uint256 feeAmount);
}
