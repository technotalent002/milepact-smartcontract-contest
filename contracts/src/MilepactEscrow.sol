// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MilepactEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MessageHashUtils for bytes32;

    enum State {
        Proposed,
        Active,
        Funded,
        Delivered,
        Disputed,
        Released,
        Refunded
    }

    struct Agreement {
        uint256 id;
        address client;
        address freelancer;
        address usdc;
        uint256 amount;
        string metadataHash;
        string deliveryHash;
        uint256 deadline;
        uint256 deliveredAt;
        State state;
        bool counterSigned;
    }

    uint256 public constant FEE_BPS = 100;
    uint256 public immutable reviewPeriod = 7 days;
    address public immutable feeRecipient;
    uint256 public nextAgreementId;

    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount);
    event AgreementCounterSigned(uint256 indexed id, address indexed signer);
    event AgreementFunded(uint256 indexed id, uint256 amount);
    event AgreementDelivered(uint256 indexed id, string deliveryHash);
    event AgreementReleased(uint256 indexed id, uint256 payout, uint256 fee);
    event AgreementDisputed(uint256 indexed id, address indexed by);
    event AgreementRefunded(uint256 indexed id, uint256 amount);

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function createAgreement(
        address freelancer,
        address usdc,
        uint256 amount,
        string calldata metadataHash,
        uint256 deadline
    ) external returns (uint256 id) {
        require(freelancer != address(0), "invalid freelancer");
        require(usdc != address(0), "invalid token");
        require(amount > 0, "invalid amount");

        id = nextAgreementId++;
        agreements[id] = Agreement({
            id: id,
            client: msg.sender,
            freelancer: freelancer,
            usdc: usdc,
            amount: amount,
            metadataHash: metadataHash,
            deliveryHash: "",
            deadline: deadline,
            deliveredAt: 0,
            state: State.Active,
            counterSigned: false
        });

        emit AgreementCreated(id, msg.sender, freelancer, amount);
    }

    function counterSign(uint256 id, bytes calldata signature) external {
        Agreement storage a = agreements[id];
        require(a.client != address(0), "agreement missing");
        require(msg.sender == a.freelancer, "only freelancer");
        require(!a.counterSigned, "already signed");

        bytes32 digest = keccak256(abi.encodePacked(address(this), id, "COUNTERSIGN")).toEthSignedMessageHash();
        address recovered = ECDSA.recover(digest, signature);
        require(recovered != address(0), "bad signature");

        a.counterSigned = true;
        emit AgreementCounterSigned(id, recovered);
    }

    function fund(uint256 id) external nonReentrant {
        Agreement storage a = agreements[id];
        require(msg.sender == a.client, "only client");
        require(a.state == State.Active, "wrong state");
        require(a.counterSigned, "missing countersign");

        IERC20(a.usdc).safeTransferFrom(msg.sender, address(this), a.amount);
        a.state = State.Funded;

        emit AgreementFunded(id, a.amount);
    }

    function markDelivered(uint256 id, string calldata deliveryHash) external {
        Agreement storage a = agreements[id];
        require(msg.sender == a.freelancer, "only freelancer");
        require(a.state == State.Funded, "wrong state");

        a.deliveryHash = deliveryHash;
        a.deliveredAt = block.timestamp;
        a.state = State.Delivered;

        emit AgreementDelivered(id, deliveryHash);
    }

    function approveAndRelease(uint256 id) external nonReentrant {
        Agreement storage a = agreements[id];
        require(msg.sender == a.client, "only client");
        require(a.state == State.Delivered, "wrong state");

        _release(id);
    }

    function autoRelease(uint256 id) external nonReentrant {
        Agreement storage a = agreements[id];
        require(a.state == State.Delivered, "wrong state");
        require(block.timestamp >= a.deliveredAt + reviewPeriod, "review pending");

        _release(id);
    }

    function raiseDispute(uint256 id) external {
        Agreement storage a = agreements[id];
        require(msg.sender == a.client || msg.sender == a.freelancer, "not party");
        require(a.state != State.Released && a.state != State.Refunded, "closed");

        a.state = State.Disputed;
        emit AgreementDisputed(id, msg.sender);
    }

    function clientRefund(uint256 id) external nonReentrant {
        Agreement storage a = agreements[id];
        require(msg.sender == a.client, "only client");
        require(a.state != State.Released, "released");
        require(a.state != State.Disputed, "disputed");

        a.state = State.Refunded;
        IERC20(a.usdc).safeTransfer(a.client, a.amount);

        emit AgreementRefunded(id, a.amount);
    }

    function getCounterSignDigest(uint256 id) external view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), id, "COUNTERSIGN")).toEthSignedMessageHash();
    }

    function _release(uint256 id) internal {
        Agreement storage a = agreements[id];
        uint256 fee = (a.amount * FEE_BPS) / 10_000;
        uint256 payout = a.amount - fee;

        a.state = State.Released;

        IERC20(a.usdc).safeTransfer(feeRecipient, fee);
        IERC20(a.usdc).safeTransfer(a.freelancer, payout);

        emit AgreementReleased(id, payout, fee);
    }
}
