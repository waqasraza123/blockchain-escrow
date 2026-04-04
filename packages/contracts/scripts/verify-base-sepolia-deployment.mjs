import {
  baseSepoliaManifestPath,
  parseCliArgs,
  readDeploymentManifest,
  requireAddress,
  requireEnv,
  runCommand,
  validateDeploymentManifest,
  zeroAddress
} from "./deployment-helpers.mjs";

async function main() {
  const flags = parseCliArgs(process.argv.slice(2));
  const manifest = validateDeploymentManifest(
    await readDeploymentManifest(flags.manifestFile ?? baseSepoliaManifestPath)
  );
  const rpcUrl = requireEnv("BASE_RPC_URL");
  const owner = requireAddress(manifest.owner, "manifest owner");

  await assertCodePresent(manifest.contracts.TokenAllowlist, rpcUrl);
  await assertCodePresent(manifest.contracts.ArbitratorRegistry, rpcUrl);
  await assertCodePresent(manifest.contracts.ProtocolConfig, rpcUrl);
  await assertCodePresent(manifest.contracts.FeeVault, rpcUrl);
  await assertCodePresent(manifest.contracts.EscrowAgreement, rpcUrl);
  await assertCodePresent(manifest.contracts.EscrowFactory, rpcUrl);

  await assertCallEquals(manifest.contracts.TokenAllowlist, "owner()(address)", [], owner, rpcUrl);
  await assertCallEquals(
    manifest.contracts.TokenAllowlist,
    "pendingOwner()(address)",
    [],
    manifest.pendingOwner ?? zeroAddress,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.TokenAllowlist,
    "isAllowedToken(address)(bool)",
    [manifest.usdcToken],
    "true",
    rpcUrl
  );

  await assertCallEquals(manifest.contracts.ArbitratorRegistry, "owner()(address)", [], owner, rpcUrl);
  await assertCallEquals(
    manifest.contracts.ArbitratorRegistry,
    "pendingOwner()(address)",
    [],
    manifest.pendingOwner ?? zeroAddress,
    rpcUrl
  );

  await assertCallEquals(manifest.contracts.FeeVault, "owner()(address)", [], owner, rpcUrl);
  await assertCallEquals(
    manifest.contracts.FeeVault,
    "pendingOwner()(address)",
    [],
    manifest.pendingOwner ?? zeroAddress,
    rpcUrl
  );
  await assertCallEquals(manifest.contracts.FeeVault, "treasury()(address)", [], manifest.treasury, rpcUrl);

  await assertCallEquals(manifest.contracts.ProtocolConfig, "owner()(address)", [], owner, rpcUrl);
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "pendingOwner()(address)",
    [],
    manifest.pendingOwner ?? zeroAddress,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "tokenAllowlist()(address)",
    [],
    manifest.contracts.TokenAllowlist,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "arbitratorRegistry()(address)",
    [],
    manifest.contracts.ArbitratorRegistry,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "feeVault()(address)",
    [],
    manifest.contracts.FeeVault,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "treasury()(address)",
    [],
    manifest.treasury,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "protocolFeeBps()(uint16)",
    [],
    String(manifest.protocolFeeBps),
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "createEscrowPaused()(bool)",
    [],
    "false",
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "fundingPaused()(bool)",
    [],
    "false",
    rpcUrl
  );

  await assertCallEquals(
    manifest.contracts.EscrowAgreement,
    "initialized()(bool)",
    [],
    "false",
    rpcUrl
  );

  await assertCallEquals(
    manifest.contracts.EscrowFactory,
    "agreementImplementation()(address)",
    [],
    manifest.contracts.EscrowAgreement,
    rpcUrl
  );
  await assertCallEquals(
    manifest.contracts.EscrowFactory,
    "protocolConfig()(address)",
    [],
    manifest.contracts.ProtocolConfig,
    rpcUrl
  );
}

async function assertCodePresent(address, rpcUrl) {
  const { stdout } = await runCommand(
    "cast",
    ["code", address, "--rpc-url", rpcUrl],
    {}
  );

  if (!stdout.trim() || stdout.trim() === "0x") {
    throw new Error(`No code deployed at ${address}`);
  }
}

async function assertCallEquals(address, signature, args, expected, rpcUrl) {
  const commandArgs = ["call", address, signature, ...args, "--rpc-url", rpcUrl];
  const { stdout } = await runCommand("cast", commandArgs, {});
  const actual = stdout.trim().toLowerCase();
  const normalizedExpected = String(expected).trim().toLowerCase();

  if (actual !== normalizedExpected) {
    throw new Error(
      `Verification failed for ${address} ${signature}: expected ${normalizedExpected}, received ${actual}`
    );
  }
}

await main();
