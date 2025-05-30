// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {LikwidPancakeswap} from "../contracts/LikwidPancakeswap.sol";
import {ILikwidRouter} from "../contracts/interfaces/likwid/ILikwidRouter.sol";
import {IUniversalRouter} from "../contracts/interfaces/pancakeswap/IUniversalRouter.sol";

contract DeployScript is Script {
    LikwidPancakeswap public pancakeswap;

    function setUp() public {}

    function run(uint256 chainId) public {
        vm.startBroadcast();
        if (chainId == 56) {
            ILikwidRouter likwidRouter = ILikwidRouter(0xc1A470BA1161257cb05d95EbA0f4E5D9e5eB0A3D);
            IUniversalRouter router = IUniversalRouter(0x1A0A18AC4BECDDbd6389559687d1A73d8927E416);
            address wbnb = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
            pancakeswap = new LikwidPancakeswap(msg.sender, wbnb, likwidRouter, router);
            console.log("pancakeswap:", address(pancakeswap));
        }

        vm.stopBroadcast();
    }
}
