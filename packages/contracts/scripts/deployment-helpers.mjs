import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "../../..");
export const contractsPackageRoot = path.resolve(repoRoot, "packages/contracts");
export const baseSepoliaChainId = 84532;
export const baseSepoliaNetwork = "base-sepolia";
export const baseSepoliaManifestPath = path.resolve(
  contractsPackageRoot,
  "deployments/base-sepolia.json"
);
export const baseSepoliaBroadcastPath = path.resolve(
  contractsPackageRoot,
  `broadcast/DeployProtocol.s.sol/${baseSepoliaChainId}/run-latest.json`
);
export const defaultExplorerUrl = "https://sepolia.basescan.org";
export const zeroAddress = "0x0000000000000000000000000000000000000000";

export const contractNames = [
  "TokenAllowlist",
  "ArbitratorRegistry",
  "ProtocolConfig",
  "FeeVault",
  "EscrowAgreement",
  "EscrowFactory"
];
export const currentContractVersion = 2;

export function parseCliArgs(argv) {
  const flags = {
    skipDeploy: false,
    skipVerify: false,
    skipExport: false,
    broadcastFile: baseSepoliaBroadcastPath,
    manifestFile: baseSepoliaManifestPath,
    exportDeploymentDir: null,
    exportOutputFile: null
  };

  for (let index = 0; index < argv.length; ++index) {
    const value = argv[index];

    if (value === "--skip-deploy") {
      flags.skipDeploy = true;
    } else if (value === "--skip-verify") {
      flags.skipVerify = true;
    } else if (value === "--skip-export") {
      flags.skipExport = true;
    } else if (value === "--broadcast-file") {
      flags.broadcastFile = path.resolve(process.cwd(), requireNext(argv, ++index, value));
    } else if (value === "--manifest-file") {
      flags.manifestFile = path.resolve(process.cwd(), requireNext(argv, ++index, value));
    } else if (value === "--export-deployment-dir") {
      flags.exportDeploymentDir = path.resolve(process.cwd(), requireNext(argv, ++index, value));
    } else if (value === "--export-output-file") {
      flags.exportOutputFile = path.resolve(process.cwd(), requireNext(argv, ++index, value));
    } else {
      throw new Error(`Unsupported argument: ${value}`);
    }
  }

  return flags;
}

export function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name, defaultValue = null) {
  return process.env[name] ?? defaultValue;
}

export function parseProtocolFeeBps(value) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new Error(`Invalid protocol fee basis points value: ${value}`);
  }

  return parsed;
}

export function parseContractVersion(value) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid contract version value: ${value}`);
  }

  return parsed;
}

export function normalizeAddress(value, label) {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${label}: expected address string`);
  }

  const normalized = value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/u.test(normalized)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return normalized;
}

export function normalizeNullableAddress(value, label) {
  if (value == null) {
    return null;
  }

  return normalizeAddress(value, label);
}

export function normalizeNullableBlockNumber(value, label) {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string" || !/^[0-9]+$/u.test(value)) {
    throw new Error(`Invalid ${label}: expected decimal block number string`);
  }

  return value;
}

export function requireAddress(value, label) {
  if (value == null) {
    throw new Error(`Missing ${label}`);
  }

  return normalizeAddress(value, label);
}

export function normalizeExplorerUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Invalid explorer URL");
  }

  return value.trim();
}

export function normalizeContractAddresses(contracts, requireComplete = false) {
  if (!contracts || typeof contracts !== "object") {
    throw new Error("Invalid deployment contracts map");
  }

  const normalizedContracts = {};

  for (const contractName of contractNames) {
    const address = contracts[contractName];

    if (address == null) {
      if (requireComplete) {
        throw new Error(`Missing contract address for ${contractName}`);
      }

      continue;
    }

    normalizedContracts[contractName] = normalizeAddress(
      address,
      `${contractName} address`
    );
  }

  return normalizedContracts;
}

export async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")}\n${stderr || stdout}`
        )
      );
    });
  });
}

