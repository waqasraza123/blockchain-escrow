// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract ArbitratorRegistry {
    error ApprovalUnchanged(address arbitrator, bool approved);
    error IndexOutOfBounds(uint256 index, uint256 length);
    error InvalidNewOwner(address newOwner);
    error LengthMismatch(uint256 arbitratorsLength, uint256 statusesLength);
    error NoPendingOwner();
    error Unauthorized(address caller);
    error ZeroAddressArbitrator();

    event ArbitratorApprovalUpdated(address indexed arbitrator, bool indexed approved);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    address public owner;
    address public pendingOwner;

    mapping(address arbitrator => bool approved) private approvedArbitrators;
    mapping(address arbitrator => uint256 indexPlusOne) private approvedArbitratorIndexPlusOne;
    address[] private approvedArbitratorList;

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

    function isApprovedArbitrator(address arbitrator) external view returns (bool) {
        return approvedArbitrators[arbitrator];
    }

    function approvedArbitratorCount() external view returns (uint256) {
        return approvedArbitratorList.length;
    }

    function approvedArbitratorAt(uint256 index) external view returns (address) {
        uint256 length = approvedArbitratorList.length;

        if (index >= length) {
            revert IndexOutOfBounds(index, length);
        }

        return approvedArbitratorList[index];
    }

    function getApprovedArbitrators() external view returns (address[] memory) {
        return approvedArbitratorList;
    }

    function setArbitratorApproved(address arbitrator, bool approved) external onlyOwner {
        _setArbitratorApproved(arbitrator, approved);
    }

    function batchSetArbitratorApproved(address[] calldata arbitrators, bool[] calldata statuses) external onlyOwner {
        uint256 length = arbitrators.length;

        if (length != statuses.length) {
            revert LengthMismatch(length, statuses.length);
        }

        for (uint256 i = 0; i < length; ++i) {
            _setArbitratorApproved(arbitrators[i], statuses[i]);
        }
    }

    function _setArbitratorApproved(address arbitrator, bool approved) internal {
        if (arbitrator == address(0)) {
            revert ZeroAddressArbitrator();
        }

        bool currentStatus = approvedArbitrators[arbitrator];

        if (currentStatus == approved) {
            revert ApprovalUnchanged(arbitrator, approved);
        }

        approvedArbitrators[arbitrator] = approved;

        if (approved) {
            approvedArbitratorIndexPlusOne[arbitrator] = approvedArbitratorList.length + 1;
            approvedArbitratorList.push(arbitrator);
        } else {
            uint256 indexPlusOne = approvedArbitratorIndexPlusOne[arbitrator];
            uint256 index = indexPlusOne - 1;
            uint256 lastIndex = approvedArbitratorList.length - 1;

            if (index != lastIndex) {
                address movedArbitrator = approvedArbitratorList[lastIndex];
                approvedArbitratorList[index] = movedArbitrator;
                approvedArbitratorIndexPlusOne[movedArbitrator] = index + 1;
            }

            approvedArbitratorList.pop();
            delete approvedArbitratorIndexPlusOne[arbitrator];
        }

        emit ArbitratorApprovalUpdated(arbitrator, approved);
    }
}
