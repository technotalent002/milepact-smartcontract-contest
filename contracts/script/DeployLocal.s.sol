// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MilepactEscrow} from "../src/MilepactEscrow.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";

contract DeployLocalScript is Script {
    function run() external returns (MockUSDC usdc, MilepactEscrow escrow) {
        uint256 deployerPk = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address feeRecipient = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address client = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address freelancer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

        vm.startBroadcast(deployerPk);
        usdc = new MockUSDC();
        escrow = new MilepactEscrow(feeRecipient);
        usdc.mint(client, 100_000_000_000); // 100,000 USDC (6 decimals)
        usdc.mint(freelancer, 50_000_000_000); // 50,000 USDC (6 decimals)
        vm.stopBroadcast();

        console2.log("USDC_ADDRESS", address(usdc));
        console2.log("ESCROW_ADDRESS", address(escrow));
        console2.log("CLIENT_ADDRESS", client);
        console2.log("FREELANCER_ADDRESS", freelancer);
    }
}
