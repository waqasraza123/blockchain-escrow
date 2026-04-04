// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";

contract EscrowAgreementActor {
    function initialize(EscrowAgreement agreement, EscrowAgreement.AgreementInitialization calldata initialization)
        external
    {
        agreement.initialize(initialization);
    }
}

contract EscrowAgreementTest {
    EscrowAgreement private agreement;
    EscrowAgreementActor private factoryActor;
    ProtocolConfig private protocolConfig;
    TokenAllowlist private tokenAllowlist;
    ArbitratorRegistry private arbitratorRegistry;
    FeeVault private feeVault;

    address private constant BUYER = address(0x4001);
    address private constant SELLER = address(0x4002);
    address private constant SETTLEMENT_TOKEN = address(0x4003);
    address private constant ARBITRATOR = address(0x4004);
    address private constant UNAPPROVED_ARBITRATOR = address(0x4005);
    bytes32 private constant DEAL_ID = keccak256("deal-1");
    bytes32 private constant DEAL_VERSION_HASH = keccak256("deal-version-1");
    uint256 private constant TOTAL_AMOUNT = 1_500_000;
    uint32 private constant MILESTONE_COUNT = 3;
    uint16 private constant PROTOCOL_FEE_BPS = 250;

    function setUp() public {
        agreement = new EscrowAgreement();
        factoryActor = new EscrowAgreementActor();
        protocolConfig = new ProtocolConfig();
        tokenAllowlist = new TokenAllowlist();
        arbitratorRegistry = new ArbitratorRegistry();
        feeVault = new FeeVault();

        tokenAllowlist.setTokenAllowed(SETTLEMENT_TOKEN, true);
        arbitratorRegistry.setArbitratorApproved(ARBITRATOR, true);
        protocolConfig.setTokenAllowlist(address(tokenAllowlist));
        protocolConfig.setArbitratorRegistry(address(arbitratorRegistry));
        protocolConfig.setFeeVault(address(feeVault));
        protocolConfig.setTreasury(address(0x4999));
        protocolConfig.setProtocolFeeBps(PROTOCOL_FEE_BPS);
    }

    function testInitializesImmutableAgreementSnapshot() external {
        factoryActor.initialize(agreement, _defaultInitialization());

        require(agreement.initialized(), "agreement not initialized");
        require(agreement.factory() == address(factoryActor), "factory mismatch");
        require(agreement.protocolConfig() == address(protocolConfig), "protocol config mismatch");
        require(agreement.feeVault() == address(feeVault), "fee vault mismatch");
        require(agreement.buyer() == BUYER, "buyer mismatch");
        require(agreement.seller() == SELLER, "seller mismatch");
        require(agreement.settlementToken() == SETTLEMENT_TOKEN, "settlement token mismatch");
        require(agreement.arbitrator() == ARBITRATOR, "arbitrator mismatch");
        require(agreement.dealId() == DEAL_ID, "deal id mismatch");
        require(agreement.dealVersionHash() == DEAL_VERSION_HASH, "deal version hash mismatch");
        require(agreement.totalAmount() == TOTAL_AMOUNT, "total amount mismatch");
        require(agreement.milestoneCount() == MILESTONE_COUNT, "milestone count mismatch");
        require(agreement.protocolFeeBps() == PROTOCOL_FEE_BPS, "protocol fee mismatch");
        require(agreement.initializedAt() > 0, "initialized at mismatch");
    }

    function testSupportsOptionalArbitratorWhenRegistryExists() external {
        EscrowAgreement.AgreementInitialization memory initialization = _defaultInitialization();
        initialization.arbitrator = address(0);

        factoryActor.initialize(agreement, initialization);

        require(agreement.arbitrator() == address(0), "optional arbitrator mismatch");
    }

    function testSnapshotsFeeVaultAndProtocolFeeFromInitializationTime() external {
        factoryActor.initialize(agreement, _defaultInitialization());

        FeeVault nextFeeVault = new FeeVault();
        protocolConfig.setFeeVault(address(nextFeeVault));
        protocolConfig.setProtocolFeeBps(500);

        require(agreement.feeVault() == address(feeVault), "fee vault snapshot changed");
        require(agreement.protocolFeeBps() == PROTOCOL_FEE_BPS, "protocol fee snapshot changed");
    }

    function testRejectsRepeatedInitialization() external {
        factoryActor.initialize(agreement, _defaultInitialization());

        _expectCustomError(_callInitialize(_defaultInitialization()), EscrowAgreement.AlreadyInitialized.selector);
    }

    function testRejectsInvalidInitializationFields() external {
        EscrowAgreement.AgreementInitialization memory initialization = _defaultInitialization();

        initialization.protocolConfig = address(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidProtocolConfig.selector);

        initialization = _defaultInitialization();
        initialization.buyer = address(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidBuyer.selector);

        initialization = _defaultInitialization();
        initialization.seller = address(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidSeller.selector);

        initialization = _defaultInitialization();
        initialization.seller = BUYER;
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.IdenticalParties.selector);

        initialization = _defaultInitialization();
        initialization.settlementToken = address(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidSettlementToken.selector);

        initialization = _defaultInitialization();
        initialization.dealId = bytes32(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidDealId.selector);

        initialization = _defaultInitialization();
        initialization.dealVersionHash = bytes32(0);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidDealVersionHash.selector);

        initialization = _defaultInitialization();
        initialization.totalAmount = 0;
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidTotalAmount.selector);

        initialization = _defaultInitialization();
        initialization.milestoneCount = 0;
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.InvalidMilestoneCount.selector);
    }

    function testRejectsTokenAndArbitratorPolicyViolations() external {
        EscrowAgreement.AgreementInitialization memory initialization = _defaultInitialization();
        initialization.settlementToken = address(0x4555);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.TokenNotAllowed.selector);

        initialization = _defaultInitialization();
        initialization.arbitrator = UNAPPROVED_ARBITRATOR;
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.ArbitratorNotApproved.selector);
    }

    function testRejectsMissingProtocolDependencies() external {
        ProtocolConfig missingTokenAllowlistConfig = new ProtocolConfig();
        missingTokenAllowlistConfig.setArbitratorRegistry(address(arbitratorRegistry));
        missingTokenAllowlistConfig.setFeeVault(address(feeVault));

        EscrowAgreement.AgreementInitialization memory initialization = _defaultInitialization();
        initialization.protocolConfig = address(missingTokenAllowlistConfig);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.TokenAllowlistNotSet.selector);

        ProtocolConfig missingArbitratorRegistryConfig = new ProtocolConfig();
        missingArbitratorRegistryConfig.setTokenAllowlist(address(tokenAllowlist));
        missingArbitratorRegistryConfig.setFeeVault(address(feeVault));

        initialization = _defaultInitialization();
        initialization.protocolConfig = address(missingArbitratorRegistryConfig);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.ArbitratorRegistryNotSet.selector);

        ProtocolConfig missingFeeVaultConfig = new ProtocolConfig();
        missingFeeVaultConfig.setTokenAllowlist(address(tokenAllowlist));
        missingFeeVaultConfig.setArbitratorRegistry(address(arbitratorRegistry));

        initialization = _defaultInitialization();
        initialization.protocolConfig = address(missingFeeVaultConfig);
        _expectCustomError(_callInitialize(initialization), EscrowAgreement.FeeVaultNotSet.selector);
    }

    function _defaultInitialization() private view returns (EscrowAgreement.AgreementInitialization memory) {
        return EscrowAgreement.AgreementInitialization({
            protocolConfig: address(protocolConfig),
            buyer: BUYER,
            seller: SELLER,
            settlementToken: SETTLEMENT_TOKEN,
            arbitrator: ARBITRATOR,
            dealId: DEAL_ID,
            dealVersionHash: DEAL_VERSION_HASH,
            totalAmount: TOTAL_AMOUNT,
            milestoneCount: MILESTONE_COUNT
        });
    }

    function _callInitialize(EscrowAgreement.AgreementInitialization memory initialization)
        private
        returns (bytes memory)
    {
        try this.callInitialize(initialization) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _expectCustomError(bytes memory reason, bytes4 selector) private pure {
        require(reason.length >= 4, "revert reason too short");

        bytes4 actualSelector;
        assembly {
            actualSelector := mload(add(reason, 32))
        }

        require(actualSelector == selector, "unexpected custom error");
    }

    function callInitialize(EscrowAgreement.AgreementInitialization calldata initialization) external {
        agreement.initialize(initialization);
    }
}
