// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IAgreementProtocolConfig {
    function arbitratorRegistry() external view returns (address);
    function feeVault() external view returns (address);
    function protocolFeeBps() external view returns (uint16);
    function tokenAllowlist() external view returns (address);
}

interface IAgreementTokenAllowlist {
    function isAllowedToken(address token) external view returns (bool);
}

interface IAgreementArbitratorRegistry {
    function isApprovedArbitrator(address arbitrator) external view returns (bool);
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
    }

    struct ProtocolSnapshot {
        address tokenAllowlist;
        address arbitratorRegistry;
        address feeVault;
        uint16 protocolFeeBps;
    }

    error AlreadyInitialized();
    error ArbitratorNotApproved(address arbitrator);
    error ArbitratorRegistryNotSet();
    error FeeVaultNotSet();
    error IdenticalParties(address buyer, address seller);
    error InvalidBuyer(address buyer);
    error InvalidDealId(bytes32 dealId);
    error InvalidDealVersionHash(bytes32 dealVersionHash);
    error InvalidMilestoneCount(uint32 milestoneCount);
    error InvalidProtocolConfig(address protocolConfig);
    error InvalidSeller(address seller);
    error InvalidSettlementToken(address settlementToken);
    error InvalidTotalAmount(uint256 totalAmount);
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

    bool public initialized;
    address public factory;
    address public protocolConfig;
    address public feeVault;
    address public buyer;
    address public seller;
    address public settlementToken;
    address public arbitrator;
    bytes32 public dealId;
    bytes32 public dealVersionHash;
    uint256 public totalAmount;
    uint32 public milestoneCount;
    uint16 public protocolFeeBps;
    uint64 public initializedAt;

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
}
