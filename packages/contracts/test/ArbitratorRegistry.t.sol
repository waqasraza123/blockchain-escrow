// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";

contract ArbitratorRegistryActor {
    function transferOwnership(ArbitratorRegistry registry, address newOwner) external {
        registry.transferOwnership(newOwner);
    }

    function acceptOwnership(ArbitratorRegistry registry) external {
        registry.acceptOwnership();
    }

    function setArbitratorApproved(ArbitratorRegistry registry, address arbitrator, bool approved) external {
        registry.setArbitratorApproved(arbitrator, approved);
    }

    function batchSetArbitratorApproved(
        ArbitratorRegistry registry,
        address[] calldata arbitrators,
        bool[] calldata statuses
    ) external {
        registry.batchSetArbitratorApproved(arbitrators, statuses);
    }
}

contract ArbitratorRegistryTest {
    ArbitratorRegistry private registry;
    ArbitratorRegistryActor private outsider;
    ArbitratorRegistryActor private pendingOwner;

    address private constant ARBITRATOR_A = address(0x2001);
    address private constant ARBITRATOR_B = address(0x2002);
    address private constant ARBITRATOR_C = address(0x2003);

    function setUp() public {
        registry = new ArbitratorRegistry();
        outsider = new ArbitratorRegistryActor();
        pendingOwner = new ArbitratorRegistryActor();
    }

    function testInitializesOwnerAndEmptyState() external view {
        require(registry.owner() == address(this), "owner mismatch");
        require(registry.pendingOwner() == address(0), "pending owner mismatch");
        require(registry.approvedArbitratorCount() == 0, "initial count mismatch");
        require(registry.getApprovedArbitrators().length == 0, "initial list mismatch");
    }

    function testOwnerCanApproveAndEnumerateArbitrators() external {
        registry.setArbitratorApproved(ARBITRATOR_A, true);
        registry.setArbitratorApproved(ARBITRATOR_B, true);

        require(registry.isApprovedArbitrator(ARBITRATOR_A), "arbitrator a should be approved");
        require(registry.isApprovedArbitrator(ARBITRATOR_B), "arbitrator b should be approved");
        require(registry.approvedArbitratorCount() == 2, "count mismatch");
        require(registry.approvedArbitratorAt(0) == ARBITRATOR_A, "arbitrator at 0 mismatch");
        require(registry.approvedArbitratorAt(1) == ARBITRATOR_B, "arbitrator at 1 mismatch");

        address[] memory arbitrators = registry.getApprovedArbitrators();
        require(arbitrators.length == 2, "listed arbitrator count mismatch");
        require(arbitrators[0] == ARBITRATOR_A, "listed arbitrator a mismatch");
        require(arbitrators[1] == ARBITRATOR_B, "listed arbitrator b mismatch");
    }

    function testOwnerCanRemoveArbitratorAndMaintainDenseEnumeration() external {
        registry.batchSetArbitratorApproved(_arbitratorBatch(), _approveBatch());
        registry.setArbitratorApproved(ARBITRATOR_B, false);

        require(!registry.isApprovedArbitrator(ARBITRATOR_B), "arbitrator b should be removed");
        require(registry.approvedArbitratorCount() == 2, "count after removal mismatch");

        address[] memory arbitrators = registry.getApprovedArbitrators();
        require(arbitrators.length == 2, "arbitrator list length mismatch");
        require(_contains(arbitrators, ARBITRATOR_A), "arbitrator a missing");
        require(_contains(arbitrators, ARBITRATOR_C), "arbitrator c missing");
    }

    function testBatchConfigurationSupportsApproveAndRemove() external {
        registry.batchSetArbitratorApproved(_arbitratorBatch(), _approveBatch());

        address[] memory updateArbitrators = new address[](2);
        bool[] memory updateStatuses = new bool[](2);
        updateArbitrators[0] = ARBITRATOR_A;
        updateArbitrators[1] = ARBITRATOR_C;
        updateStatuses[0] = false;
        updateStatuses[1] = false;

        registry.batchSetArbitratorApproved(updateArbitrators, updateStatuses);

        require(!registry.isApprovedArbitrator(ARBITRATOR_A), "arbitrator a should be removed");
        require(registry.isApprovedArbitrator(ARBITRATOR_B), "arbitrator b should remain");
        require(!registry.isApprovedArbitrator(ARBITRATOR_C), "arbitrator c should be removed");
        require(registry.approvedArbitratorCount() == 1, "count after batch update mismatch");
        require(registry.approvedArbitratorAt(0) == ARBITRATOR_B, "remaining arbitrator mismatch");
    }

    function testOnlyOwnerCanMutateRegistry() external {
        _expectCustomError(
            _callSetArbitratorApprovedFromActor(outsider, ARBITRATOR_A, true), ArbitratorRegistry.Unauthorized.selector
        );
    }

    function testRejectsZeroAddressAndUnchangedApproval() external {
        _expectCustomError(
            _callSetArbitratorApproved(address(0), true), ArbitratorRegistry.ZeroAddressArbitrator.selector
        );

        registry.setArbitratorApproved(ARBITRATOR_A, true);

        _expectCustomError(
            _callSetArbitratorApproved(ARBITRATOR_A, true), ArbitratorRegistry.ApprovalUnchanged.selector
        );
    }

    function testRejectsBatchLengthMismatch() external {
        address[] memory arbitrators = new address[](1);
        bool[] memory statuses = new bool[](2);
        arbitrators[0] = ARBITRATOR_A;
        statuses[0] = true;
        statuses[1] = false;

        _expectCustomError(
            _callBatchSetArbitratorApproved(arbitrators, statuses), ArbitratorRegistry.LengthMismatch.selector
        );
    }

    function testRejectsInvalidOwnershipTransferTargets() external {
        _expectCustomError(_callTransferOwnership(address(0)), ArbitratorRegistry.InvalidNewOwner.selector);
        _expectCustomError(_callTransferOwnership(address(this)), ArbitratorRegistry.InvalidNewOwner.selector);
    }

    function testOwnershipTransferRequiresPendingOwnerAcceptance() external {
        registry.transferOwnership(address(pendingOwner));

        require(registry.pendingOwner() == address(pendingOwner), "pending owner not set");

        _expectCustomError(_callAcceptOwnershipFromActor(outsider), ArbitratorRegistry.Unauthorized.selector);

        pendingOwner.acceptOwnership(registry);

        require(registry.owner() == address(pendingOwner), "owner not updated");
        require(registry.pendingOwner() == address(0), "pending owner not cleared");

        _expectCustomError(_callSetArbitratorApproved(ARBITRATOR_A, true), ArbitratorRegistry.Unauthorized.selector);

        pendingOwner.setArbitratorApproved(registry, ARBITRATOR_A, true);
        require(registry.isApprovedArbitrator(ARBITRATOR_A), "new owner could not approve arbitrator");
    }

    function testRejectsAcceptOwnershipWithoutPendingOwner() external {
        _expectCustomError(_callAcceptOwnership(), ArbitratorRegistry.NoPendingOwner.selector);
    }

    function testRejectsOutOfBoundsEnumerationAccess() external view {
        _expectCustomError(_callApprovedArbitratorAt(0), ArbitratorRegistry.IndexOutOfBounds.selector);
    }

    function _arbitratorBatch() private pure returns (address[] memory arbitrators) {
        arbitrators = new address[](3);
        arbitrators[0] = ARBITRATOR_A;
        arbitrators[1] = ARBITRATOR_B;
        arbitrators[2] = ARBITRATOR_C;
    }

    function _approveBatch() private pure returns (bool[] memory statuses) {
        statuses = new bool[](3);
        statuses[0] = true;
        statuses[1] = true;
        statuses[2] = true;
    }

    function _contains(address[] memory arbitrators, address expected) private pure returns (bool) {
        for (uint256 i = 0; i < arbitrators.length; ++i) {
            if (arbitrators[i] == expected) {
                return true;
            }
        }

        return false;
    }

    function _callTransferOwnership(address newOwner) private returns (bytes memory) {
        try this.callTransferOwnership(newOwner) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callAcceptOwnership() private returns (bytes memory) {
        try this.callAcceptOwnership() {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callAcceptOwnershipFromActor(ArbitratorRegistryActor actor) private returns (bytes memory) {
        try actor.acceptOwnership(registry) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetArbitratorApproved(address arbitrator, bool approved) private returns (bytes memory) {
        try this.callSetArbitratorApproved(arbitrator, approved) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetArbitratorApprovedFromActor(ArbitratorRegistryActor actor, address arbitrator, bool approved)
        private
        returns (bytes memory)
    {
        try actor.setArbitratorApproved(registry, arbitrator, approved) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callBatchSetArbitratorApproved(address[] memory arbitrators, bool[] memory statuses)
        private
        returns (bytes memory)
    {
        try this.callBatchSetArbitratorApproved(arbitrators, statuses) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callApprovedArbitratorAt(uint256 index) private view returns (bytes memory) {
        try this.callApprovedArbitratorAt(index) {
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

    function callTransferOwnership(address newOwner) external {
        registry.transferOwnership(newOwner);
    }

    function callAcceptOwnership() external {
        registry.acceptOwnership();
    }

    function callSetArbitratorApproved(address arbitrator, bool approved) external {
        registry.setArbitratorApproved(arbitrator, approved);
    }

    function callBatchSetArbitratorApproved(address[] calldata arbitrators, bool[] calldata statuses) external {
        registry.batchSetArbitratorApproved(arbitrators, statuses);
    }

    function callApprovedArbitratorAt(uint256 index) external view returns (address) {
        return registry.approvedArbitratorAt(index);
    }
}
