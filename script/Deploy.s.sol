// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {LikwidUniswap} from "../contracts/LikwidUniswap.sol";

contract DeployScript is Script {
    LikwidUniswap public counter;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        counter = new LikwidUniswap();

        vm.stopBroadcast();
    }
}