export async function loadBroadcastDeployment(broadcastFile) {
  const contents = await readFile(broadcastFile, "utf8");
  const parsed = JSON.parse(contents);
  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const receipts = Array.isArray(parsed.receipts) ? parsed.receipts : [];
  const receiptBlockNumbersByHash = new Map(
    receipts
      .filter(
        (item) =>
          item &&
          typeof item.transactionHash === "string" &&
          item.transactionHash.length > 0 &&
          typeof item.blockNumber === "string" &&
          item.blockNumber.length > 0
      )
      .map((item) => [item.transactionHash.toLowerCase(), item.blockNumber])
  );

  const contracts = {};

  for (const contractName of contractNames) {
    const transaction = transactions.find(
      (item) =>
        item &&
        item.contractName === contractName &&
        typeof item.contractAddress === "string" &&
        item.contractAddress.length > 0
    );

    if (!transaction) {
      throw new Error(`Missing deployed contract address for ${contractName} in ${broadcastFile}`);
    }

    contracts[contractName] = normalizeAddress(
      transaction.contractAddress,
      `${contractName} contract address`
    );
  }

  const deployer =
    transactions.find(
      (item) =>
        typeof item?.transaction?.from === "string" &&
        item.transaction.from.length > 0
    )?.transaction.from ?? null;
  const deploymentStartBlock = transactions.reduce((lowestBlock, item) => {
    const transactionHash =
      typeof item?.hash === "string" && item.hash.length > 0 ? item.hash.toLowerCase() : null;
    const blockNumber =
      item?.receipt?.blockNumber ??
      (transactionHash ? receiptBlockNumbersByHash.get(transactionHash) : null) ??
      item?.transaction?.blockNumber;

    if (typeof blockNumber !== "string" || blockNumber.length === 0) {
      return lowestBlock;
    }

    const parsedBlockNumber = BigInt(blockNumber);
    if (lowestBlock === null || parsedBlockNumber < lowestBlock) {
      return parsedBlockNumber;
    }

    return lowestBlock;
  }, null);

  return {
    contracts,
    deployer: normalizeNullableAddress(deployer, "broadcast deployer"),
    deploymentStartBlock:
      deploymentStartBlock === null ? null : deploymentStartBlock.toString()
  };
}

export function buildDeploymentManifest({
  contracts,
  deployer,
  deploymentStartBlock,
  safeAddress,
  usdcTokenAddress,
  protocolFeeBps,
  explorerUrl,
  deployedAt
}) {
  const normalizedDeployer = normalizeNullableAddress(deployer, "deployment deployer");
  const normalizedSafeAddress = normalizeAddress(safeAddress, "SAFE_ADDRESS");
  const normalizedUsdcTokenAddress = normalizeAddress(usdcTokenAddress, "USDC_TOKEN_ADDRESS");
  const normalizedExplorerUrl = normalizeExplorerUrl(explorerUrl);
  const normalizedProtocolFeeBps = parseProtocolFeeBps(protocolFeeBps);
  const normalizedContracts = normalizeContractAddresses(contracts, true);
  const owner = normalizedDeployer;
  const pendingOwner =
    normalizedDeployer &&
    normalizedSafeAddress.toLowerCase() !== normalizedDeployer.toLowerCase()
      ? normalizedSafeAddress
      : null;

  return {
    chainId: baseSepoliaChainId,
    network: baseSepoliaNetwork,
    contractVersion: currentContractVersion,
    explorerUrl: normalizedExplorerUrl,
    deployedAt,
    deploymentStartBlock: deploymentStartBlock ?? null,
    deployer: normalizedDeployer,
    owner,
    pendingOwner,
    treasury: normalizedSafeAddress,
    usdcToken: normalizedUsdcTokenAddress,
    protocolFeeBps: normalizedProtocolFeeBps,
    contracts: normalizedContracts
  };
}

export async function writeDeploymentManifest(manifestFile, manifest) {
  await mkdir(path.dirname(manifestFile), { recursive: true });
  await writeFile(`${manifestFile}`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function readDeploymentManifest(manifestFile) {
  const contents = await readFile(manifestFile, "utf8");
  return JSON.parse(contents);
}

export function validateDeploymentManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid deployment manifest");
  }

  if (manifest.chainId !== baseSepoliaChainId) {
    throw new Error(`Unexpected deployment chain ID: ${manifest.chainId}`);
  }

  if (manifest.network !== baseSepoliaNetwork) {
    throw new Error(`Unexpected deployment network: ${manifest.network}`);
  }

  return {
    chainId: manifest.chainId,
    network: manifest.network,
    contractVersion: parseContractVersion(manifest.contractVersion ?? 1),
    explorerUrl: normalizeExplorerUrl(manifest.explorerUrl),
    deployedAt: manifest.deployedAt ?? null,
    deploymentStartBlock: normalizeNullableBlockNumber(
      manifest.deploymentStartBlock,
      "manifest deployment start block"
    ),
    deployer: normalizeNullableAddress(manifest.deployer, "manifest deployer"),
    owner: normalizeNullableAddress(manifest.owner, "manifest owner"),
    pendingOwner: normalizeNullableAddress(
      manifest.pendingOwner,
      "manifest pending owner"
    ),
    treasury: requireAddress(manifest.treasury, "manifest treasury"),
    usdcToken: requireAddress(manifest.usdcToken, "manifest usdc token"),
    protocolFeeBps: parseProtocolFeeBps(manifest.protocolFeeBps),
    contracts: normalizeContractAddresses(manifest.contracts, true)
  };
}

export function requireNext(argv, index, flagName) {
  const value = argv[index];

  if (!value) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}
