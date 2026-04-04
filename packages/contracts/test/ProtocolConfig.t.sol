// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";

contract ProtocolConfigActor {
    function transferOwnership(ProtocolConfig config, address newOwner) external {
        config.transferOwnership(newOwner);
    }

    function acceptOwnership(ProtocolConfig config) external {
        config.acceptOwnership();
    }

    function setTokenAllowlist(ProtocolConfig config, address newTokenAllowlist) external {
        config.setTokenAllowlist(newTokenAllowlist);
    }

    function setArbitratorRegistry(ProtocolConfig config, address newArbitratorRegistry) external {
        config.setArbitratorRegistry(newArbitratorRegistry);
    }

    function setFeeVault(ProtocolConfig config, address newFeeVault) external {
        config.setFeeVault(newFeeVault);
    }

    function setTreasury(ProtocolConfig config, address newTreasury) external {
        config.setTreasury(newTreasury);
    }

    function setProtocolFeeBps(ProtocolConfig config, uint16 newProtocolFeeBps) external {
        config.setProtocolFeeBps(newProtocolFeeBps);
    }

    function setCreateEscrowPaused(ProtocolConfig config, bool newCreateEscrowPaused) external {
        config.setCreateEscrowPaused(newCreateEscrowPaused);
    }

    function setFundingPaused(ProtocolConfig config, bool newFundingPaused) external {
        config.setFundingPaused(newFundingPaused);
    }
}

