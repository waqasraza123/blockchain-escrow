import { runCommand, zeroAddress } from "./deployment-helpers.mjs";

async function assertCodePresent(address, rpcUrl, commandRunner) {
  const { stdout } = await commandRunner(
    "cast",
    ["code", address, "--rpc-url", rpcUrl],
    {}
  );

  if (!stdout.trim() || stdout.trim() === "0x") {
    throw new Error(`No code deployed at ${address}`);
  }
}

async function assertCallEquals(
  address,
  signature,
  args,
  expected,
  rpcUrl,
  commandRunner
) {
  const commandArgs = ["call", address, signature, ...args, "--rpc-url", rpcUrl];
  const { stdout } = await commandRunner("cast", commandArgs, {});
  const actual = stdout.trim().toLowerCase();
  const normalizedExpected = String(expected).trim().toLowerCase();

  if (actual !== normalizedExpected) {
    throw new Error(
      `Verification failed for ${address} ${signature}: expected ${normalizedExpected}, received ${actual}`
    );
  }
}

export async function verifyDeploymentManifestOnchain(
  manifest,
  rpcUrl,
  options = {}
) {
  const commandRunner = options.commandRunner ?? runCommand;
  const owner = manifest.owner ?? zeroAddress;
  const pendingOwner = manifest.pendingOwner ?? zeroAddress;

  await assertCodePresent(manifest.contracts.TokenAllowlist, rpcUrl, commandRunner);
  await assertCodePresent(manifest.contracts.ArbitratorRegistry, rpcUrl, commandRunner);
  await assertCodePresent(manifest.contracts.ProtocolConfig, rpcUrl, commandRunner);
  await assertCodePresent(manifest.contracts.FeeVault, rpcUrl, commandRunner);
  await assertCodePresent(manifest.contracts.EscrowAgreement, rpcUrl, commandRunner);
  await assertCodePresent(manifest.contracts.EscrowFactory, rpcUrl, commandRunner);

  await assertCallEquals(
    manifest.contracts.TokenAllowlist,
    "owner()(address)",
    [],
    owner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.TokenAllowlist,
    "pendingOwner()(address)",
    [],
    pendingOwner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.TokenAllowlist,
    "isAllowedToken(address)(bool)",
    [manifest.usdcToken],
    "true",
    rpcUrl,
    commandRunner
  );

  await assertCallEquals(
    manifest.contracts.ArbitratorRegistry,
    "owner()(address)",
    [],
    owner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ArbitratorRegistry,
    "pendingOwner()(address)",
    [],
    pendingOwner,
    rpcUrl,
    commandRunner
  );

  await assertCallEquals(
    manifest.contracts.FeeVault,
    "owner()(address)",
    [],
    owner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.FeeVault,
    "pendingOwner()(address)",
    [],
    pendingOwner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.FeeVault,
    "treasury()(address)",
    [],
    manifest.treasury,
    rpcUrl,
    commandRunner
  );

  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "owner()(address)",
    [],
    owner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "pendingOwner()(address)",
    [],
    pendingOwner,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "tokenAllowlist()(address)",
    [],
    manifest.contracts.TokenAllowlist,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "arbitratorRegistry()(address)",
    [],
    manifest.contracts.ArbitratorRegistry,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "feeVault()(address)",
    [],
    manifest.contracts.FeeVault,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "treasury()(address)",
    [],
    manifest.treasury,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "protocolFeeBps()(uint16)",
    [],
    String(manifest.protocolFeeBps),
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "createEscrowPaused()(bool)",
    [],
    "false",
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.ProtocolConfig,
    "fundingPaused()(bool)",
    [],
    "false",
    rpcUrl,
    commandRunner
  );

  await assertCallEquals(
    manifest.contracts.EscrowAgreement,
    "initialized()(bool)",
    [],
    "false",
    rpcUrl,
    commandRunner
  );

  await assertCallEquals(
    manifest.contracts.EscrowFactory,
    "agreementImplementation()(address)",
    [],
    manifest.contracts.EscrowAgreement,
    rpcUrl,
    commandRunner
  );
  await assertCallEquals(
    manifest.contracts.EscrowFactory,
    "protocolConfig()(address)",
    [],
    manifest.contracts.ProtocolConfig,
    rpcUrl,
    commandRunner
  );

  return {
    chainId: manifest.chainId,
    contractsVerified: Object.keys(manifest.contracts).length,
    network: manifest.network,
    rpcUrl
  };
}
