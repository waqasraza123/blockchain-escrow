// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";
import {EscrowFactory} from "../src/escrow/EscrowFactory.sol";

contract MockFundingErc20 {
    mapping(address owner => mapping(address spender => uint256 allowanceAmount)) private allowances;
    mapping(address account => uint256 balance) private balances;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
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

contract EscrowFactoryActor {
    function createAgreement(EscrowFactory factory, EscrowFactory.EscrowCreation calldata creation)
        external
        returns (address)
    {
        return factory.createAgreement(creation);
    }

    function createAndFundAgreement(EscrowFactory factory, EscrowFactory.EscrowCreation calldata creation)
        external
        returns (address)
    {
        return factory.createAndFundAgreement(creation);
    }

    function approve(MockFundingErc20 token, address spender, uint256 amount) external {
        token.approve(spender, amount);
    }
}

contract EscrowFactoryTest {
    ProtocolConfig private protocolConfig;
    TokenAllowlist private tokenAllowlist;
    ArbitratorRegistry private arbitratorRegistry;
    FeeVault private feeVault;
    EscrowAgreement private agreementImplementation;
    EscrowFactory private factory;
    EscrowFactoryActor private actor;
    MockFundingErc20 private fundingToken;

    address private constant BUYER = address(0x5001);
    address private constant SELLER = address(0x5002);
    address private constant ARBITRATOR = address(0x5004);
    bytes32 private constant DEAL_ID = keccak256("factory-deal-1");
    bytes32 private constant DEAL_VERSION_HASH = keccak256("factory-deal-version-1");
    uint256 private constant TOTAL_AMOUNT = 2_000_000;
    uint32 private constant MILESTONE_COUNT = 4;
    uint16 private constant PROTOCOL_FEE_BPS = 300;

    function setUp() public {
        protocolConfig = new ProtocolConfig();
        tokenAllowlist = new TokenAllowlist();
        arbitratorRegistry = new ArbitratorRegistry();
        feeVault = new FeeVault();
        agreementImplementation = new EscrowAgreement();
        actor = new EscrowFactoryActor();
        fundingToken = new MockFundingErc20();

        tokenAllowlist.setTokenAllowed(address(fundingToken), true);
        arbitratorRegistry.setArbitratorApproved(ARBITRATOR, true);
        protocolConfig.setTokenAllowlist(address(tokenAllowlist));
        protocolConfig.setArbitratorRegistry(address(arbitratorRegistry));
        protocolConfig.setFeeVault(address(feeVault));
        protocolConfig.setTreasury(address(0x5999));
        protocolConfig.setProtocolFeeBps(PROTOCOL_FEE_BPS);

        factory = new EscrowFactory(address(agreementImplementation), address(protocolConfig));
    }

    function testInitializesImmutableFactoryDependencies() external view {
        require(factory.agreementImplementation() == address(agreementImplementation), "implementation mismatch");
        require(factory.protocolConfig() == address(protocolConfig), "protocol config mismatch");
    }

    function testCreatesClonePerDealAndInitializesAgreement() external {
        EscrowFactory.EscrowCreation memory creation = _defaultCreation();
        address predictedAgreement = factory.predictAgreementAddress(creation.dealId, creation.dealVersionHash);

        address agreementAddress = factory.createAgreement(creation);
        EscrowAgreement agreement = EscrowAgreement(agreementAddress);

        require(agreementAddress == predictedAgreement, "predicted agreement mismatch");
        require(agreementAddress != address(agreementImplementation), "implementation reused");
        require(factory.hasAgreement(creation.dealId), "agreement missing");
        require(factory.getAgreement(creation.dealId) == agreementAddress, "stored agreement mismatch");
        require(factory.isAgreementFromFactory(agreementAddress), "factory tracking mismatch");
        require(agreement.initialized(), "agreement not initialized");
        require(agreement.factory() == address(factory), "agreement factory mismatch");
        require(agreement.protocolConfig() == address(protocolConfig), "agreement protocol config mismatch");
        require(agreement.feeVault() == address(feeVault), "agreement fee vault mismatch");
        require(agreement.buyer() == BUYER, "agreement buyer mismatch");
        require(agreement.seller() == SELLER, "agreement seller mismatch");
        require(agreement.settlementToken() == address(fundingToken), "agreement token mismatch");
        require(agreement.arbitrator() == ARBITRATOR, "agreement arbitrator mismatch");
        require(agreement.dealId() == DEAL_ID, "agreement deal id mismatch");
        require(agreement.dealVersionHash() == DEAL_VERSION_HASH, "agreement version hash mismatch");
        require(agreement.totalAmount() == TOTAL_AMOUNT, "agreement total amount mismatch");
        require(agreement.milestoneCount() == MILESTONE_COUNT, "agreement milestone count mismatch");
        require(agreement.protocolFeeBps() == PROTOCOL_FEE_BPS, "agreement fee bps mismatch");
        require(!agreement.funded(), "agreement funded mismatch");
    }

    function testCreatesAndFundsAgreementAtomically() external {
        EscrowFactory.EscrowCreation memory creation = _defaultCreation();
        creation.buyer = address(actor);
        address predictedAgreement = factory.predictAgreementAddress(creation.dealId, creation.dealVersionHash);

        fundingToken.mint(address(actor), TOTAL_AMOUNT);
        actor.approve(fundingToken, predictedAgreement, TOTAL_AMOUNT);

        address agreementAddress = actor.createAndFundAgreement(factory, creation);
        EscrowAgreement agreement = EscrowAgreement(agreementAddress);

        require(agreementAddress == predictedAgreement, "predicted funded agreement mismatch");
        require(agreement.funded(), "agreement should be funded");
        require(agreement.fundedAt() > 0, "agreement funded at mismatch");
        require(fundingToken.balanceOf(address(actor)) == 0, "buyer token balance mismatch");
        require(fundingToken.balanceOf(agreementAddress) == TOTAL_AMOUNT, "agreement token balance mismatch");
    }

    function testRejectsDuplicateDealCreation() external {
        EscrowFactory.EscrowCreation memory creation = _defaultCreation();
        address firstAgreement = factory.createAgreement(creation);

        _expectCustomError(_callCreateAgreement(creation), EscrowFactory.DealAlreadyExists.selector);
        require(factory.getAgreement(creation.dealId) == firstAgreement, "duplicate changed stored agreement");
    }

    function testRejectsCreationWhenPaused() external {
        protocolConfig.setCreateEscrowPaused(true);

        _expectCustomError(_callCreateAgreement(_defaultCreation()), EscrowFactory.CreateEscrowPaused.selector);
    }

    function testRejectsCreateAndFundWhenFundingIsPausedOrFundingFails() external {
        EscrowFactory.EscrowCreation memory creation = _defaultCreation();
        creation.buyer = address(actor);

        protocolConfig.setFundingPaused(true);
        _expectCustomError(_callCreateAndFundAgreement(creation), EscrowFactory.FundingPaused.selector);

        protocolConfig.setFundingPaused(false);
        _expectCustomError(_callCreateAndFundAgreement(creation), EscrowFactory.AgreementFundingFailed.selector);
    }

    function testRejectsMissingAgreementLookup() external view {
        _expectCustomError(factoryCallGetAgreement(bytes32(uint256(123))), EscrowFactory.AgreementNotFound.selector);
    }

    function testRejectsInvalidConstructorDependencies() external {
        _expectCustomError(
            _deployFactory(address(0), address(protocolConfig)), EscrowFactory.InvalidAgreementImplementation.selector
        );
        _expectCustomError(
            _deployFactory(address(protocolConfig), address(protocolConfig)),
            EscrowFactory.InvalidAgreementImplementation.selector
        );
        _expectCustomError(
            _deployFactory(address(agreementImplementation), address(0)), EscrowFactory.InvalidProtocolConfig.selector
        );
        _expectCustomError(
            _deployFactory(address(agreementImplementation), address(agreementImplementation)),
            EscrowFactory.InvalidProtocolConfig.selector
        );
    }

    function testRejectsInitializationFailuresFromAgreement() external {
        EscrowFactory.EscrowCreation memory creation = _defaultCreation();
        creation.buyer = address(0);

        _expectCustomError(_callCreateAgreement(creation), EscrowFactory.AgreementInitializationFailed.selector);
    }

    function testTracksOnlyFactoryCreatedAgreements() external view {
        require(
            !factory.isAgreementFromFactory(address(agreementImplementation)), "implementation should not be tracked"
        );
        require(!factory.hasAgreement(bytes32(uint256(123))), "unexpected deal found");
    }

    function _defaultCreation() private view returns (EscrowFactory.EscrowCreation memory) {
        return EscrowFactory.EscrowCreation({
            buyer: BUYER,
            seller: SELLER,
            settlementToken: address(fundingToken),
            arbitrator: ARBITRATOR,
            dealId: DEAL_ID,
            dealVersionHash: DEAL_VERSION_HASH,
            totalAmount: TOTAL_AMOUNT,
            milestoneCount: MILESTONE_COUNT
        });
    }

    function _callCreateAgreement(EscrowFactory.EscrowCreation memory creation) private returns (bytes memory) {
        try actor.createAgreement(factory, creation) returns (address) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callCreateAndFundAgreement(EscrowFactory.EscrowCreation memory creation) private returns (bytes memory) {
        try actor.createAndFundAgreement(factory, creation) returns (address) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _deployFactory(address agreementImplementationAddress, address protocolConfigAddress)
        private
        returns (bytes memory)
    {
        try this.deployFactory(agreementImplementationAddress, protocolConfigAddress) {
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

    function deployFactory(address agreementImplementationAddress, address protocolConfigAddress) external {
        new EscrowFactory(agreementImplementationAddress, protocolConfigAddress);
    }

    function factoryCallGetAgreement(bytes32 dealId) public view returns (bytes memory) {
        try this.callGetAgreement(dealId) returns (address) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function callGetAgreement(bytes32 dealId) external view returns (address) {
        return factory.getAgreement(dealId);
    }
}
