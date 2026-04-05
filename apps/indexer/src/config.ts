import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

function parsePositiveInteger(name: string, defaultValue: number): number {
  const raw = process.env[name];

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected positive integer, received ${raw}`);
  }

  return parsed;
}

function parseNonNegativeInteger(name: string, defaultValue: number): number {
  const raw = process.env[name];

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${name}: expected non-negative integer, received ${raw}`);
  }

  return parsed;
}

function parseBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];

  if (!raw) {
    return defaultValue;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  throw new Error(`Invalid ${name}: expected true or false, received ${raw}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export interface IndexerConfig {
  readonly baseRpcUrl: string;
  readonly batchSize: number;
  readonly chainId: number;
  readonly cursorKey: string;
  readonly enableDriftChecks: boolean;
  readonly finalityBuffer: number;
  readonly network: string;
  readonly pollIntervalMs: number;
  readonly port: number;
  readonly runOnce: boolean;
  readonly startBlock: bigint;
}

export function loadIndexerConfig(): IndexerConfig {
  const chainId = parsePositiveInteger("INDEXER_CHAIN_ID", 84532);
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest) {
    throw new Error(`No deployment manifest found for chain ${chainId}`);
  }

  const network = process.env.INDEXER_NETWORK ?? manifest.network;

  return {
    baseRpcUrl: requireEnv("BASE_RPC_URL"),
    batchSize: parsePositiveInteger("INDEXER_BATCH_SIZE", 250),
    chainId,
    cursorKey: process.env.INDEXER_CURSOR_KEY ?? `release4:${network}`,
    enableDriftChecks: parseBoolean("INDEXER_ENABLE_DRIFT_CHECKS", true),
    finalityBuffer: parseNonNegativeInteger("INDEXER_FINALITY_BUFFER", 0),
    network,
    pollIntervalMs: parsePositiveInteger("INDEXER_POLL_INTERVAL_MS", 15000),
    port: parsePositiveInteger("INDEXER_PORT", 4200),
    runOnce: parseBoolean("INDEXER_RUN_ONCE", false),
    startBlock: BigInt(parseNonNegativeInteger("INDEXER_START_BLOCK", 0))
  };
}
