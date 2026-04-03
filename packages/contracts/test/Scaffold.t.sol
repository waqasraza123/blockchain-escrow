// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";
import {EscrowAgreement} from "../src/escrow/EscrowAgreement.sol";
import {EscrowFactory} from "../src/escrow/EscrowFactory.sol";

contract ScaffoldTest {
    function testDeployPlaceholderContracts() external {
        new TokenAllowlist();
        new ArbitratorRegistry();
        new ProtocolConfig();
        new FeeVault();
        new EscrowAgreement();
        new EscrowFactory();
    }
}
