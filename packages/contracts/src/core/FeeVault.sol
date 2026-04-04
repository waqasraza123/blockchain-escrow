// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

contract FeeVault {
    error Erc20TransferFailed(address token, address recipient, uint256 amount);
    error InvalidAmount(uint256 amount);
    error InvalidNewOwner(address newOwner);
    error InvalidToken(address token);
    error InvalidTreasury(address treasury);
    error NativeTransferFailed(address recipient, uint256 amount);
    error NoPendingOwner();
    error TreasuryNotSet();
    error TreasuryUnchanged(address treasury);
    error Unauthorized(address caller);

    event NativeFeesWithdrawn(address indexed treasury, uint256 amount);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenFeesWithdrawn(address indexed token, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    address public owner;
    address public pendingOwner;
    address public treasury;

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

    receive() external payable {}

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

    function tokenBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            revert InvalidToken(token);
        }

        return IERC20(token).balanceOf(address(this));
    }

    function nativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawTokenFees(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            revert InvalidToken(token);
        }

        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        address treasuryAddress = treasury;

        if (treasuryAddress == address(0)) {
            revert TreasuryNotSet();
        }

        bool success = IERC20(token).transfer(treasuryAddress, amount);

        if (!success) {
            revert Erc20TransferFailed(token, treasuryAddress, amount);
        }

        emit TokenFeesWithdrawn(token, treasuryAddress, amount);
    }

    function withdrawNativeFees(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        address treasuryAddress = treasury;

        if (treasuryAddress == address(0)) {
            revert TreasuryNotSet();
        }

        (bool success,) = treasuryAddress.call{value: amount}("");

        if (!success) {
            revert NativeTransferFailed(treasuryAddress, amount);
        }

        emit NativeFeesWithdrawn(treasuryAddress, amount);
    }
}
