// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";
import {EscrowFactory} from "../src/escrow/EscrowFactory.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function envAddress(string calldata name) external returns (address);
    function envOr(string calldata name, string calldata defaultValue) external returns (string memory);
    function envOr(string calldata name, uint256 defaultValue) external returns (uint256);
    function envUint(string calldata name) external returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployProtocolScript {
    uint256 private constant MAX_PROTOCOL_FEE_BPS = 10_000;

    error InvalidProtocolFeeBps(uint256 protocolFeeBps);

    event DeploymentCompleted(
        uint256 indexed chainId,
        address indexed deployer,
        address indexed safeAddress,
        address protocolConfig,
        address escrowFactory,
        uint16 protocolFeeBps,
        string explorerUrl
    );

    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    struct DeploymentResult {
        address deployer;
        address safeAddress;
        address tokenAllowlist;
        address arbitratorRegistry;
        address protocolConfig;
        address feeVault;
        address escrowAgreementImplementation;
        address escrowFactory;
        address usdcTokenAddress;
        uint16 protocolFeeBps;
        string explorerUrl;
    }

    struct DeployedContracts {
        TokenAllowlist tokenAllowlist;
        ArbitratorRegistry arbitratorRegistry;
        FeeVault feeVault;
        ProtocolConfig protocolConfig;
        EscrowAgreement escrowAgreementImplementation;
        EscrowFactory escrowFactory;
    }

    function run() external returns (DeploymentResult memory result) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address safeAddress = vm.envAddress("SAFE_ADDRESS");
        address usdcTokenAddress = vm.envAddress("USDC_TOKEN_ADDRESS");
        uint256 configuredProtocolFeeBps = vm.envOr("PROTOCOL_FEE_BPS", uint256(0));
        string memory explorerUrl = vm.envOr("BASE_EXPLORER_URL", string(""));

        if (configuredProtocolFeeBps > MAX_PROTOCOL_FEE_BPS) {
            revert InvalidProtocolFeeBps(configuredProtocolFeeBps);
        }

        address deployer = vm.addr(deployerPrivateKey);
        uint16 protocolFeeBps = uint16(configuredProtocolFeeBps);

        vm.startBroadcast(deployerPrivateKey);

        DeployedContracts memory deployed = _deployContracts();
        _configureContracts(deployed, deployer, safeAddress, usdcTokenAddress, protocolFeeBps);

        vm.stopBroadcast();

        result = DeploymentResult({
            deployer: deployer,
            safeAddress: safeAddress,
            tokenAllowlist: address(deployed.tokenAllowlist),
            arbitratorRegistry: address(deployed.arbitratorRegistry),
            protocolConfig: address(deployed.protocolConfig),
            feeVault: address(deployed.feeVault),
            escrowAgreementImplementation: address(deployed.escrowAgreementImplementation),
            escrowFactory: address(deployed.escrowFactory),
            usdcTokenAddress: usdcTokenAddress,
            protocolFeeBps: protocolFeeBps,
            explorerUrl: explorerUrl
        });

        emit DeploymentCompleted(
            block.chainid,
            result.deployer,
            result.safeAddress,
            result.protocolConfig,
            result.escrowFactory,
            result.protocolFeeBps,
            result.explorerUrl
        );
    }

    function _deployContracts() private returns (DeployedContracts memory deployed) {
        deployed.tokenAllowlist = new TokenAllowlist();
        deployed.arbitratorRegistry = new ArbitratorRegistry();
        deployed.feeVault = new FeeVault();
        deployed.protocolConfig = new ProtocolConfig();
        deployed.escrowAgreementImplementation = new EscrowAgreement();
        deployed.escrowFactory =
            new EscrowFactory(address(deployed.escrowAgreementImplementation), address(deployed.protocolConfig));
    }

    function _configureContracts(
        DeployedContracts memory deployed,
        address deployer,
        address safeAddress,
        address usdcTokenAddress,
        uint16 protocolFeeBps
    ) private {
        deployed.tokenAllowlist.setTokenAllowed(usdcTokenAddress, true);
        deployed.protocolConfig.setTokenAllowlist(address(deployed.tokenAllowlist));
        deployed.protocolConfig.setArbitratorRegistry(address(deployed.arbitratorRegistry));
        deployed.protocolConfig.setFeeVault(address(deployed.feeVault));
        deployed.protocolConfig.setTreasury(safeAddress);
        if (protocolFeeBps != 0) {
            deployed.protocolConfig.setProtocolFeeBps(protocolFeeBps);
        }
        deployed.feeVault.setTreasury(safeAddress);

        if (safeAddress != deployer) {
            deployed.tokenAllowlist.transferOwnership(safeAddress);
            deployed.arbitratorRegistry.transferOwnership(safeAddress);
            deployed.feeVault.transferOwnership(safeAddress);
            deployed.protocolConfig.transferOwnership(safeAddress);
        }
    }
}