contract ProtocolConfigTest {
    ProtocolConfig private config;
    ProtocolConfigActor private outsider;
    ProtocolConfigActor private pendingOwner;

    address private constant TOKEN_ALLOWLIST = address(0x3001);
    address private constant ARBITRATOR_REGISTRY = address(0x3002);
    address private constant FEE_VAULT = address(0x3003);
    address private constant TREASURY = address(0x3004);
    uint16 private constant PROTOCOL_FEE_BPS = 250;

    function setUp() public {
        config = new ProtocolConfig();
        outsider = new ProtocolConfigActor();
        pendingOwner = new ProtocolConfigActor();
    }

    function testInitializesOwnerAndDefaultState() external view {
        require(config.owner() == address(this), "owner mismatch");
        require(config.pendingOwner() == address(0), "pending owner mismatch");
        require(config.tokenAllowlist() == address(0), "token allowlist mismatch");
        require(config.arbitratorRegistry() == address(0), "arbitrator registry mismatch");
        require(config.feeVault() == address(0), "fee vault mismatch");
        require(config.treasury() == address(0), "treasury mismatch");
        require(config.protocolFeeBps() == 0, "protocol fee mismatch");
        require(!config.createEscrowPaused(), "create pause mismatch");
        require(!config.fundingPaused(), "funding pause mismatch");
        require(config.MAX_PROTOCOL_FEE_BPS() == 10_000, "max protocol fee mismatch");
    }

    function testOwnerCanSetDependencyAddresses() external {
        config.setTokenAllowlist(TOKEN_ALLOWLIST);
        config.setArbitratorRegistry(ARBITRATOR_REGISTRY);
        config.setFeeVault(FEE_VAULT);

        require(config.tokenAllowlist() == TOKEN_ALLOWLIST, "token allowlist not updated");
        require(config.arbitratorRegistry() == ARBITRATOR_REGISTRY, "arbitrator registry not updated");
        require(config.feeVault() == FEE_VAULT, "fee vault not updated");
    }

    function testOwnerCanSetTreasuryAndProtocolFee() external {
        config.setTreasury(TREASURY);
        config.setProtocolFeeBps(PROTOCOL_FEE_BPS);

        require(config.treasury() == TREASURY, "treasury not updated");
        require(config.protocolFeeBps() == PROTOCOL_FEE_BPS, "protocol fee not updated");
    }

    function testOwnerCanSetPauseFlags() external {
        config.setCreateEscrowPaused(true);
        config.setFundingPaused(true);

        require(config.createEscrowPaused(), "create pause not updated");
        require(config.fundingPaused(), "funding pause not updated");

        config.setCreateEscrowPaused(false);
        config.setFundingPaused(false);

        require(!config.createEscrowPaused(), "create pause not cleared");
        require(!config.fundingPaused(), "funding pause not cleared");
    }

    function testOnlyOwnerCanMutateConfig() external {
        _expectCustomError(
            _callSetTokenAllowlistFromActor(outsider, TOKEN_ALLOWLIST), ProtocolConfig.Unauthorized.selector
        );
        _expectCustomError(
            _callSetArbitratorRegistryFromActor(outsider, ARBITRATOR_REGISTRY), ProtocolConfig.Unauthorized.selector
        );
        _expectCustomError(_callSetFeeVaultFromActor(outsider, FEE_VAULT), ProtocolConfig.Unauthorized.selector);
        _expectCustomError(_callSetTreasuryFromActor(outsider, TREASURY), ProtocolConfig.Unauthorized.selector);
        _expectCustomError(
            _callSetProtocolFeeBpsFromActor(outsider, PROTOCOL_FEE_BPS), ProtocolConfig.Unauthorized.selector
        );
        _expectCustomError(_callSetCreateEscrowPausedFromActor(outsider, true), ProtocolConfig.Unauthorized.selector);
        _expectCustomError(_callSetFundingPausedFromActor(outsider, true), ProtocolConfig.Unauthorized.selector);
    }

    function testRejectsZeroAddressDependencies() external {
        _expectCustomError(_callSetTokenAllowlist(address(0)), ProtocolConfig.InvalidTokenAllowlist.selector);
        _expectCustomError(_callSetArbitratorRegistry(address(0)), ProtocolConfig.InvalidArbitratorRegistry.selector);
        _expectCustomError(_callSetFeeVault(address(0)), ProtocolConfig.InvalidFeeVault.selector);
        _expectCustomError(_callSetTreasury(address(0)), ProtocolConfig.InvalidTreasury.selector);
    }

    function testRejectsInvalidAndUnchangedProtocolFee() external {
        _expectCustomError(_callSetProtocolFeeBps(10_001), ProtocolConfig.InvalidProtocolFeeBps.selector);

        config.setProtocolFeeBps(PROTOCOL_FEE_BPS);

        _expectCustomError(_callSetProtocolFeeBps(PROTOCOL_FEE_BPS), ProtocolConfig.ProtocolFeeBpsUnchanged.selector);
    }

    function testRejectsUnchangedAddressAndPauseValues() external {
        config.setTokenAllowlist(TOKEN_ALLOWLIST);
        config.setArbitratorRegistry(ARBITRATOR_REGISTRY);
        config.setFeeVault(FEE_VAULT);
        config.setTreasury(TREASURY);
        config.setCreateEscrowPaused(true);
        config.setFundingPaused(true);

        _expectCustomError(_callSetTokenAllowlist(TOKEN_ALLOWLIST), ProtocolConfig.TokenAllowlistUnchanged.selector);
        _expectCustomError(
            _callSetArbitratorRegistry(ARBITRATOR_REGISTRY), ProtocolConfig.ArbitratorRegistryUnchanged.selector
        );
        _expectCustomError(_callSetFeeVault(FEE_VAULT), ProtocolConfig.FeeVaultUnchanged.selector);
        _expectCustomError(_callSetTreasury(TREASURY), ProtocolConfig.TreasuryUnchanged.selector);
        _expectCustomError(_callSetCreateEscrowPaused(true), ProtocolConfig.CreateEscrowPauseUnchanged.selector);
        _expectCustomError(_callSetFundingPaused(true), ProtocolConfig.FundingPauseUnchanged.selector);
    }

    function testRejectsInvalidOwnershipTransferTargets() external {
        _expectCustomError(_callTransferOwnership(address(0)), ProtocolConfig.InvalidNewOwner.selector);
        _expectCustomError(_callTransferOwnership(address(this)), ProtocolConfig.InvalidNewOwner.selector);
    }

    function testOwnershipTransferRequiresPendingOwnerAcceptance() external {
        config.transferOwnership(address(pendingOwner));

        require(config.pendingOwner() == address(pendingOwner), "pending owner not set");

        _expectCustomError(_callAcceptOwnershipFromActor(outsider), ProtocolConfig.Unauthorized.selector);

        pendingOwner.acceptOwnership(config);

        require(config.owner() == address(pendingOwner), "owner not updated");
        require(config.pendingOwner() == address(0), "pending owner not cleared");

        _expectCustomError(_callSetTreasury(TREASURY), ProtocolConfig.Unauthorized.selector);

        pendingOwner.setTreasury(config, TREASURY);
        require(config.treasury() == TREASURY, "new owner could not set treasury");
    }

    function testRejectsAcceptOwnershipWithoutPendingOwner() external {
        _expectCustomError(_callAcceptOwnership(), ProtocolConfig.NoPendingOwner.selector);
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

    function _callAcceptOwnershipFromActor(ProtocolConfigActor actor) private returns (bytes memory) {
        try actor.acceptOwnership(config) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTokenAllowlist(address newTokenAllowlist) private returns (bytes memory) {
        try this.callSetTokenAllowlist(newTokenAllowlist) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetTokenAllowlistFromActor(ProtocolConfigActor actor, address newTokenAllowlist)
        private
        returns (bytes memory)
    {
        try actor.setTokenAllowlist(config, newTokenAllowlist) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetArbitratorRegistry(address newArbitratorRegistry) private returns (bytes memory) {
        try this.callSetArbitratorRegistry(newArbitratorRegistry) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetArbitratorRegistryFromActor(ProtocolConfigActor actor, address newArbitratorRegistry)
        private
        returns (bytes memory)
    {
        try actor.setArbitratorRegistry(config, newArbitratorRegistry) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetFeeVault(address newFeeVault) private returns (bytes memory) {
        try this.callSetFeeVault(newFeeVault) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetFeeVaultFromActor(ProtocolConfigActor actor, address newFeeVault) private returns (bytes memory) {
        try actor.setFeeVault(config, newFeeVault) {
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

    function _callSetTreasuryFromActor(ProtocolConfigActor actor, address newTreasury) private returns (bytes memory) {
        try actor.setTreasury(config, newTreasury) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetProtocolFeeBps(uint16 newProtocolFeeBps) private returns (bytes memory) {
        try this.callSetProtocolFeeBps(newProtocolFeeBps) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetProtocolFeeBpsFromActor(ProtocolConfigActor actor, uint16 newProtocolFeeBps)
        private
        returns (bytes memory)
    {
        try actor.setProtocolFeeBps(config, newProtocolFeeBps) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetCreateEscrowPaused(bool newCreateEscrowPaused) private returns (bytes memory) {
        try this.callSetCreateEscrowPaused(newCreateEscrowPaused) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetCreateEscrowPausedFromActor(ProtocolConfigActor actor, bool newCreateEscrowPaused)
        private
        returns (bytes memory)
    {
        try actor.setCreateEscrowPaused(config, newCreateEscrowPaused) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetFundingPaused(bool newFundingPaused) private returns (bytes memory) {
        try this.callSetFundingPaused(newFundingPaused) {
            revert("expected revert");
        } catch (bytes memory reason) {
            return reason;
        }
    }

    function _callSetFundingPausedFromActor(ProtocolConfigActor actor, bool newFundingPaused)
        private
        returns (bytes memory)
    {
        try actor.setFundingPaused(config, newFundingPaused) {
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
        config.transferOwnership(newOwner);
    }

    function callAcceptOwnership() external {
        config.acceptOwnership();
    }

    function callSetTokenAllowlist(address newTokenAllowlist) external {
        config.setTokenAllowlist(newTokenAllowlist);
    }

    function callSetArbitratorRegistry(address newArbitratorRegistry) external {
        config.setArbitratorRegistry(newArbitratorRegistry);
    }

    function callSetFeeVault(address newFeeVault) external {
        config.setFeeVault(newFeeVault);
    }

    function callSetTreasury(address newTreasury) external {
        config.setTreasury(newTreasury);
    }

    function callSetProtocolFeeBps(uint16 newProtocolFeeBps) external {
        config.setProtocolFeeBps(newProtocolFeeBps);
    }

    function callSetCreateEscrowPaused(bool newCreateEscrowPaused) external {
        config.setCreateEscrowPaused(newCreateEscrowPaused);
    }

    function callSetFundingPaused(bool newFundingPaused) external {
        config.setFundingPaused(newFundingPaused);
    }
}
