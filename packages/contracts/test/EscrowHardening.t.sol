// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";
import {EscrowFactory} from "../src/escrow/EscrowFactory.sol";

contract EscrowFactoryHardeningActor {
    function createAgreement(EscrowFactory factory, EscrowFactory.EscrowCreation calldata creation)
        external
        returns (address)
    {
        return factory.createAgreement(creation);
    }
}

contract EscrowHardeningAssertions {
    function _expectCustomError(bytes memory reason, bytes4 selector) internal pure {
        require(reason.length >= 4, "revert reason too short");

        bytes4 actualSelector;
        assembly {
            actualSelector := mload(add(reason, 32))
        }

        require(actualSelector == selector, "unexpected custom error");
    }
}

contract EscrowAgreementFuzzHardeningTest is EscrowHardeningAssertions {
    uint16 private constant INITIAL_PROTOCOL_FEE_BPS = 200;
    address private constant SETTLEMENT_TOKEN_A = address(0x7101);
    address private constant SETTLEMENT_TOKEN_B = address(0x7102);
    address private constant APPROVED_ARBITRATOR = address(0x7103);

    struct AgreementEnvironment {
        ProtocolConfig protocolConfig;
        TokenAllowlist tokenAllowlist;
        ArbitratorRegistry arbitratorRegistry;
        FeeVault feeVault;
        EscrowAgreement agreement;
    }

    function testFuzzSnapshotsImmutableAgreementState(
        uint256 buyerSeed,
        uint256 sellerSeed,
        uint256 amountSeed,
        uint256 milestoneSeed,
        uint256 dealSeed,
        uint256 versionSeed,
        bool useOptionalArbitrator,
        bool useSecondaryToken
    ) external {
        AgreementEnvironment memory environment = _createAgreementEnvironment();
        EscrowAgreement.AgreementInitialization memory initialization = _buildInitialization(
            address(environment.protocolConfig),
            buyerSeed,
            sellerSeed,
            amountSeed,
            milestoneSeed,
            dealSeed,
            versionSeed,
            useOptionalArbitrator,
            useSecondaryToken
        );

        environment.agreement.initialize(initialization);

        FeeVault nextFeeVault = new FeeVault();
        environment.protocolConfig.setFeeVault(address(nextFeeVault));
        environment.protocolConfig.setProtocolFeeBps(
            uint16(
                (uint256(INITIAL_PROTOCOL_FEE_BPS) + 111)
                    % (uint256(environment.protocolConfig.MAX_PROTOCOL_FEE_BPS()) + 1)
            )
        );
        environment.tokenAllowlist.setTokenAllowed(address(0x71ff), true);
        environment.arbitratorRegistry.setArbitratorApproved(address(0x72ff), true);

        _assertAgreementSnapshot(environment, initialization);
    }

    function _createAgreementEnvironment() private returns (AgreementEnvironment memory environment) {
        environment.protocolConfig = new ProtocolConfig();
        environment.tokenAllowlist = new TokenAllowlist();
        environment.arbitratorRegistry = new ArbitratorRegistry();
        environment.feeVault = new FeeVault();
        environment.agreement = new EscrowAgreement();

        environment.tokenAllowlist.setTokenAllowed(SETTLEMENT_TOKEN_A, true);
        environment.tokenAllowlist.setTokenAllowed(SETTLEMENT_TOKEN_B, true);
        environment.arbitratorRegistry.setArbitratorApproved(APPROVED_ARBITRATOR, true);
        environment.protocolConfig.setTokenAllowlist(address(environment.tokenAllowlist));
        environment.protocolConfig.setArbitratorRegistry(address(environment.arbitratorRegistry));
        environment.protocolConfig.setFeeVault(address(environment.feeVault));
        environment.protocolConfig.setTreasury(address(0x7199));
        environment.protocolConfig.setProtocolFeeBps(INITIAL_PROTOCOL_FEE_BPS);
        environment.feeVault.setTreasury(address(0x7199));
    }

    function _buildInitialization(
        address protocolConfigAddress,
        uint256 buyerSeed,
        uint256 sellerSeed,
        uint256 amountSeed,
        uint256 milestoneSeed,
        uint256 dealSeed,
        uint256 versionSeed,
        bool useOptionalArbitrator,
        bool useSecondaryToken
    ) private pure returns (EscrowAgreement.AgreementInitialization memory) {
        address buyer = _derivedAddress(buyerSeed, 1);
        address settlementToken = useSecondaryToken ? SETTLEMENT_TOKEN_B : SETTLEMENT_TOKEN_A;

        return EscrowAgreement.AgreementInitialization({
            protocolConfig: protocolConfigAddress,
            buyer: buyer,
            seller: _derivedDistinctAddress(sellerSeed, 2, buyer),
            settlementToken: settlementToken,
            arbitrator: useOptionalArbitrator ? address(0) : APPROVED_ARBITRATOR,
            dealId: _nonZeroHash(dealSeed, 3),
            dealVersionHash: _nonZeroHash(versionSeed, 4),
            totalAmount: _positiveAmount(amountSeed),
            milestoneCount: _positiveMilestoneCount(milestoneSeed)
        });
    }

    function _assertAgreementSnapshot(
        AgreementEnvironment memory environment,
        EscrowAgreement.AgreementInitialization memory initialization
    ) private view {
        require(environment.agreement.initialized(), "agreement not initialized");
        require(environment.agreement.factory() == address(this), "agreement factory mismatch");
        require(
            environment.agreement.protocolConfig() == address(environment.protocolConfig),
            "agreement protocol config mismatch"
        );
        require(environment.agreement.feeVault() == address(environment.feeVault), "agreement fee vault mismatch");
        require(environment.agreement.buyer() == initialization.buyer, "agreement buyer mismatch");
        require(environment.agreement.seller() == initialization.seller, "agreement seller mismatch");
        require(environment.agreement.settlementToken() == initialization.settlementToken, "agreement token mismatch");
        require(environment.agreement.arbitrator() == initialization.arbitrator, "agreement arbitrator mismatch");
        require(environment.agreement.dealId() == initialization.dealId, "agreement deal id mismatch");
        require(environment.agreement.dealVersionHash() == initialization.dealVersionHash, "agreement version mismatch");
        require(environment.agreement.totalAmount() == initialization.totalAmount, "agreement total mismatch");
        require(environment.agreement.milestoneCount() == initialization.milestoneCount, "agreement milestone mismatch");
        require(environment.agreement.protocolFeeBps() == INITIAL_PROTOCOL_FEE_BPS, "agreement fee snapshot mismatch");
    }

    function _derivedAddress(uint256 seed, uint256 salt) private pure returns (address) {
        address candidate = address(uint160(uint256(keccak256(abi.encode(seed, salt)))));

        if (candidate == address(0)) {
            return address(uint160(salt));
        }

        return candidate;
    }

    function _derivedDistinctAddress(uint256 seed, uint256 salt, address disallowed) private pure returns (address) {
        address candidate = _derivedAddress(seed, salt);

        if (candidate == disallowed) {
            return address(uint160(uint256(uint160(disallowed)) + salt + 1));
        }

        return candidate;
    }

    function _nonZeroHash(uint256 seed, uint256 salt) private pure returns (bytes32) {
        bytes32 candidate = keccak256(abi.encode(seed, salt));

        if (candidate == bytes32(0)) {
            return bytes32(uint256(salt));
        }

        return candidate;
    }

    function _positiveAmount(uint256 seed) private pure returns (uint256) {
        return (seed % 10_000_000) + 1;
    }

    function _positiveMilestoneCount(uint256 seed) private pure returns (uint32) {
        return uint32((seed % 20) + 1);
    }
}

