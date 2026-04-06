// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";

contract MockFundingErc20 {
    mapping(address owner => mapping(address spender => uint256 allowanceAmount)) private allowances;
    mapping(address account => uint256 balance) private balances;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function mint(address account, uint256 amount) external {
        balances[account] += amount;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 availableAllowance = allowances[from][msg.sender];
        uint256 availableBalance = balances[from];

        require(availableAllowance >= amount, "insufficient allowance");
        require(availableBalance >= amount, "insufficient balance");

        allowances[from][msg.sender] = availableAllowance - amount;
        balances[from] = availableBalance - amount;
        balances[to] += amount;

        return true;
    }
}

contract FalseReturningTransferFromErc20 {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

contract EscrowAgreementActor {
    function initialize(EscrowAgreement agreement, EscrowAgreement.AgreementInitialization calldata initialization)
        external
    {
        agreement.initialize(initialization);
    }

    function fund(EscrowAgreement agreement) external {
        agreement.fund();
    }

    function approve(MockFundingErc20 token, address spender, uint256 amount) external {
        token.approve(spender, amount);
    }
}

contract EscrowAgreementTest {
    EscrowAgreement private agreement;
    EscrowAgreementActor private factoryActor;
    ProtocolConfig private protocolConfig;
    TokenAllowlist private tokenAllowlist;
    ArbitratorRegistry private arbitratorRegistry;
    FeeVault private feeVault;
    MockFundingErc20 private fundingToken;
    FalseReturningTransferFromErc20 private falseReturningToken;

    address private buyerAddress;
    address private constant SELLER = address(0x4002);
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
        buyerAddress = address(factoryActor);
        protocolConfig = new ProtocolConfig();
        tokenAllowlist = new TokenAllowlist();
        arbitratorRegistry = new ArbitratorRegistry();
        feeVault = new FeeVault();
        fundingToken = new MockFundingErc20();
        falseReturningToken = new FalseReturningTransferFromErc20();

        tokenAllowlist.setTokenAllowed(address(fundingToken), true);
        tokenAllowlist.setTokenAllowed(address(falseReturningToken), true);
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
        require(agreement.buyer() == buyerAddress, "buyer mismatch");
        require(agreement.seller() == SELLER, "seller mismatch");
        require(agreement.settlementToken() == address(fundingToken), "settlement token mismatch");
        require(agreement.arbitrator() == ARBITRATOR, "arbitrator mismatch");
        require(agreement.dealId() == DEAL_ID, "deal id mismatch");
        require(agreement.dealVersionHash() == DEAL_VERSION_HASH, "deal version hash mismatch");
        require(agreement.totalAmount() == TOTAL_AMOUNT, "total amount mismatch");
        require(agreement.milestoneCount() == MILESTONE_COUNT, "milestone count mismatch");
        require(agreement.protocolFeeBps() == PROTOCOL_FEE_BPS, "protocol fee mismatch");
        require(!agreement.funded(), "funded mismatch");
        require(agreement.fundedAt() == 0, "funded at mismatch");
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

    function testBuyerCanFundAgreementAfterInitialization() external {
        factoryActor.initialize(agreement, _defaultInitialization());
        fundingToken.mint(address(factoryActor), TOTAL_AMOUNT);
        factoryActor.approve(fundingToken, address(agreement), TOTAL_AMOUNT);

        factoryActor.fund(agreement);

        require(agreement.funded(), "funded flag mismatch");
        require(agreement.fundedAt() > 0, "funded at not set");
        require(fundingToken.balanceOf(address(factoryActor)) == 0, "buyer balance mismatch");
        require(fundingToken.balanceOf(address(agreement)) == TOTAL_AMOUNT, "agreement balance mismatch");
    }

    function testRejectsFundingFromUnauthorizedCallerOrRepeatedFunding() external {
        factoryActor.initialize(agreement, _defaultInitialization());
        fundingToken.mint(address(factoryActor), TOTAL_AMOUNT);
        factoryActor.approve(fundingToken, address(agreement), TOTAL_AMOUNT);

        _expectCustomError(_callFund(), EscrowAgreement.FundingUnauthorized.selector);

        factoryActor.fund(agreement);
        _expectCustomError(_callFundFromActor(factoryActor), EscrowAgreement.AlreadyFunded.selector);
    }

    function testRejectsFundingWhenPausedOrTransferFails() external {
        factoryActor.initialize(agreement, _defaultInitialization());

        protocolConfig.setFundingPaused(true);
        _expectCustomError(_callFundFromActor(factoryActor), EscrowAgreement.FundingPaused.selector);

        protocolConfig.setFundingPaused(false);
        EscrowAgreement failingAgreement = new EscrowAgreement();
        EscrowAgreement.AgreementInitialization memory initialization = _defaultInitialization();
        initialization.settlementToken = address(falseReturningToken);
        factoryActor.initialize(failingAgreement, initialization);

        _expectCustomError(
            _callFundAgreementFromActor(factoryActor, failingAgreement),
            EscrowAgreement.Erc20TransferFromFailed.selector
        );
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
        initialization.seller = buyerAddress;
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
            buyer: buyerAddress,
            seller: SELLER,
            settlementToken: address(fundingToken),
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

    function _callFund() private returns (bytes memory) {
        try this.callFund() {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callFundFromActor(EscrowAgreementActor actor) private returns (bytes memory) {
        return _callFundAgreementFromActor(actor, agreement);
    }

    function _callFundAgreementFromActor(EscrowAgreementActor actor, EscrowAgreement targetAgreement)
        private
        returns (bytes memory)
    {
        try actor.fund(targetAgreement) {
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

    function callFund() external {
        agreement.fund();
    }
}
