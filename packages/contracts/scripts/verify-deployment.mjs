import {
  baseSepoliaManifestPath,
  readDeploymentManifest,
  requireEnv,
  validateDeploymentManifest
} from "./deployment-helpers.mjs";
import { verifyDeploymentManifestOnchain } from "./deployment-verifier.mjs";

function parseVerifyCliArgs(argv) {
  const flags = {
    manifestFile: baseSepoliaManifestPath,
    rpcUrlEnv: "BASE_RPC_URL"
  };

  for (let index = 0; index < argv.length; ++index) {
    const value = argv[index];

    if (value === "--manifest-file") {
      const next = argv[++index];
      if (!next) {
        throw new Error("Missing value for --manifest-file");
      }
      flags.manifestFile = next;
      continue;
    }

    if (value === "--rpc-url-env") {
      const next = argv[++index];
      if (!next) {
        throw new Error("Missing value for --rpc-url-env");
      }
      flags.rpcUrlEnv = next;
      continue;
    }

    throw new Error(`Unsupported argument: ${value}`);
  }

  return flags;
}

async function main() {
  const flags = parseVerifyCliArgs(process.argv.slice(2));
  const manifest = validateDeploymentManifest(
    await readDeploymentManifest(flags.manifestFile)
  );
  const rpcUrl = requireEnv(flags.rpcUrlEnv);

  const result = await verifyDeploymentManifestOnchain(manifest, rpcUrl);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

await main();
