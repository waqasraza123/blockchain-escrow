// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract ProtocolConfig {
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 10_000;

    error ArbitratorRegistryUnchanged(address arbitratorRegistry);
    error CreateEscrowPauseUnchanged(bool paused);
    error FeeVaultUnchanged(address feeVault);
    error FundingPauseUnchanged(bool paused);
    error InvalidArbitratorRegistry(address arbitratorRegistry);
    error InvalidFeeVault(address feeVault);
    error InvalidNewOwner(address newOwner);
    error InvalidProtocolFeeBps(uint16 protocolFeeBps, uint16 maxProtocolFeeBps);
    error InvalidTokenAllowlist(address tokenAllowlist);
    error InvalidTreasury(address treasury);
    error NoPendingOwner();
    error ProtocolFeeBpsUnchanged(uint16 protocolFeeBps);
    error TokenAllowlistUnchanged(address tokenAllowlist);
    error TreasuryUnchanged(address treasury);
    error Unauthorized(address caller);

    event ArbitratorRegistryUpdated(address indexed previousArbitratorRegistry, address indexed newArbitratorRegistry);
    event CreateEscrowPauseUpdated(bool indexed previousPaused, bool indexed newPaused);
    event FeeVaultUpdated(address indexed previousFeeVault, address indexed newFeeVault);
    event FundingPauseUpdated(bool indexed previousPaused, bool indexed newPaused);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProtocolFeeBpsUpdated(uint16 previousProtocolFeeBps, uint16 newProtocolFeeBps);
    event TokenAllowlistUpdated(address indexed previousTokenAllowlist, address indexed newTokenAllowlist);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    address public owner;
    address public pendingOwner;
    address public tokenAllowlist;
    address public arbitratorRegistry;
    address public feeVault;
    address public treasury;
    uint16 public protocolFeeBps;
    bool public createEscrowPaused;
    bool public fundingPaused;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0) || newOwner == owner) {
            revert InvalidNewOwner(newOwner);
        }

        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        address nextOwner = pendingOwner;

        if (nextOwner == address(0)) {
            revert NoPendingOwner();
        }

        if (msg.sender != nextOwner) {
            revert Unauthorized(msg.sender);
        }

        address previousOwner = owner;
        owner = nextOwner;
        pendingOwner = address(0);

        emit OwnershipTransferred(previousOwner, nextOwner);
    }

    function setTokenAllowlist(address newTokenAllowlist) external onlyOwner {
        if (newTokenAllowlist == address(0)) {
            revert InvalidTokenAllowlist(newTokenAllowlist);
        }

        address previousTokenAllowlist = tokenAllowlist;

        if (newTokenAllowlist == previousTokenAllowlist) {
            revert TokenAllowlistUnchanged(newTokenAllowlist);
        }

        tokenAllowlist = newTokenAllowlist;
        emit TokenAllowlistUpdated(previousTokenAllowlist, newTokenAllowlist);
    }

    function setArbitratorRegistry(address newArbitratorRegistry) external onlyOwner {
        if (newArbitratorRegistry == address(0)) {
            revert InvalidArbitratorRegistry(newArbitratorRegistry);
        }

        address previousArbitratorRegistry = arbitratorRegistry;

        if (newArbitratorRegistry == previousArbitratorRegistry) {
            revert ArbitratorRegistryUnchanged(newArbitratorRegistry);
        }

        arbitratorRegistry = newArbitratorRegistry;
        emit ArbitratorRegistryUpdated(previousArbitratorRegistry, newArbitratorRegistry);
    }

    function setFeeVault(address newFeeVault) external onlyOwner {
        if (newFeeVault == address(0)) {
            revert InvalidFeeVault(newFeeVault);
        }

        address previousFeeVault = feeVault;

        if (newFeeVault == previousFeeVault) {
            revert FeeVaultUnchanged(newFeeVault);
        }

        feeVault = newFeeVault;
        emit FeeVaultUpdated(previousFeeVault, newFeeVault);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert InvalidTreasury(newTreasury);
        }

        address previousTreasury = treasury;

        if (newTreasury == previousTreasury) {
            revert TreasuryUnchanged(newTreasury);
        }

        treasury = newTreasury;
        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    function setProtocolFeeBps(uint16 newProtocolFeeBps) external onlyOwner {
        if (newProtocolFeeBps > MAX_PROTOCOL_FEE_BPS) {
            revert InvalidProtocolFeeBps(newProtocolFeeBps, MAX_PROTOCOL_FEE_BPS);
        }

        uint16 previousProtocolFeeBps = protocolFeeBps;

        if (newProtocolFeeBps == previousProtocolFeeBps) {
            revert ProtocolFeeBpsUnchanged(newProtocolFeeBps);
        }

        protocolFeeBps = newProtocolFeeBps;
        emit ProtocolFeeBpsUpdated(previousProtocolFeeBps, newProtocolFeeBps);
    }

    function setCreateEscrowPaused(bool newCreateEscrowPaused) external onlyOwner {
        bool previousCreateEscrowPaused = createEscrowPaused;

        if (newCreateEscrowPaused == previousCreateEscrowPaused) {
            revert CreateEscrowPauseUnchanged(newCreateEscrowPaused);
        }

        createEscrowPaused = newCreateEscrowPaused;
        emit CreateEscrowPauseUpdated(previousCreateEscrowPaused, newCreateEscrowPaused);
    }

    function setFundingPaused(bool newFundingPaused) external onlyOwner {
        bool previousFundingPaused = fundingPaused;

        if (newFundingPaused == previousFundingPaused) {
            revert FundingPauseUnchanged(newFundingPaused);
        }

        fundingPaused = newFundingPaused;
        emit FundingPauseUpdated(previousFundingPaused, newFundingPaused);
    }
}
