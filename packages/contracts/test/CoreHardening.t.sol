// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ArbitratorRegistry} from "../src/core/ArbitratorRegistry.sol";
import {FeeVault} from "../src/core/FeeVault.sol";
import {ProtocolConfig} from "../src/core/ProtocolConfig.sol";
import {TokenAllowlist} from "../src/core/TokenAllowlist.sol";

contract HardeningErc20 {
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

contract TokenAllowlistStatefulHardeningTest {
    address private constant TOKEN_A = address(0x6101);
    address private constant TOKEN_B = address(0x6102);
    address private constant TOKEN_C = address(0x6103);
    address private constant TOKEN_D = address(0x6104);

    function testFuzzMaintainsDenseEnumerationAcrossOperationSequence(uint256[] memory operationSeeds) external {
        TokenAllowlist allowlist = new TokenAllowlist();
        address[4] memory tokens = [TOKEN_A, TOKEN_B, TOKEN_C, TOKEN_D];
        bool[4] memory expectedAllowed;

        uint256 operationCount = _boundedOperationCount(operationSeeds.length, 32);

        for (uint256 index = 0; index < operationCount; ++index) {
            uint256 seed = operationSeeds[index];
            uint256 tokenIndex = seed % tokens.length;
            bool nextAllowed = ((seed >> 8) & 1) == 1;

            if (expectedAllowed[tokenIndex] != nextAllowed) {
                allowlist.setTokenAllowed(tokens[tokenIndex], nextAllowed);
                expectedAllowed[tokenIndex] = nextAllowed;
            }

            _assertAllowlistInvariant(allowlist, tokens, expectedAllowed);
        }
    }

    function _assertAllowlistInvariant(
        TokenAllowlist allowlist,
        address[4] memory tokens,
        bool[4] memory expectedAllowed
    ) private view {
        address[] memory listedTokens = allowlist.getAllowedTokens();
        uint256 expectedCount = _expectedTrueCount(expectedAllowed);

        require(allowlist.allowedTokenCount() == expectedCount, "allowlist count mismatch");
        require(listedTokens.length == expectedCount, "allowlist list length mismatch");

        for (uint256 tokenIndex = 0; tokenIndex < tokens.length; ++tokenIndex) {
            bool actualAllowed = allowlist.isAllowedToken(tokens[tokenIndex]);
            require(actualAllowed == expectedAllowed[tokenIndex], "allowlist status mismatch");
            require(
                _containsToken(listedTokens, tokens[tokenIndex]) == expectedAllowed[tokenIndex],
                "allowlist membership mismatch"
            );
        }

        for (uint256 listedIndex = 0; listedIndex < listedTokens.length; ++listedIndex) {
            require(
                allowlist.allowedTokenAt(listedIndex) == listedTokens[listedIndex], "allowlist enumeration mismatch"
            );
            require(_countTokenOccurrences(listedTokens, listedTokens[listedIndex]) == 1, "allowlist duplicate token");
        }
    }

    function _expectedTrueCount(bool[4] memory values) private pure returns (uint256 count) {
        for (uint256 index = 0; index < values.length; ++index) {
            if (values[index]) {
                ++count;
            }
        }
    }

    function _containsToken(address[] memory tokens, address expectedToken) private pure returns (bool) {
        for (uint256 index = 0; index < tokens.length; ++index) {
            if (tokens[index] == expectedToken) {
                return true;
            }
        }

        return false;
    }

    function _countTokenOccurrences(address[] memory tokens, address expectedToken)
        private
        pure
        returns (uint256 count)
    {
        for (uint256 index = 0; index < tokens.length; ++index) {
            if (tokens[index] == expectedToken) {
                ++count;
            }
        }
    }

    function _boundedOperationCount(uint256 originalLength, uint256 maxLength) private pure returns (uint256) {
        if (originalLength < maxLength) {
            return originalLength;
        }

        return maxLength;
    }
}

contract ArbitratorRegistryStatefulHardeningTest {
    address private constant ARBITRATOR_A = address(0x6201);
    address private constant ARBITRATOR_B = address(0x6202);
    address private constant ARBITRATOR_C = address(0x6203);
    address private constant ARBITRATOR_D = address(0x6204);

    function testFuzzMaintainsDenseEnumerationAcrossOperationSequence(uint256[] memory operationSeeds) external {
        ArbitratorRegistry registry = new ArbitratorRegistry();
        address[4] memory arbitrators = [ARBITRATOR_A, ARBITRATOR_B, ARBITRATOR_C, ARBITRATOR_D];
        bool[4] memory expectedApproved;

        uint256 operationCount = _boundedOperationCount(operationSeeds.length, 32);

        for (uint256 index = 0; index < operationCount; ++index) {
            uint256 seed = operationSeeds[index];
            uint256 arbitratorIndex = seed % arbitrators.length;
            bool nextApproved = ((seed >> 8) & 1) == 1;

            if (expectedApproved[arbitratorIndex] != nextApproved) {
                registry.setArbitratorApproved(arbitrators[arbitratorIndex], nextApproved);
                expectedApproved[arbitratorIndex] = nextApproved;
            }

            _assertRegistryInvariant(registry, arbitrators, expectedApproved);
        }
    }

    function _assertRegistryInvariant(
        ArbitratorRegistry registry,
        address[4] memory arbitrators,
        bool[4] memory expectedApproved
    ) private view {
        address[] memory listedArbitrators = registry.getApprovedArbitrators();
        uint256 expectedCount = _expectedTrueCount(expectedApproved);

        require(registry.approvedArbitratorCount() == expectedCount, "registry count mismatch");
        require(listedArbitrators.length == expectedCount, "registry list length mismatch");

        for (uint256 arbitratorIndex = 0; arbitratorIndex < arbitrators.length; ++arbitratorIndex) {
            bool actualApproved = registry.isApprovedArbitrator(arbitrators[arbitratorIndex]);
            require(actualApproved == expectedApproved[arbitratorIndex], "registry status mismatch");
            require(
                _containsArbitrator(listedArbitrators, arbitrators[arbitratorIndex])
                    == expectedApproved[arbitratorIndex],
                "registry membership mismatch"
            );
        }

        for (uint256 listedIndex = 0; listedIndex < listedArbitrators.length; ++listedIndex) {
            require(
                registry.approvedArbitratorAt(listedIndex) == listedArbitrators[listedIndex],
                "registry enumeration mismatch"
            );
            require(
                _countArbitratorOccurrences(listedArbitrators, listedArbitrators[listedIndex]) == 1,
                "registry duplicate arbitrator"
            );
        }
    }

    function _expectedTrueCount(bool[4] memory values) private pure returns (uint256 count) {
        for (uint256 index = 0; index < values.length; ++index) {
            if (values[index]) {
                ++count;
            }
        }
    }

    function _containsArbitrator(address[] memory arbitrators, address expectedArbitrator)
        private
        pure
        returns (bool)
    {
        for (uint256 index = 0; index < arbitrators.length; ++index) {
            if (arbitrators[index] == expectedArbitrator) {
                return true;
            }
        }

        return false;
    }

    function _countArbitratorOccurrences(address[] memory arbitrators, address expectedArbitrator)
        private
        pure
        returns (uint256 count)
    {
        for (uint256 index = 0; index < arbitrators.length; ++index) {
            if (arbitrators[index] == expectedArbitrator) {
                ++count;
            }
        }
    }

    function _boundedOperationCount(uint256 originalLength, uint256 maxLength) private pure returns (uint256) {
        if (originalLength < maxLength) {
            return originalLength;
        }

        return maxLength;
    }
}

contract ProtocolConfigFuzzHardeningTest {
    function testFuzzMaintainsConfigurationInvariants(uint256[] memory operationSeeds) external {
        ProtocolConfig config = new ProtocolConfig();

        address expectedTokenAllowlist = address(0);
        address expectedArbitratorRegistry = address(0);
        address expectedFeeVault = address(0);
        address expectedTreasury = address(0);
        uint16 expectedProtocolFeeBps = 0;
        bool expectedCreateEscrowPaused = false;
        bool expectedFundingPaused = false;

        uint256 operationCount = _boundedOperationCount(operationSeeds.length, 48);

        for (uint256 index = 0; index < operationCount; ++index) {
            uint256 seed = operationSeeds[index];
            uint256 operationKind = seed % 7;

            if (operationKind == 0) {
                address nextTokenAllowlist = _derivedAddress(seed, 1);
                if (nextTokenAllowlist != expectedTokenAllowlist) {
                    config.setTokenAllowlist(nextTokenAllowlist);
                    expectedTokenAllowlist = nextTokenAllowlist;
                }
            } else if (operationKind == 1) {
                address nextArbitratorRegistry = _derivedAddress(seed, 2);
                if (nextArbitratorRegistry != expectedArbitratorRegistry) {
                    config.setArbitratorRegistry(nextArbitratorRegistry);
                    expectedArbitratorRegistry = nextArbitratorRegistry;
                }
            } else if (operationKind == 2) {
                address nextFeeVault = _derivedAddress(seed, 3);
                if (nextFeeVault != expectedFeeVault) {
                    config.setFeeVault(nextFeeVault);
                    expectedFeeVault = nextFeeVault;
                }
            } else if (operationKind == 3) {
                address nextTreasury = _derivedAddress(seed, 4);
                if (nextTreasury != expectedTreasury) {
                    config.setTreasury(nextTreasury);
                    expectedTreasury = nextTreasury;
                }
            } else if (operationKind == 4) {
                uint16 nextProtocolFeeBps = uint16(seed % (uint256(config.MAX_PROTOCOL_FEE_BPS()) + 1));
                if (nextProtocolFeeBps != expectedProtocolFeeBps) {
                    config.setProtocolFeeBps(nextProtocolFeeBps);
                    expectedProtocolFeeBps = nextProtocolFeeBps;
                }
            } else if (operationKind == 5) {
                bool nextCreateEscrowPaused = ((seed >> 8) & 1) == 1;
                if (nextCreateEscrowPaused != expectedCreateEscrowPaused) {
                    config.setCreateEscrowPaused(nextCreateEscrowPaused);
                    expectedCreateEscrowPaused = nextCreateEscrowPaused;
                }
            } else {
                bool nextFundingPaused = ((seed >> 9) & 1) == 1;
                if (nextFundingPaused != expectedFundingPaused) {
                    config.setFundingPaused(nextFundingPaused);
                    expectedFundingPaused = nextFundingPaused;
                }
            }

            require(config.tokenAllowlist() == expectedTokenAllowlist, "protocol token allowlist mismatch");
            require(config.arbitratorRegistry() == expectedArbitratorRegistry, "protocol arbitrator registry mismatch");
            require(config.feeVault() == expectedFeeVault, "protocol fee vault mismatch");
            require(config.treasury() == expectedTreasury, "protocol treasury mismatch");
            require(config.protocolFeeBps() == expectedProtocolFeeBps, "protocol fee mismatch");
            require(config.protocolFeeBps() <= config.MAX_PROTOCOL_FEE_BPS(), "protocol fee above max");
            require(config.createEscrowPaused() == expectedCreateEscrowPaused, "create pause mismatch");
            require(config.fundingPaused() == expectedFundingPaused, "funding pause mismatch");
        }
    }

    function _derivedAddress(uint256 seed, uint256 salt) private pure returns (address) {
        address candidate = address(uint160(uint256(keccak256(abi.encode(seed, salt)))));

        if (candidate == address(0)) {
            return address(uint160(salt));
        }

        return candidate;
    }

    function _boundedOperationCount(uint256 originalLength, uint256 maxLength) private pure returns (uint256) {
        if (originalLength < maxLength) {
            return originalLength;
        }

        return maxLength;
    }
}

contract FeeVaultTokenFuzzHardeningTest {
    address private constant TREASURY_A = address(0x6301);
    address private constant TREASURY_B = address(0x6302);

    function testFuzzConservesTokenBalancesAcrossDepositsWithdrawalsAndTreasuryChanges(uint256[] memory operationSeeds)
        external
    {
        FeeVault vault = new FeeVault();
        HardeningErc20 token = new HardeningErc20();

        address currentTreasury = TREASURY_A;
        uint256 expectedVaultBalance = 0;
        uint256 expectedTreasuryABalance = 0;
        uint256 expectedTreasuryBBalance = 0;

        vault.setTreasury(currentTreasury);

        uint256 operationCount = _boundedOperationCount(operationSeeds.length, 40);

        for (uint256 index = 0; index < operationCount; ++index) {
            uint256 seed = operationSeeds[index];
            uint256 operationKind = seed % 3;

            if (operationKind == 0) {
                address nextTreasury = ((seed >> 8) & 1) == 1 ? TREASURY_B : TREASURY_A;
                if (nextTreasury != currentTreasury) {
                    vault.setTreasury(nextTreasury);
                    currentTreasury = nextTreasury;
                }
            } else if (operationKind == 1) {
                uint256 depositAmount = _boundedPositiveAmount(seed);
                token.mint(address(vault), depositAmount);
                expectedVaultBalance += depositAmount;
            } else if (expectedVaultBalance > 0) {
                uint256 withdrawalAmount = (seed % expectedVaultBalance) + 1;
                vault.withdrawTokenFees(address(token), withdrawalAmount);
                expectedVaultBalance -= withdrawalAmount;

                if (currentTreasury == TREASURY_A) {
                    expectedTreasuryABalance += withdrawalAmount;
                } else {
                    expectedTreasuryBBalance += withdrawalAmount;
                }
            }

            require(vault.tokenBalance(address(token)) == expectedVaultBalance, "vault token balance mismatch");
            require(token.balanceOf(TREASURY_A) == expectedTreasuryABalance, "treasury a token balance mismatch");
            require(token.balanceOf(TREASURY_B) == expectedTreasuryBBalance, "treasury b token balance mismatch");
            require(
                expectedVaultBalance + expectedTreasuryABalance + expectedTreasuryBBalance
                    == token.balanceOf(address(vault)) + token.balanceOf(TREASURY_A) + token.balanceOf(TREASURY_B),
                "token conservation mismatch"
            );
        }
    }

    function _boundedPositiveAmount(uint256 seed) private pure returns (uint256) {
        return (seed % 1_000_000) + 1;
    }

    function _boundedOperationCount(uint256 originalLength, uint256 maxLength) private pure returns (uint256) {
        if (originalLength < maxLength) {
            return originalLength;
        }

        return maxLength;
    }
}
