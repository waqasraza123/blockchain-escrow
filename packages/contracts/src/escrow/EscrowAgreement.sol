// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IAgreementProtocolConfig {
    function arbitratorRegistry() external view returns (address);
    function feeVault() external view returns (address);
    function fundingPaused() external view returns (bool);
    function protocolFeeBps() external view returns (uint16);
    function tokenAllowlist() external view returns (address);
}

interface IAgreementTokenAllowlist {
    function isAllowedToken(address token) external view returns (bool);
}

interface IAgreementArbitratorRegistry {
    function isApprovedArbitrator(address arbitrator) external view returns (bool);
}

interface IAgreementErc20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract EscrowAgreement {
    struct AgreementInitialization {
        address protocolConfig;
        address buyer;
        address seller;
        address settlementToken;
        address arbitrator;
        bytes32 dealId;
        bytes32 dealVersionHash;
        uint256 totalAmount;
        uint32 milestoneCount;
        uint256[] milestoneAmounts;
    }

    struct ProtocolSnapshot {
        address tokenAllowlist;
        address arbitratorRegistry;
        address feeVault;
        uint16 protocolFeeBps;
    }

    uint8 private constant MILESTONE_SETTLEMENT_KIND_NONE = 0;
    uint8 private constant MILESTONE_SETTLEMENT_KIND_RELEASED = 1;
    uint8 private constant MILESTONE_SETTLEMENT_KIND_REFUNDED = 2;

    error AlreadyInitialized();
    error AlreadyFunded();
    error AgreementNotFunded();
    error ArbitratorNotApproved(address arbitrator);
    error Erc20TransferFromFailed(address token, address from, address to, uint256 amount);
    error Erc20TransferFailed(address token, address to, uint256 amount);
    error ArbitratorRegistryNotSet();
    error FeeVaultNotSet();
    error FundingPaused();
    error FundingUnauthorized(address caller);
    error IdenticalParties(address buyer, address seller);
    error InvalidMilestoneAmount(uint32 milestonePosition, uint256 amount);
    error InvalidBuyer(address buyer);
    error InvalidDealId(bytes32 dealId);
    error InvalidDealVersionHash(bytes32 dealVersionHash);
    error InvalidMilestoneCount(uint32 milestoneCount);
    error InvalidMilestonePosition(uint32 milestonePosition);
    error InvalidMilestoneAmountsLength(uint256 expectedLength, uint256 actualLength);
    error InvalidProtocolConfig(address protocolConfig);
    error InvalidSeller(address seller);
    error InvalidSettlementToken(address settlementToken);
    error InvalidTotalAmount(uint256 totalAmount);
    error MilestoneAlreadySettled(uint32 milestonePosition);
    error MilestoneAmountsHashMismatch();
    error MilestoneAmountsTotalMismatch(uint256 expectedTotalAmount, uint256 actualTotalAmount);
    error SettlementUnauthorized(address caller);
    error TokenAllowlistNotSet();
    error TokenNotAllowed(address settlementToken);

    event AgreementInitialized(
        bytes32 indexed dealId,
        bytes32 indexed dealVersionHash,
        address indexed factory,
        address protocolConfig,
        address buyer,
        address seller,
        address settlementToken,
        address arbitrator,
        address feeVault,
        uint16 protocolFeeBps,
        uint256 totalAmount,
        uint32 milestoneCount
    );
    event AgreementFunded(
        bytes32 indexed dealId,
        bytes32 indexed dealVersionHash,
        address indexed payer,
        address settlementToken,
        uint256 amount
    );
    event MilestoneRefunded(
        bytes32 indexed dealId,
        bytes32 indexed dealVersionHash,
        uint32 indexed milestonePosition,
        address caller,
        address recipient,
        address settlementToken,
        uint256 amount
    );
    event MilestoneReleased(
        bytes32 indexed dealId,
        bytes32 indexed dealVersionHash,
        uint32 indexed milestonePosition,
        address caller,
        address recipient,
        address settlementToken,
        uint256 amount
    );

    bool public initialized;
    bool public funded;
    address public factory;
    address public protocolConfig;
    address public feeVault;
    address public buyer;
    address public seller;
    address public settlementToken;
    address public arbitrator;
    bytes32 public dealId;
    bytes32 public dealVersionHash;
    bytes32 public milestoneAmountsHash;
    uint256 public totalAmount;
    uint256 public totalRefundedAmount;
    uint256 public totalReleasedAmount;
    uint32 public milestoneCount;
    uint16 public protocolFeeBps;
    uint64 public fundedAt;
    uint64 public initializedAt;
    mapping(uint32 milestonePosition => uint8 settlementKind) private milestoneSettlementKinds;

