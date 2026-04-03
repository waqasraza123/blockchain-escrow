// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";

contract TokenAllowlistActor {
    function transferOwnership(TokenAllowlist allowlist, address newOwner) external {
        allowlist.transferOwnership(newOwner);
    }

    function acceptOwnership(TokenAllowlist allowlist) external {
        allowlist.acceptOwnership();
    }

    function setTokenAllowed(TokenAllowlist allowlist, address token, bool allowed) external {
        allowlist.setTokenAllowed(token, allowed);
    }

    function batchSetTokenAllowed(TokenAllowlist allowlist, address[] calldata tokens, bool[] calldata statuses)
        external
    {
        allowlist.batchSetTokenAllowed(tokens, statuses);
    }
}

contract TokenAllowlistTest {
    TokenAllowlist private allowlist;
    TokenAllowlistActor private outsider;
    TokenAllowlistActor private pendingOwner;

    address private constant TOKEN_A = address(0x1001);
    address private constant TOKEN_B = address(0x1002);
    address private constant TOKEN_C = address(0x1003);

    function setUp() public {
        allowlist = new TokenAllowlist();
        outsider = new TokenAllowlistActor();
        pendingOwner = new TokenAllowlistActor();
    }

    function testInitializesOwnerAndEmptyState() external view {
        require(allowlist.owner() == address(this), "owner mismatch");
        require(allowlist.pendingOwner() == address(0), "pending owner mismatch");
        require(allowlist.allowedTokenCount() == 0, "initial count mismatch");
        require(allowlist.getAllowedTokens().length == 0, "initial list mismatch");
    }

    function testOwnerCanAllowAndEnumerateTokens() external {
        allowlist.setTokenAllowed(TOKEN_A, true);
        allowlist.setTokenAllowed(TOKEN_B, true);

        require(allowlist.isAllowedToken(TOKEN_A), "token a should be allowed");
        require(allowlist.isAllowedToken(TOKEN_B), "token b should be allowed");
        require(allowlist.allowedTokenCount() == 2, "count mismatch");
        require(allowlist.allowedTokenAt(0) == TOKEN_A, "token at 0 mismatch");
        require(allowlist.allowedTokenAt(1) == TOKEN_B, "token at 1 mismatch");

        address[] memory tokens = allowlist.getAllowedTokens();
        require(tokens.length == 2, "listed token count mismatch");
        require(tokens[0] == TOKEN_A, "listed token a mismatch");
        require(tokens[1] == TOKEN_B, "listed token b mismatch");
    }

    function testOwnerCanRemoveTokenAndMaintainDenseEnumeration() external {
        allowlist.batchSetTokenAllowed(_tokenBatch(), _allowBatch());
        allowlist.setTokenAllowed(TOKEN_B, false);

        require(!allowlist.isAllowedToken(TOKEN_B), "token b should be removed");
        require(allowlist.allowedTokenCount() == 2, "count after removal mismatch");

        address[] memory tokens = allowlist.getAllowedTokens();
        require(tokens.length == 2, "token list length mismatch");
        require(_contains(tokens, TOKEN_A), "token a missing");
        require(_contains(tokens, TOKEN_C), "token c missing");
    }

    function testBatchConfigurationSupportsAddAndRemove() external {
        allowlist.batchSetTokenAllowed(_tokenBatch(), _allowBatch());

        address[] memory updateTokens = new address[](2);
        bool[] memory updateStatuses = new bool[](2);
        updateTokens[0] = TOKEN_A;
        updateTokens[1] = TOKEN_C;
        updateStatuses[0] = false;
        updateStatuses[1] = false;

        allowlist.batchSetTokenAllowed(updateTokens, updateStatuses);

        require(!allowlist.isAllowedToken(TOKEN_A), "token a should be removed");
        require(allowlist.isAllowedToken(TOKEN_B), "token b should remain");
        require(!allowlist.isAllowedToken(TOKEN_C), "token c should be removed");
        require(allowlist.allowedTokenCount() == 1, "count after batch update mismatch");
        require(allowlist.allowedTokenAt(0) == TOKEN_B, "remaining token mismatch");
    }

    function testOnlyOwnerCanMutateAllowlist() external {
        _expectCustomError(_callSetTokenAllowedFromActor(outsider, TOKEN_A, true), TokenAllowlist.Unauthorized.selector);
    }

    function testRejectsZeroAddressAndUnchangedStatus() external {
        _expectCustomError(_callSetTokenAllowed(address(0), true), TokenAllowlist.ZeroAddressToken.selector);

        allowlist.setTokenAllowed(TOKEN_A, true);

        _expectCustomError(_callSetTokenAllowed(TOKEN_A, true), TokenAllowlist.StatusUnchanged.selector);
    }

    function testRejectsBatchLengthMismatch() external {
        address[] memory tokens = new address[](1);
        bool[] memory statuses = new bool[](2);
        tokens[0] = TOKEN_A;
        statuses[0] = true;
        statuses[1] = false;

        _expectCustomError(_callBatchSetTokenAllowed(tokens, statuses), TokenAllowlist.LengthMismatch.selector);
    }

    function testRejectsInvalidOwnershipTransferTargets() external {
        _expectCustomError(_callTransferOwnership(address(0)), TokenAllowlist.InvalidNewOwner.selector);
        _expectCustomError(_callTransferOwnership(address(this)), TokenAllowlist.InvalidNewOwner.selector);
    }

    function testOwnershipTransferRequiresPendingOwnerAcceptance() external {
        allowlist.transferOwnership(address(pendingOwner));

        require(allowlist.pendingOwner() == address(pendingOwner), "pending owner not set");

        _expectCustomError(_callAcceptOwnershipFromActor(outsider), TokenAllowlist.Unauthorized.selector);

        pendingOwner.acceptOwnership(allowlist);

        require(allowlist.owner() == address(pendingOwner), "owner not updated");
        require(allowlist.pendingOwner() == address(0), "pending owner not cleared");

        _expectCustomError(_callSetTokenAllowed(TOKEN_A, true), TokenAllowlist.Unauthorized.selector);

        pendingOwner.setTokenAllowed(allowlist, TOKEN_A, true);
        require(allowlist.isAllowedToken(TOKEN_A), "new owner could not set token");
    }

    function testRejectsAcceptOwnershipWithoutPendingOwner() external {
        _expectCustomError(_callAcceptOwnership(), TokenAllowlist.NoPendingOwner.selector);
    }

    function testRejectsOutOfBoundsEnumerationAccess() external view {
        _expectCustomError(_callAllowedTokenAt(0), TokenAllowlist.IndexOutOfBounds.selector);
    }

    function _tokenBatch() private pure returns (address[] memory tokens) {
        tokens = new address[](3);
        tokens[0] = TOKEN_A;
        tokens[1] = TOKEN_B;
        tokens[2] = TOKEN_C;
    }

    function _allowBatch() private pure returns (bool[] memory statuses) {
        statuses = new bool[](3);
        statuses[0] = true;
        statuses[1] = true;
        statuses[2] = true;
    }

    function _contains(address[] memory tokens, address expected) private pure returns (bool) {
        for (uint256 i = 0; i < tokens.length; ++i) {
            if (tokens[i] == expected) {
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

    function _callAcceptOwnershipFromActor(TokenAllowlistActor actor) private returns (bytes memory) {
        try actor.acceptOwnership(allowlist) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTokenAllowed(address token, bool allowed) private returns (bytes memory) {
        try this.callSetTokenAllowed(token, allowed) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTokenAllowedFromActor(TokenAllowlistActor actor, address token, bool allowed)
        private
        returns (bytes memory)
    {
        try actor.setTokenAllowed(allowlist, token, allowed) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callBatchSetTokenAllowed(address[] memory tokens, bool[] memory statuses)
        private
        returns (bytes memory)
    {
        try this.callBatchSetTokenAllowed(tokens, statuses) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callAllowedTokenAt(uint256 index) private view returns (bytes memory) {
        try this.callAllowedTokenAt(index) {
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
        allowlist.transferOwnership(newOwner);
    }

    function callAcceptOwnership() external {
        allowlist.acceptOwnership();
    }

    function callSetTokenAllowed(address token, bool allowed) external {
        allowlist.setTokenAllowed(token, allowed);
    }

    function callBatchSetTokenAllowed(address[] calldata tokens, bool[] calldata statuses) external {
        allowlist.batchSetTokenAllowed(tokens, statuses);
    }

    function callAllowedTokenAt(uint256 index) external view returns (address) {
        return allowlist.allowedTokenAt(index);
    }
}
