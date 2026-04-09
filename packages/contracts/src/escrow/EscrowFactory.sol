// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EscrowAgreement} from "./EscrowAgreement.sol";

interface IFactoryProtocolConfig {
    function createEscrowPaused() external view returns (bool);
    function fundingPaused() external view returns (bool);
}

interface IFactoryEscrowAgreement {
    function initialized() external view returns (bool);
}

contract EscrowFactory {
    struct EscrowCreation {
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

    error AgreementInitializationFailed();
    error AgreementFundingFailed();
    error AgreementNotFound(bytes32 dealId);
    error CreateEscrowPaused();
    error DealAlreadyExists(bytes32 dealId, address agreement);
    error FundingPaused();
    error InvalidAgreementImplementation(address agreementImplementation);
    error InvalidProtocolConfig(address protocolConfig);

    event AgreementCreated(
        bytes32 indexed dealId,
        bytes32 indexed dealVersionHash,
        address indexed agreement,
        address protocolConfig,
        address buyer,
        address seller,
        address settlementToken,
        address arbitrator,
        uint256 totalAmount,
        uint32 milestoneCount
    );

    address public immutable agreementImplementation;
    address public immutable protocolConfig;

    mapping(bytes32 dealId => address agreement) private agreementsByDealId;
    mapping(address agreement => bool created) private createdAgreements;

    constructor(address agreementImplementationAddress, address protocolConfigAddress) {
        if (!_isValidAgreementImplementation(agreementImplementationAddress)) {
            revert InvalidAgreementImplementation(agreementImplementationAddress);
        }

        if (!_isValidProtocolConfig(protocolConfigAddress)) {
            revert InvalidProtocolConfig(protocolConfigAddress);
        }

        agreementImplementation = agreementImplementationAddress;
        protocolConfig = protocolConfigAddress;
    }

    function createAgreement(EscrowCreation calldata creation) external returns (address agreementAddress) {
        agreementAddress = _createAgreement(creation);
    }

    function createAndFundAgreement(EscrowCreation calldata creation) external returns (address agreementAddress) {
        if (IFactoryProtocolConfig(protocolConfig).fundingPaused()) {
            revert FundingPaused();
        }

        agreementAddress = _createAgreement(creation);

        try EscrowAgreement(agreementAddress).fund() {}
        catch {
            revert AgreementFundingFailed();
        }
    }

    function _createAgreement(EscrowCreation calldata creation) private returns (address agreementAddress) {
        if (IFactoryProtocolConfig(protocolConfig).createEscrowPaused()) {
            revert CreateEscrowPaused();
        }

        bytes32 dealId = creation.dealId;
        address existingAgreement = agreementsByDealId[dealId];
        if (existingAgreement != address(0)) {
            revert DealAlreadyExists(dealId, existingAgreement);
        }

        bytes32 salt = keccak256(abi.encode(dealId, creation.dealVersionHash));
        agreementAddress = _cloneDeterministic(agreementImplementation, salt);

        EscrowAgreement.AgreementInitialization memory initialization = EscrowAgreement.AgreementInitialization({
            protocolConfig: protocolConfig,
            buyer: creation.buyer,
            seller: creation.seller,
            settlementToken: creation.settlementToken,
            arbitrator: creation.arbitrator,
            dealId: dealId,
            dealVersionHash: creation.dealVersionHash,
            totalAmount: creation.totalAmount,
            milestoneCount: creation.milestoneCount,
            milestoneAmounts: creation.milestoneAmounts
        });

        try EscrowAgreement(agreementAddress).initialize(initialization) {}
        catch {
            revert AgreementInitializationFailed();
        }

        agreementsByDealId[dealId] = agreementAddress;
        createdAgreements[agreementAddress] = true;

        emit AgreementCreated(
            dealId,
            creation.dealVersionHash,
            agreementAddress,
            protocolConfig,
            creation.buyer,
            creation.seller,
            creation.settlementToken,
            creation.arbitrator,
            creation.totalAmount,
            creation.milestoneCount
        );
    }

    function getAgreement(bytes32 dealId) external view returns (address agreementAddress) {
        agreementAddress = agreementsByDealId[dealId];

        if (agreementAddress == address(0)) {
            revert AgreementNotFound(dealId);
        }
    }

    function hasAgreement(bytes32 dealId) external view returns (bool) {
        return agreementsByDealId[dealId] != address(0);
    }

    function isAgreementFromFactory(address agreementAddress) external view returns (bool) {
        return createdAgreements[agreementAddress];
    }

    function predictAgreementAddress(bytes32 dealId, bytes32 dealVersionHash) external view returns (address) {
        bytes32 salt = keccak256(abi.encode(dealId, dealVersionHash));
        return _predictDeterministicAddress(agreementImplementation, salt, address(this));
    }

    function _cloneDeterministic(address implementation, bytes32 salt) private returns (address instance) {
        bytes memory creationCode = _cloneCreationCode(implementation);

        assembly {
            instance := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }

        if (instance == address(0)) {
            revert AgreementInitializationFailed();
        }
    }

    function _predictDeterministicAddress(address implementation, bytes32 salt, address deployer)
        private
        pure
        returns (address predicted)
    {
        bytes32 initCodeHash = keccak256(_cloneCreationCode(implementation));

        predicted = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash)))));
    }

    function _cloneCreationCode(address implementation) private pure returns (bytes memory) {
        return abi.encodePacked(
            hex"3d602d80600a3d3981f3", hex"363d3d373d3d3d363d73", implementation, hex"5af43d82803e903d91602b57fd5bf3"
        );
    }

    function _isValidAgreementImplementation(address agreementImplementationAddress) private view returns (bool) {
        if (agreementImplementationAddress == address(0) || agreementImplementationAddress.code.length == 0) {
            return false;
        }

        (bool success, bytes memory data) = agreementImplementationAddress.staticcall(
            abi.encodeWithSelector(IFactoryEscrowAgreement.initialized.selector)
        );

        return success && data.length == 32;
    }

    function _isValidProtocolConfig(address protocolConfigAddress) private view returns (bool) {
        if (protocolConfigAddress == address(0) || protocolConfigAddress.code.length == 0) {
            return false;
        }

        (bool createPauseSuccess, bytes memory createPauseData) =
            protocolConfigAddress.staticcall(abi.encodeWithSelector(IFactoryProtocolConfig.createEscrowPaused.selector));
        (bool fundingPauseSuccess, bytes memory fundingPauseData) =
            protocolConfigAddress.staticcall(abi.encodeWithSelector(IFactoryProtocolConfig.fundingPaused.selector));

        return
            createPauseSuccess && createPauseData.length == 32 && fundingPauseSuccess && fundingPauseData.length == 32;
    }
}
