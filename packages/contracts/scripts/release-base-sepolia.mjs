import path from "node:path";

import {
  baseSepoliaBroadcastPath,
  buildDeploymentManifest,
  contractsPackageRoot,
  defaultExplorerUrl,
  getOptionalEnv,
  loadBroadcastDeployment,
  parseCliArgs,
  parseProtocolFeeBps,
  requireEnv,
  runCommand,
  writeDeploymentManifest
} from "./deployment-helpers.mjs";

async function main() {
  const flags = parseCliArgs(process.argv.slice(2));
  const safeAddress = requireEnv("SAFE_ADDRESS");
  const usdcTokenAddress = requireEnv("USDC_TOKEN_ADDRESS");
  const explorerUrl = getOptionalEnv("BASE_EXPLORER_URL", defaultExplorerUrl);
  const protocolFeeBps = parseProtocolFeeBps(getOptionalEnv("PROTOCOL_FEE_BPS", "0"));

  if (!flags.skipDeploy) {
    requireEnv("BASE_RPC_URL");
    requireEnv("DEPLOYER_PRIVATE_KEY");

    await runCommand(
      "forge",
      [
        "script",
        "script/DeployProtocol.s.sol:DeployProtocolScript",
        "--rpc-url",
        process.env.BASE_RPC_URL,
        "--broadcast"
      ],
      { cwd: contractsPackageRoot }
    );
  }

  const broadcastFile = flags.broadcastFile ?? baseSepoliaBroadcastPath;
  const broadcastDeployment = await loadBroadcastDeployment(broadcastFile);
  const manifest = buildDeploymentManifest({
    contracts: broadcastDeployment.contracts,
    deployer: broadcastDeployment.deployer,
    deploymentStartBlock: broadcastDeployment.deploymentStartBlock,
    safeAddress,
    usdcTokenAddress,
    protocolFeeBps,
    explorerUrl,
    deployedAt: new Date().toISOString()
  });

  await writeDeploymentManifest(flags.manifestFile, manifest);

  if (!flags.skipExport) {
    const exportArgs = [
      "scripts/export-contracts-sdk.mjs",
      "--deployment-dir",
      flags.exportDeploymentDir ?? path.dirname(flags.manifestFile)
    ];

    if (flags.exportOutputFile) {
      exportArgs.push("--output-file", flags.exportOutputFile);
    }

    await runCommand("node", exportArgs, { cwd: contractsPackageRoot });
  }

  if (!flags.skipVerify) {
    requireEnv("BASE_RPC_URL");

    await runCommand(
      "node",
      [
        "scripts/verify-base-sepolia-deployment.mjs",
        "--manifest-file",
        flags.manifestFile
      ],
      { cwd: contractsPackageRoot }
    );
  }
}

await main();
