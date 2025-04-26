// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "./external/IERC20.sol";
import {SafeERC20} from "./external/SafeERC20.sol";
import {Owned} from "./external/Owned.sol";
import {IWrapNative} from "./interfaces/IWrapNative.sol";

contract LikwidBase is Owned {
    using SafeERC20 for IERC20;

    address public immutable wrapNative;

    constructor(address initialOwner, address _wrapNative) Owned(initialOwner) {
        wrapNative = _wrapNative;
    }

    function safeTransferETH(address to, uint256 amount) internal {
        bool success;

        /// @solidity memory-safe-assembly
        assembly {
            // Transfer the ETH and store if it succeeded or not.
            success := call(gas(), to, amount, 0, 0, 0, 0)
        }

        require(success, "ETH_TRANSFER_FAILED");
    }

    function _deposit(address currency, uint256 amount) internal {
        if (currency == address(0)) {
            IWrapNative(wrapNative).deposit{value: amount}();
        }
    }

    function _withdraw(address currency, uint256 amount) internal {
        if (currency == address(0)) {
            IWrapNative(wrapNative).withdraw(amount);
        }
    }

    function withdraw(address currency, uint256 amount) external onlyOwner {
        if (currency == address(0)) {
            safeTransferETH(msg.sender, amount);
        } else {
            IERC20(currency).safeTransfer(msg.sender, amount);
        }
    }

    /// @notice To receive ETH from WETH and NFT protocols
    receive() external payable {}
}