    function initialize(AgreementInitialization calldata initialization) external {
        if (initialized) {
            revert AlreadyInitialized();
        }

        address protocolConfigAddress = initialization.protocolConfig;
        _validateCoreInitialization(initialization);

        ProtocolSnapshot memory protocolSnapshot = _loadProtocolSnapshot(protocolConfigAddress);
        _validatePolicies(protocolSnapshot, initialization.settlementToken, initialization.arbitrator);

        initialized = true;
        factory = msg.sender;
        protocolConfig = protocolConfigAddress;
        feeVault = protocolSnapshot.feeVault;
        buyer = initialization.buyer;
        seller = initialization.seller;
        settlementToken = initialization.settlementToken;
        arbitrator = initialization.arbitrator;
        dealId = initialization.dealId;
        dealVersionHash = initialization.dealVersionHash;
        milestoneAmountsHash = keccak256(abi.encode(initialization.milestoneAmounts));
        totalAmount = initialization.totalAmount;
        milestoneCount = initialization.milestoneCount;
        protocolFeeBps = protocolSnapshot.protocolFeeBps;
        initializedAt = uint64(block.timestamp);

        emit AgreementInitialized(
            dealId,
            dealVersionHash,
            msg.sender,
            protocolConfigAddress,
            buyer,
            seller,
            settlementToken,
            arbitrator,
            feeVault,
            protocolFeeBps,
            totalAmount,
            milestoneCount
        );
    }

    function fund() external {
        if (msg.sender != factory && msg.sender != buyer) {
            revert FundingUnauthorized(msg.sender);
        }

        if (funded) {
            revert AlreadyFunded();
        }

        if (IAgreementProtocolConfig(protocolConfig).fundingPaused()) {
            revert FundingPaused();
        }

        _safeTransferFrom(settlementToken, buyer, address(this), totalAmount);

        funded = true;
        fundedAt = uint64(block.timestamp);

        emit AgreementFunded(dealId, dealVersionHash, buyer, settlementToken, totalAmount);
    }

    function releaseMilestone(uint32 milestonePosition, uint256[] calldata milestoneAmounts) external {
        uint256 milestoneAmount = _settleMilestone(
            milestonePosition, milestoneAmounts, MILESTONE_SETTLEMENT_KIND_RELEASED
        );

        emit MilestoneReleased(
            dealId,
            dealVersionHash,
            milestonePosition,
            msg.sender,
            seller,
            settlementToken,
            milestoneAmount
        );
    }

    function refundMilestone(uint32 milestonePosition, uint256[] calldata milestoneAmounts) external {
        uint256 milestoneAmount = _settleMilestone(
            milestonePosition, milestoneAmounts, MILESTONE_SETTLEMENT_KIND_REFUNDED
        );

        emit MilestoneRefunded(
            dealId,
            dealVersionHash,
            milestonePosition,
            msg.sender,
            buyer,
            settlementToken,
            milestoneAmount
        );
    }

    function milestoneSettlementKind(uint32 milestonePosition) external view returns (uint8) {
        return milestoneSettlementKinds[milestonePosition];
    }

    function _validateCoreInitialization(AgreementInitialization calldata initialization) private pure {
        if (initialization.protocolConfig == address(0)) {
            revert InvalidProtocolConfig(initialization.protocolConfig);
        }

        if (initialization.buyer == address(0)) {
            revert InvalidBuyer(initialization.buyer);
        }

        if (initialization.seller == address(0)) {
            revert InvalidSeller(initialization.seller);
        }

        if (initialization.buyer == initialization.seller) {
            revert IdenticalParties(initialization.buyer, initialization.seller);
        }

        if (initialization.settlementToken == address(0)) {
            revert InvalidSettlementToken(initialization.settlementToken);
        }

        if (initialization.dealId == bytes32(0)) {
            revert InvalidDealId(initialization.dealId);
        }

        if (initialization.dealVersionHash == bytes32(0)) {
            revert InvalidDealVersionHash(initialization.dealVersionHash);
        }

        if (initialization.totalAmount == 0) {
            revert InvalidTotalAmount(initialization.totalAmount);
        }

        if (initialization.milestoneCount == 0) {
            revert InvalidMilestoneCount(initialization.milestoneCount);
        }

        if (initialization.milestoneAmounts.length != initialization.milestoneCount) {
            revert InvalidMilestoneAmountsLength(
                initialization.milestoneCount, initialization.milestoneAmounts.length
            );
        }

        uint256 milestoneAmountTotal;
        for (uint256 index = 0; index < initialization.milestoneAmounts.length; ++index) {
            uint256 milestoneAmount = initialization.milestoneAmounts[index];
            if (milestoneAmount == 0) {
                revert InvalidMilestoneAmount(uint32(index + 1), milestoneAmount);
            }

            milestoneAmountTotal += milestoneAmount;
        }

        if (milestoneAmountTotal != initialization.totalAmount) {
            revert MilestoneAmountsTotalMismatch(initialization.totalAmount, milestoneAmountTotal);
        }
    }

