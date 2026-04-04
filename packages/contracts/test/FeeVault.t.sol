// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {FeeVault} from "../src/core/FeeVault.sol";

contract MockErc20 {
    mapping(address account => uint256 balance) private balances;

    function mint(address account, uint256 amount) external {
        balances[account] += amount;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 senderBalance = balances[msg.sender];

        require(senderBalance >= value, "insufficient balance");

        balances[msg.sender] = senderBalance - value;
        balances[to] += value;

        return true;
    }
}

contract FalseReturningErc20 {
    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }
}

contract FeeVaultActor {
    function transferOwnership(FeeVault vault, address newOwner) external {
        vault.transferOwnership(newOwner);
    }

    function acceptOwnership(FeeVault vault) external {
        vault.acceptOwnership();
    }

    function setTreasury(FeeVault vault, address newTreasury) external {
        vault.setTreasury(newTreasury);
    }

    function withdrawTokenFees(FeeVault vault, address token, uint256 amount) external {
        vault.withdrawTokenFees(token, amount);
    }

    function withdrawNativeFees(FeeVault vault, uint256 amount) external {
        vault.withdrawNativeFees(amount);
    }
}

contract AcceptingReceiver {
    receive() external payable {}
}

contract RejectingReceiver {}

contract FeeVaultTest {
    FeeVault private vault;
    FeeVaultActor private outsider;
    FeeVaultActor private pendingOwner;
    MockErc20 private token;
    FalseReturningErc20 private falseReturningToken;
    AcceptingReceiver private acceptingReceiver;
    RejectingReceiver private rejectingReceiver;

    uint256 private constant TOKEN_AMOUNT = 250e6;
    uint256 private constant NATIVE_AMOUNT = 1 ether;

    function setUp() public {
        vault = new FeeVault();
        outsider = new FeeVaultActor();
        pendingOwner = new FeeVaultActor();
        token = new MockErc20();
        falseReturningToken = new FalseReturningErc20();
        acceptingReceiver = new AcceptingReceiver();
        rejectingReceiver = new RejectingReceiver();
    }

    function testInitializesOwnerAndDefaultState() external view {
        require(vault.owner() == address(this), "owner mismatch");
        require(vault.pendingOwner() == address(0), "pending owner mismatch");
        require(vault.treasury() == address(0), "treasury mismatch");
        require(vault.nativeBalance() == 0, "native balance mismatch");
    }

    function testOwnerCanSetTreasuryAndWithdrawTokenFees() external {
        vault.setTreasury(address(acceptingReceiver));
        token.mint(address(vault), TOKEN_AMOUNT);

        require(vault.tokenBalance(address(token)) == TOKEN_AMOUNT, "vault token balance mismatch");

        vault.withdrawTokenFees(address(token), TOKEN_AMOUNT);

        require(vault.tokenBalance(address(token)) == 0, "vault token balance should be empty");
        require(token.balanceOf(address(acceptingReceiver)) == TOKEN_AMOUNT, "treasury token balance mismatch");
    }

    function testOwnerCanWithdrawNativeFees() external {
        vault.setTreasury(address(acceptingReceiver));
        payable(address(vault)).transfer(NATIVE_AMOUNT);

        require(vault.nativeBalance() == NATIVE_AMOUNT, "vault native balance mismatch");

        vault.withdrawNativeFees(NATIVE_AMOUNT);

        require(vault.nativeBalance() == 0, "vault native balance should be empty");
        require(address(acceptingReceiver).balance == NATIVE_AMOUNT, "treasury native balance mismatch");
    }

    function testOnlyOwnerCanMutateVault() external {
        _expectCustomError(
            _callSetTreasuryFromActor(outsider, address(acceptingReceiver)), FeeVault.Unauthorized.selector
        );
        _expectCustomError(
            _callWithdrawTokenFeesFromActor(outsider, address(token), TOKEN_AMOUNT), FeeVault.Unauthorized.selector
        );
        _expectCustomError(_callWithdrawNativeFeesFromActor(outsider, NATIVE_AMOUNT), FeeVault.Unauthorized.selector);
    }

    function testRejectsInvalidTreasuryTokenAndAmount() external {
        _expectCustomError(_callSetTreasury(address(0)), FeeVault.InvalidTreasury.selector);
        _expectCustomError(_callTokenBalance(address(0)), FeeVault.InvalidToken.selector);
        _expectCustomError(_callWithdrawTokenFees(address(0), TOKEN_AMOUNT), FeeVault.InvalidToken.selector);
        _expectCustomError(_callWithdrawTokenFees(address(token), 0), FeeVault.InvalidAmount.selector);
        _expectCustomError(_callWithdrawNativeFees(0), FeeVault.InvalidAmount.selector);
    }

    function testRejectsTreasuryNotSetAndUnchangedTreasury() external {
        _expectCustomError(_callWithdrawTokenFees(address(token), TOKEN_AMOUNT), FeeVault.TreasuryNotSet.selector);
        _expectCustomError(_callWithdrawNativeFees(NATIVE_AMOUNT), FeeVault.TreasuryNotSet.selector);

        vault.setTreasury(address(acceptingReceiver));

        _expectCustomError(_callSetTreasury(address(acceptingReceiver)), FeeVault.TreasuryUnchanged.selector);
    }

    function testRejectsFailedTransfers() external {
        vault.setTreasury(address(acceptingReceiver));

        _expectCustomError(
            _callWithdrawTokenFees(address(falseReturningToken), TOKEN_AMOUNT), FeeVault.Erc20TransferFailed.selector
        );

        vault.setTreasury(address(rejectingReceiver));
        payable(address(vault)).transfer(NATIVE_AMOUNT);

        _expectCustomError(_callWithdrawNativeFees(NATIVE_AMOUNT), FeeVault.NativeTransferFailed.selector);
    }

    function testRejectsInvalidOwnershipTransferTargets() external {
        _expectCustomError(_callTransferOwnership(address(0)), FeeVault.InvalidNewOwner.selector);
        _expectCustomError(_callTransferOwnership(address(this)), FeeVault.InvalidNewOwner.selector);
    }

    function testOwnershipTransferRequiresPendingOwnerAcceptance() external {
        vault.transferOwnership(address(pendingOwner));

        require(vault.pendingOwner() == address(pendingOwner), "pending owner not set");

        _expectCustomError(_callAcceptOwnershipFromActor(outsider), FeeVault.Unauthorized.selector);

        pendingOwner.acceptOwnership(vault);

        require(vault.owner() == address(pendingOwner), "owner not updated");
        require(vault.pendingOwner() == address(0), "pending owner not cleared");

        _expectCustomError(_callSetTreasury(address(acceptingReceiver)), FeeVault.Unauthorized.selector);

        pendingOwner.setTreasury(vault, address(acceptingReceiver));
        require(vault.treasury() == address(acceptingReceiver), "new owner could not set treasury");
    }

    function testRejectsAcceptOwnershipWithoutPendingOwner() external {
        _expectCustomError(_callAcceptOwnership(), FeeVault.NoPendingOwner.selector);
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

    function _callAcceptOwnershipFromActor(FeeVaultActor actor) private returns (bytes memory) {
        try actor.acceptOwnership(vault) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTreasury(address newTreasury) private returns (bytes memory) {
        try this.callSetTreasury(newTreasury) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTreasuryFromActor(FeeVaultActor actor, address newTreasury) private returns (bytes memory) {
        try actor.setTreasury(vault, newTreasury) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callWithdrawTokenFees(address tokenAddress, uint256 amount) private returns (bytes memory) {
        try this.callWithdrawTokenFees(tokenAddress, amount) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callWithdrawTokenFeesFromActor(FeeVaultActor actor, address tokenAddress, uint256 amount)
        private
        returns (bytes memory)
    {
        try actor.withdrawTokenFees(vault, tokenAddress, amount) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callWithdrawNativeFees(uint256 amount) private returns (bytes memory) {
        try this.callWithdrawNativeFees(amount) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callWithdrawNativeFeesFromActor(FeeVaultActor actor, uint256 amount) private returns (bytes memory) {
        try actor.withdrawNativeFees(vault, amount) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callTokenBalance(address tokenAddress) private view returns (bytes memory) {
        try this.callTokenBalance(tokenAddress) {
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
        vault.transferOwnership(newOwner);
    }

    function callAcceptOwnership() external {
        vault.acceptOwnership();
    }

    function callSetTreasury(address newTreasury) external {
        vault.setTreasury(newTreasury);
    }

    function callWithdrawTokenFees(address tokenAddress, uint256 amount) external {
        vault.withdrawTokenFees(tokenAddress, amount);
    }

    function callWithdrawNativeFees(uint256 amount) external {
        vault.withdrawNativeFees(amount);
    }

    function callTokenBalance(address tokenAddress) external view returns (uint256) {
        return vault.tokenBalance(tokenAddress);
    }

    receive() external payable {}
}