contract EscrowFactoryFuzzHardeningTest is EscrowHardeningAssertions {
    uint16 private constant INITIAL_PROTOCOL_FEE_BPS = 300;
    address private constant SETTLEMENT_TOKEN = address(0x7201);
    address private constant APPROVED_ARBITRATOR = address(0x7202);

    function testFuzzCreatesDeterministicUniqueAgreementSequence(uint256[] memory creationSeeds) external {
        (ProtocolConfig protocolConfig, EscrowFactory factory) = _createFactoryStack();

        uint256 creationCount = _boundedOperationCount(creationSeeds.length, 16);
        address[] memory createdAgreements = new address[](creationCount);
        bytes32[] memory createdDealIds = new bytes32[](creationCount);

        for (uint256 index = 0; index < creationCount; ++index) {
            uint256 seed = creationSeeds[index];
            EscrowFactory.EscrowCreation memory creation = _creationFromSeed(seed, index);
            address predictedAgreement = factory.predictAgreementAddress(creation.dealId, creation.dealVersionHash);
            address createdAgreement = factory.createAgreement(creation);
            EscrowAgreement agreement = EscrowAgreement(createdAgreement);

            createdAgreements[index] = createdAgreement;
            createdDealIds[index] = creation.dealId;

            require(createdAgreement == predictedAgreement, "factory predicted address mismatch");
            require(factory.hasAgreement(creation.dealId), "factory missing agreement");
            require(factory.getAgreement(creation.dealId) == createdAgreement, "factory stored agreement mismatch");
            require(factory.isAgreementFromFactory(createdAgreement), "factory tracking mismatch");
            require(agreement.initialized(), "factory agreement not initialized");
            require(agreement.factory() == address(factory), "factory address mismatch");
            require(agreement.protocolConfig() == address(protocolConfig), "factory protocol config mismatch");
            require(agreement.dealId() == creation.dealId, "factory deal id mismatch");
            require(agreement.dealVersionHash() == creation.dealVersionHash, "factory version mismatch");
            require(agreement.totalAmount() == creation.totalAmount, "factory total mismatch");
            require(agreement.milestoneCount() == creation.milestoneCount, "factory milestone mismatch");
            require(agreement.protocolFeeBps() == INITIAL_PROTOCOL_FEE_BPS, "factory fee mismatch");

            for (uint256 seenIndex = 0; seenIndex < index; ++seenIndex) {
                require(createdAgreements[seenIndex] != createdAgreement, "factory duplicate agreement");
                require(createdDealIds[seenIndex] != creation.dealId, "factory duplicate deal id");
            }
        }
    }

    function testFuzzRejectsDuplicateDealIdsAcrossVersionUpdates(uint256 seedA, uint256 seedB) external {
        (, EscrowFactory factory) = _createFactoryStack();

        EscrowFactory.EscrowCreation memory firstCreation = _creationFromSeed(seedA, 0);
        factory.createAgreement(firstCreation);

        EscrowFactory.EscrowCreation memory duplicateDealCreation = _creationFromSeed(seedB, 1);
        duplicateDealCreation.dealId = firstCreation.dealId;

        _expectCustomError(
            _callCreateAgreement(factory, duplicateDealCreation), EscrowFactory.DealAlreadyExists.selector
        );
    }

    function testFuzzRejectsAgreementCreationWhilePaused(uint256 seed) external {
        (ProtocolConfig protocolConfig, EscrowFactory factory) = _createFactoryStack();

        protocolConfig.setCreateEscrowPaused(true);

        _expectCustomError(
            _callCreateAgreement(factory, _creationFromSeed(seed, 0)), EscrowFactory.CreateEscrowPaused.selector
        );
    }

    function _createFactoryStack() private returns (ProtocolConfig, EscrowFactory) {
        ProtocolConfig protocolConfig = new ProtocolConfig();
        TokenAllowlist tokenAllowlist = new TokenAllowlist();
        ArbitratorRegistry arbitratorRegistry = new ArbitratorRegistry();
        FeeVault feeVault = new FeeVault();
        EscrowAgreement agreementImplementation = new EscrowAgreement();
        EscrowFactory factory = new EscrowFactory(address(agreementImplementation), address(protocolConfig));

        tokenAllowlist.setTokenAllowed(SETTLEMENT_TOKEN, true);
        arbitratorRegistry.setArbitratorApproved(APPROVED_ARBITRATOR, true);
        protocolConfig.setTokenAllowlist(address(tokenAllowlist));
        protocolConfig.setArbitratorRegistry(address(arbitratorRegistry));
        protocolConfig.setFeeVault(address(feeVault));
        protocolConfig.setTreasury(address(0x7299));
        protocolConfig.setProtocolFeeBps(INITIAL_PROTOCOL_FEE_BPS);
        feeVault.setTreasury(address(0x7299));

        return (protocolConfig, factory);
    }

    function _creationFromSeed(uint256 seed, uint256 salt) private pure returns (EscrowFactory.EscrowCreation memory) {
        address buyer = _derivedAddress(seed, salt + 1);
        address seller = _derivedDistinctAddress(seed, salt + 2, buyer);

        return EscrowFactory.EscrowCreation({
            buyer: buyer,
            seller: seller,
            settlementToken: SETTLEMENT_TOKEN,
            arbitrator: ((seed >> 8) & 1) == 1 ? address(0) : APPROVED_ARBITRATOR,
            dealId: _nonZeroHash(seed, salt + 3),
            dealVersionHash: _nonZeroHash(seed, salt + 4),
            totalAmount: _positiveAmount(seed),
            milestoneCount: _positiveMilestoneCount(seed)
        });
    }

    function _callCreateAgreement(EscrowFactory factory, EscrowFactory.EscrowCreation memory creation)
        private
        returns (bytes memory)
    {
        EscrowFactoryHardeningActor actor = new EscrowFactoryHardeningActor();

        try actor.createAgreement(factory, creation) returns (address) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _derivedAddress(uint256 seed, uint256 salt) private pure returns (address) {
        address candidate = address(uint160(uint256(keccak256(abi.encode(seed, salt)))));

        if (candidate == address(0)) {
            return address(uint160(salt));
        }

        return candidate;
    }

    function _derivedDistinctAddress(uint256 seed, uint256 salt, address disallowed) private pure returns (address) {
        address candidate = _derivedAddress(seed, salt);

        if (candidate == disallowed) {
            return address(uint160(uint256(uint160(disallowed)) + salt + 1));
        }

        return candidate;
    }

    function _nonZeroHash(uint256 seed, uint256 salt) private pure returns (bytes32) {
        bytes32 candidate = keccak256(abi.encode(seed, salt));

        if (candidate == bytes32(0)) {
            return bytes32(uint256(salt));
        }

        return candidate;
    }

    function _positiveAmount(uint256 seed) private pure returns (uint256) {
        return (seed % 10_000_000) + 1;
    }

    function _positiveMilestoneCount(uint256 seed) private pure returns (uint32) {
        return uint32((seed % 20) + 1);
    }

    function _boundedOperationCount(uint256 originalLength, uint256 maxLength) private pure returns (uint256) {
        if (originalLength < maxLength) {
            return originalLength;
        }

        return maxLength;
    }
}
