import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactSources = {
  TokenAllowlist: {
    contractPath: "src/core/TokenAllowlist.sol",
    artifactName: "TokenAllowlist"
  },
  ArbitratorRegistry: {
    contractPath: "src/core/ArbitratorRegistry.sol",
    artifactName: "ArbitratorRegistry"
  },
  ProtocolConfig: {
    contractPath: "src/core/ProtocolConfig.sol",
    artifactName: "ProtocolConfig"
  },
  FeeVault: {
    contractPath: "src/core/FeeVault.sol",
    artifactName: "FeeVault"
  },
  EscrowAgreement: {
    contractPath: "src/escrow/EscrowAgreement.sol",
    artifactName: "EscrowAgreement"
  },
  EscrowFactory: {
    contractPath: "src/escrow/EscrowFactory.sol",
    artifactName: "EscrowFactory"
  }
};

const repoRoot = path.resolve(__dirname, "../../..");
const contractsPackageRoot = path.resolve(repoRoot, "packages/contracts");
const contractsSdkRoot = path.resolve(repoRoot, "packages/contracts-sdk");
const artifactsOutputPath = path.resolve(
  contractsSdkRoot,
  "src/generated/contracts.ts"
);
const deploymentDirectoryPath = path.resolve(
  contractsPackageRoot,
  "deployments"
);

const cliOptions = parseCliArgs(process.argv.slice(2));

await main();

async function main() {
  const artifacts = await loadArtifacts();
  const deployments = await loadDeployments(cliOptions.deploymentDirectoryPath);
  const generatedSource = buildGeneratedSource(artifacts, deployments);

  await mkdir(path.dirname(cliOptions.outputFilePath), { recursive: true });
  await writeFile(cliOptions.outputFilePath, generatedSource, "utf8");
}

async function loadArtifacts() {
  const entries = await Promise.all(
    Object.entries(artifactSources).map(async ([contractName, source]) => {
      const artifact = await readArtifact(source);

      return [
        contractName,
        {
          abi: artifact.abi ?? [],
          bytecode: artifact.bytecode?.object ?? "0x",
          deployedBytecode: artifact.deployedBytecode?.object ?? "0x"
        }
      ];
    })
  );

  return Object.fromEntries(entries);
}

async function readArtifact(source) {
  const artifactPath = path.resolve(
    contractsPackageRoot,
    "out",
    `${path.basename(source.contractPath)}/${source.artifactName}.json`
  );
  const artifactContents = await readFile(artifactPath, "utf8");

  return JSON.parse(artifactContents);
}

async function loadDeployments(deploymentsPath) {
  try {
    const deploymentFileNames = (await readdir(deploymentsPath))
      .filter((fileName) => fileName.endsWith(".json"))
      .sort();

    const entries = await Promise.all(
      deploymentFileNames.map(async (fileName) => {
        const deploymentPath = path.resolve(deploymentsPath, fileName);
        const deploymentContents = await readFile(deploymentPath, "utf8");
        const deployment = JSON.parse(deploymentContents);

        return [fileName.replace(/\.json$/u, ""), deployment];
      })
    );

    return Object.fromEntries(entries);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function buildGeneratedSource(artifacts, deployments) {
  return [
    "export const CONTRACTS_SDK_PACKAGE_NAME = \"@blockchain-escrow/contracts-sdk\";",
    "",
    "export const CONTRACT_NAMES = [",
    ...Object.keys(artifactSources).map((contractName) => `  ${JSON.stringify(contractName)},`),
    "] as const;",
    "",
    "export type ContractName = (typeof CONTRACT_NAMES)[number];",
    "export type HexString = `0x${string}`;",
    "",
    "export interface ContractArtifact {",
    "  readonly abi: readonly unknown[];",
    "  readonly bytecode: HexString;",
    "  readonly deployedBytecode: HexString;",
    "}",
    "",
    "export interface DeploymentManifest {",
    "  readonly chainId: number;",
    "  readonly network: string;",
    "  readonly contractVersion: number;",
    "  readonly explorerUrl: string;",
    "  readonly deployedAt: string | null;",
    "  readonly deploymentStartBlock: string | null;",
    "  readonly deployer: HexString | null;",
    "  readonly owner: HexString | null;",
    "  readonly pendingOwner: HexString | null;",
    "  readonly treasury: HexString | null;",
    "  readonly usdcToken: HexString | null;",
    "  readonly protocolFeeBps: number;",
    "  readonly contracts: Partial<Record<ContractName, HexString>>;",
    "}",
    "",
    `export const contractArtifacts = ${JSON.stringify(artifacts, null, 2)} as const satisfies Record<ContractName, ContractArtifact>;`,
    "",
    `export const deploymentManifests: Record<string, DeploymentManifest> = ${JSON.stringify(deployments, null, 2)};`,
    "",
    "const deploymentManifestsByChainId = new Map<number, DeploymentManifest>(",
    "  Object.values(deploymentManifests).map((manifest) => [manifest.chainId, manifest])",
    ");",
    "",
    "export function getContractArtifact(contractName: ContractName): ContractArtifact {",
    "  return contractArtifacts[contractName];",
    "}",
    "",
    "export function getDeploymentManifest(network: string): DeploymentManifest | null {",
    "  return deploymentManifests[network] ?? null;",
    "}",
    "",
    "export function getDeploymentManifestByChainId(chainId: number): DeploymentManifest | null {",
    "  return deploymentManifestsByChainId.get(chainId) ?? null;",
    "}",
    "",
    "export function deploymentSupportsCreateAndFund(manifest: DeploymentManifest): boolean {",
    "  return manifest.contractVersion >= 2;",
    "}",
    "",
    "export function deploymentSupportsMilestoneSettlementExecution(manifest: DeploymentManifest): boolean {",
    "  return manifest.contractVersion >= 3;",
    "}",
    ""
  ].join("\n");
}

function parseCliArgs(argv) {
  const options = {
    deploymentDirectoryPath,
    outputFilePath: artifactsOutputPath
  };

  for (let index = 0; index < argv.length; ++index) {
    const value = argv[index];

    if (value === "--deployment-dir") {
      options.deploymentDirectoryPath = path.resolve(
        process.cwd(),
        requireNext(argv, ++index, value)
      );
    } else if (value === "--output-file") {
      options.outputFilePath = path.resolve(
        process.cwd(),
        requireNext(argv, ++index, value)
      );
    } else {
      throw new Error(`Unsupported argument: ${value}`);
    }
  }

  return options;
}

function requireNext(argv, index, flagName) {
  const value = argv[index];

  if (!value) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}
