import assert from "node:assert/strict";
import test from "node:test";

import {
  validateBaseSepoliaDeploymentManifest,
  validateDeploymentManifest
} from "./deployment-helpers.mjs";
import { verifyDeploymentManifestOnchain } from "./deployment-verifier.mjs";

const baseManifest = validateBaseSepoliaDeploymentManifest({
  chainId: 84532,
  network: "base-sepolia",
  contractVersion: 2,
  explorerUrl: "https://sepolia.basescan.org",
  deployedAt: "2026-04-11T06:13:58.078Z",
  deploymentStartBlock: "40059815",
  deployer: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
  owner: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
  pendingOwner: "0x573b6f6F84cdf764Ee25cCeEA673a4cd259abFDb",
  treasury: "0x573b6f6F84cdf764Ee25cCeEA673a4cd259abFDb",
  usdcToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  protocolFeeBps: 0,
  contracts: {
    TokenAllowlist: "0x9bcf5a5b5e1dd0599ee72175f65fa6cbbb71de8c",
    ArbitratorRegistry: "0x05d7e4a9580af50da81ec464b5001cc32c3df05b",
    ProtocolConfig: "0x462440c98eb9280986ba407eb03b9fb1c386ff8c",
    FeeVault: "0xb11586a31e73335a66d5b962225de82ea9fe91b0",
    EscrowAgreement: "0x9588c5a0bc4a65ec95ec21eb0fee5cb662912b41",
    EscrowFactory: "0xd3fb68579662c948484f955c343338747ceb2ffa"
  }
});

function createSuccessfulCommandRunner(manifest) {
  const outputs = new Map([
    [`code:${manifest.contracts.TokenAllowlist}`, "0x6000"],
    [`code:${manifest.contracts.ArbitratorRegistry}`, "0x6000"],
    [`code:${manifest.contracts.ProtocolConfig}`, "0x6000"],
    [`code:${manifest.contracts.FeeVault}`, "0x6000"],
    [`code:${manifest.contracts.EscrowAgreement}`, "0x6000"],
    [`code:${manifest.contracts.EscrowFactory}`, "0x6000"],
    [`call:${manifest.contracts.TokenAllowlist}:owner()(address):`, manifest.owner],
    [`call:${manifest.contracts.TokenAllowlist}:pendingOwner()(address):`, manifest.pendingOwner],
    [
      `call:${manifest.contracts.TokenAllowlist}:isAllowedToken(address)(bool):${manifest.usdcToken}`,
      "true"
    ],
    [`call:${manifest.contracts.ArbitratorRegistry}:owner()(address):`, manifest.owner],
    [
      `call:${manifest.contracts.ArbitratorRegistry}:pendingOwner()(address):`,
      manifest.pendingOwner
    ],
    [`call:${manifest.contracts.FeeVault}:owner()(address):`, manifest.owner],
    [`call:${manifest.contracts.FeeVault}:pendingOwner()(address):`, manifest.pendingOwner],
    [`call:${manifest.contracts.FeeVault}:treasury()(address):`, manifest.treasury],
    [`call:${manifest.contracts.ProtocolConfig}:owner()(address):`, manifest.owner],
    [
      `call:${manifest.contracts.ProtocolConfig}:pendingOwner()(address):`,
      manifest.pendingOwner
    ],
    [
      `call:${manifest.contracts.ProtocolConfig}:tokenAllowlist()(address):`,
      manifest.contracts.TokenAllowlist
    ],
    [
      `call:${manifest.contracts.ProtocolConfig}:arbitratorRegistry()(address):`,
      manifest.contracts.ArbitratorRegistry
    ],
    [
      `call:${manifest.contracts.ProtocolConfig}:feeVault()(address):`,
      manifest.contracts.FeeVault
    ],
    [`call:${manifest.contracts.ProtocolConfig}:treasury()(address):`, manifest.treasury],
    [
      `call:${manifest.contracts.ProtocolConfig}:protocolFeeBps()(uint16):`,
      String(manifest.protocolFeeBps)
    ],
    [`call:${manifest.contracts.ProtocolConfig}:createEscrowPaused()(bool):`, "false"],
    [`call:${manifest.contracts.ProtocolConfig}:fundingPaused()(bool):`, "false"],
    [`call:${manifest.contracts.EscrowAgreement}:initialized()(bool):`, "false"],
    [
      `call:${manifest.contracts.EscrowFactory}:agreementImplementation()(address):`,
      manifest.contracts.EscrowAgreement
    ],
    [
      `call:${manifest.contracts.EscrowFactory}:protocolConfig()(address):`,
      manifest.contracts.ProtocolConfig
    ]
  ]);

  return async function commandRunner(command, args) {
    if (command !== "cast") {
      throw new Error(`Unexpected command: ${command}`);
    }

    if (args[0] === "code") {
      const output = outputs.get(`code:${args[1]}`);
      if (!output) {
        throw new Error(`Missing mocked code output for ${args[1]}`);
      }
      return { stderr: "", stdout: `${output}\n` };
    }

    if (args[0] === "call") {
      const signature = args[2];
      const values = args.slice(3, -2);
      const output = outputs.get(
        `call:${args[1]}:${signature}:${values.join(",")}`
      );

      if (!output) {
        throw new Error(`Missing mocked call output for ${args[1]} ${signature}`);
      }

      return { stderr: "", stdout: `${output}\n` };
    }

    throw new Error(`Unexpected cast subcommand: ${args[0]}`);
  };
}

test("validateDeploymentManifest accepts non-sepolia manifests for generic verification", () => {
  const manifest = validateDeploymentManifest({
    ...baseManifest,
    chainId: 8453,
    network: "base",
    explorerUrl: "https://basescan.org"
  });

  assert.equal(manifest.chainId, 8453);
  assert.equal(manifest.network, "base");
  assert.equal(manifest.explorerUrl, "https://basescan.org");
});

test("verifyDeploymentManifestOnchain succeeds against a matching mocked deployment", async () => {
  const result = await verifyDeploymentManifestOnchain(
    baseManifest,
    "https://rpc.example.com",
    {
      commandRunner: createSuccessfulCommandRunner(baseManifest)
    }
  );

  assert.equal(result.chainId, 84532);
  assert.equal(result.network, "base-sepolia");
  assert.equal(result.contractsVerified, 6);
});

test("verifyDeploymentManifestOnchain fails when onchain protocol config points to a different treasury", async () => {
  const commandRunner = createSuccessfulCommandRunner(baseManifest);
  const mismatchingRunner = async (command, args, options) => {
    if (
      command === "cast" &&
      args[0] === "call" &&
      args[1] === baseManifest.contracts.ProtocolConfig &&
      args[2] === "treasury()(address)"
    ) {
      return {
        stderr: "",
        stdout: "0x1111111111111111111111111111111111111111\n"
      };
    }

    return commandRunner(command, args, options);
  };

  await assert.rejects(
    () =>
      verifyDeploymentManifestOnchain(baseManifest, "https://rpc.example.com", {
        commandRunner: mismatchingRunner
      }),
    /Verification failed/
  );
});
