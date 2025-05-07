//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolId} from "./PoolId.sol";

using PoolIdLibrary for PoolKey global;

struct PoolKey {
    /// @notice The lower currency of the pool, sorted numerically
    address currency0;
    /// @notice The higher currency of the pool, sorted numerically
    address currency1;
    /// @notice The pool LP fee, capped at 1_000_000. If the highest bit is 1, the pool has a dynamic fee and must be exactly equal to 0x800000
    uint24 fee;
    /// @notice Ticks that involve positions must be a multiple of tick spacing
    int24 tickSpacing;
    /// @notice The hooks of the pool
    address hooks;
}

/// @notice Library for computing the ID of a pool
library PoolIdLibrary {
    /// @notice Returns value equal to keccak256(abi.encode(poolKey))
    function toId(PoolKey memory poolKey) internal pure returns (PoolId poolId) {
        assembly ("memory-safe") {
            // 0xa0 represents the total size of the poolKey struct (5 slots of 32 bytes)
            poolId := keccak256(poolKey, 0xa0)
        }
    }
}
