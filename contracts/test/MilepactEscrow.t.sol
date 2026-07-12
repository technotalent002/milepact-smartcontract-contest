// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MilepactEscrow} from "../src/MilepactEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract MilepactEscrowTest is Test {
    MilepactEscrow internal escrow;
    MockUSDC internal usdc;

    uint256 internal clientPk = 0xA11CE;
    uint256 internal freelancerPk = 0xB0B;
    address internal client;
    address internal freelancer;
    address internal feeRecipient = address(0xFEE);
    address internal random = address(0xCAFE);

    function setUp() public {
        client = vm.addr(clientPk);
        freelancer = vm.addr(freelancerPk);

        escrow = new MilepactEscrow(feeRecipient);
        usdc = new MockUSDC();

        usdc.mint(client, 100_000_000);

        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function _createAndSign(uint256 amount) internal returns (uint256 id) {
        vm.prank(client);
        id = escrow.createAgreement(freelancer, address(usdc), amount, "ipfs://meta", block.timestamp + 2 days);

        bytes32 digest = escrow.getCounterSignDigest(id);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(freelancerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.prank(freelancer);
        escrow.counterSign(id, sig);
    }

    function testCreateAgreement() public {
        vm.prank(client);
        uint256 id = escrow.createAgreement(freelancer, address(usdc), 10_000_000, "ipfs://meta", block.timestamp + 2 days);

        (
            uint256 gotId,
            address gotClient,
            address gotFreelancer,
            address token,
            uint256 amount,
            string memory meta,
            string memory delivery,
            uint256 deadline,
            uint256 deliveredAt,
            MilepactEscrow.State state,
            bool signed
        ) = escrow.agreements(id);
        assertEq(gotId, id);
        assertEq(gotClient, client);
        assertEq(gotFreelancer, freelancer);
        assertEq(token, address(usdc));
        assertEq(amount, 10_000_000);
        assertEq(meta, "ipfs://meta");
        assertEq(bytes(delivery).length, 0);
        assertGt(deadline, block.timestamp);
        assertEq(deliveredAt, 0);
        assertEq(uint256(state), uint256(MilepactEscrow.State.Active));
        assertEq(signed, false);
    }

    function testCounterSignHappyPath() public {
        uint256 id = _createAndSign(10_000_000);
        (,,,,,,,,,, bool signed) = escrow.agreements(id);
        assertTrue(signed);
    }

    function testFundAgreement() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(client);
        escrow.fund(id);

        assertEq(usdc.balanceOf(address(escrow)), 10_000_000);
    }

    function testDeliveryAndReleaseFeeDeduction() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(client);
        escrow.fund(id);

        vm.prank(freelancer);
        escrow.markDelivered(id, "ipfs://delivery");

        vm.prank(client);
        escrow.approveAndRelease(id);

        assertEq(usdc.balanceOf(freelancer), 9_900_000);
        assertEq(usdc.balanceOf(feeRecipient), 100_000);
    }

    function testDisputeBlocksRelease() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(client);
        escrow.fund(id);

        vm.prank(freelancer);
        escrow.markDelivered(id, "ipfs://delivery");

        vm.prank(client);
        escrow.raiseDispute(id);

        vm.prank(client);
        vm.expectRevert("wrong state");
        escrow.approveAndRelease(id);
    }

    function testAutoReleaseAfterTimer() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(client);
        escrow.fund(id);

        vm.prank(freelancer);
        escrow.markDelivered(id, "ipfs://delivery");

        vm.warp(block.timestamp + 8 days);
        escrow.autoRelease(id);

        assertEq(usdc.balanceOf(freelancer), 9_900_000);
    }

    function testOnlyClientCanFund() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(random);
        vm.expectRevert("only client");
        escrow.fund(id);
    }

    function testOnlyFreelancerCanDeliver() public {
        uint256 id = _createAndSign(10_000_000);

        vm.prank(client);
        escrow.fund(id);

        vm.prank(client);
        vm.expectRevert("only freelancer");
        escrow.markDelivered(id, "ipfs://delivery");
    }
}