    function _loadProtocolSnapshot(address protocolConfigAddress)
        private
        view
        returns (ProtocolSnapshot memory snapshot)
    {
        snapshot.tokenAllowlist = IAgreementProtocolConfig(protocolConfigAddress).tokenAllowlist();
        if (snapshot.tokenAllowlist == address(0)) {
            revert TokenAllowlistNotSet();
        }

        snapshot.arbitratorRegistry = IAgreementProtocolConfig(protocolConfigAddress).arbitratorRegistry();
        if (snapshot.arbitratorRegistry == address(0)) {
            revert ArbitratorRegistryNotSet();
        }

        snapshot.feeVault = IAgreementProtocolConfig(protocolConfigAddress).feeVault();
        if (snapshot.feeVault == address(0)) {
            revert FeeVaultNotSet();
        }

        snapshot.protocolFeeBps = IAgreementProtocolConfig(protocolConfigAddress).protocolFeeBps();
    }

    function _validatePolicies(
        ProtocolSnapshot memory protocolSnapshot,
        address settlementTokenAddress,
        address arbitratorAddress
    ) private view {
        if (!IAgreementTokenAllowlist(protocolSnapshot.tokenAllowlist).isAllowedToken(settlementTokenAddress)) {
            revert TokenNotAllowed(settlementTokenAddress);
        }

        if (
            arbitratorAddress != address(0)
                && !IAgreementArbitratorRegistry(protocolSnapshot.arbitratorRegistry).isApprovedArbitrator(arbitratorAddress)
        ) {
            revert ArbitratorNotApproved(arbitratorAddress);
        }
    }

    function _settleMilestone(uint32 milestonePosition, uint256[] calldata milestoneAmounts, uint8 settlementKind)
        private
        returns (uint256 milestoneAmount)
    {
        if (!funded) {
            revert AgreementNotFunded();
        }

        if (msg.sender != buyer) {
            revert SettlementUnauthorized(msg.sender);
        }

        if (milestonePosition == 0 || milestonePosition > milestoneCount) {
            revert InvalidMilestonePosition(milestonePosition);
        }

        if (milestoneSettlementKinds[milestonePosition] != MILESTONE_SETTLEMENT_KIND_NONE) {
            revert MilestoneAlreadySettled(milestonePosition);
        }

        milestoneAmount = _resolveMilestoneAmount(milestonePosition, milestoneAmounts);
        milestoneSettlementKinds[milestonePosition] = settlementKind;

        if (settlementKind == MILESTONE_SETTLEMENT_KIND_RELEASED) {
            totalReleasedAmount += milestoneAmount;
            _safeTransfer(settlementToken, seller, milestoneAmount);
        } else {
            totalRefundedAmount += milestoneAmount;
            _safeTransfer(settlementToken, buyer, milestoneAmount);
        }
    }

    function _resolveMilestoneAmount(uint32 milestonePosition, uint256[] calldata milestoneAmounts)
        private
        view
        returns (uint256)
    {
        if (milestoneAmounts.length != milestoneCount) {
            revert InvalidMilestoneAmountsLength(milestoneCount, milestoneAmounts.length);
        }

        if (keccak256(abi.encode(milestoneAmounts)) != milestoneAmountsHash) {
            revert MilestoneAmountsHashMismatch();
        }

        uint256 milestoneAmount = milestoneAmounts[milestonePosition - 1];
        if (milestoneAmount == 0) {
            revert InvalidMilestoneAmount(milestonePosition, milestoneAmount);
        }

        return milestoneAmount;
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory returnData) =
            token.call(abi.encodeCall(IAgreementErc20.transfer, (to, amount)));

        if (!success || (returnData.length != 0 && !abi.decode(returnData, (bool)))) {
            revert Erc20TransferFailed(token, to, amount);
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory returnData) =
            token.call(abi.encodeCall(IAgreementErc20.transferFrom, (from, to, amount)));

        if (!success || (returnData.length != 0 && !abi.decode(returnData, (bool)))) {
            revert Erc20TransferFromFailed(token, from, to, amount);
        }
    }
}
