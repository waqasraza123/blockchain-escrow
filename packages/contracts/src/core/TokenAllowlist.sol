// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract TokenAllowlist {
    error IndexOutOfBounds(uint256 index, uint256 length);
    error InvalidNewOwner(address newOwner);
    error LengthMismatch(uint256 tokensLength, uint256 statusesLength);
    error NoPendingOwner();
    error StatusUnchanged(address token, bool allowed);
    error Unauthorized(address caller);
    error ZeroAddressToken();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenStatusUpdated(address indexed token, bool indexed allowed);

    address public owner;
    address public pendingOwner;

    mapping(address token => bool allowed) private allowedTokens;
    mapping(address token => uint256 indexPlusOne) private allowedTokenIndexPlusOne;
    address[] private allowedTokenList;

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

    function isAllowedToken(address token) external view returns (bool) {
        return allowedTokens[token];
    }

    function allowedTokenCount() external view returns (uint256) {
        return allowedTokenList.length;
    }

    function allowedTokenAt(uint256 index) external view returns (address) {
        uint256 length = allowedTokenList.length;

        if (index >= length) {
            revert IndexOutOfBounds(index, length);
        }

        return allowedTokenList[index];
    }

    function getAllowedTokens() external view returns (address[] memory) {
        return allowedTokenList;
    }

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        _setTokenAllowed(token, allowed);
    }

    function batchSetTokenAllowed(address[] calldata tokens, bool[] calldata statuses) external onlyOwner {
        uint256 length = tokens.length;

        if (length != statuses.length) {
            revert LengthMismatch(length, statuses.length);
        }

        for (uint256 i = 0; i < length; ++i) {
            _setTokenAllowed(tokens[i], statuses[i]);
        }
    }

    function _setTokenAllowed(address token, bool allowed) internal {
        if (token == address(0)) {
            revert ZeroAddressToken();
        }

        bool currentStatus = allowedTokens[token];

        if (currentStatus == allowed) {
            revert StatusUnchanged(token, allowed);
        }

        allowedTokens[token] = allowed;

        if (allowed) {
            allowedTokenIndexPlusOne[token] = allowedTokenList.length + 1;
            allowedTokenList.push(token);
        } else {
            uint256 indexPlusOne = allowedTokenIndexPlusOne[token];
            uint256 index = indexPlusOne - 1;
            uint256 lastIndex = allowedTokenList.length - 1;

            if (index != lastIndex) {
                address movedToken = allowedTokenList[lastIndex];
                allowedTokenList[index] = movedToken;
                allowedTokenIndexPlusOne[movedToken] = index + 1;
            }

            allowedTokenList.pop();
            delete allowedTokenIndexPlusOne[token];
        }

        emit TokenStatusUpdated(token, allowed);
    }
}
