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

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export interface WorkerFundingReconciliationConfiguration {
  readonly indexerFreshnessTtlSeconds: number;
  readonly pendingStaleAfterSeconds: number;
  readonly release4CursorKey: string;
}

export interface WorkerConfig {
  readonly chainId: number;
  readonly fundingReconciliation: WorkerFundingReconciliationConfiguration;
  readonly pollIntervalMs: number;
  readonly port: number;
  readonly runOnce: boolean;
}

export function loadWorkerConfig(): WorkerConfig {
  const chainId = parsePositiveInteger("WORKER_CHAIN_ID", 84532);
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest) {
    throw new Error(`No deployment manifest found for chain ${chainId}`);
  }

  return {
    chainId,
    fundingReconciliation: {
      indexerFreshnessTtlSeconds: parsePositiveInteger(
        "FUNDING_INDEXER_FRESHNESS_TTL_SECONDS",
        300
      ),
      pendingStaleAfterSeconds: parsePositiveInteger(
        "FUNDING_PENDING_STALE_AFTER_SECONDS",
        3600
      ),
      release4CursorKey:
        parseOptionalString(process.env.WORKER_RELEASE4_CURSOR_KEY) ??
        parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY) ??
        `release4:${manifest.network}`
    },
    pollIntervalMs: parsePositiveInteger("WORKER_POLL_INTERVAL_MS", 15000),
    port: parsePositiveInteger("WORKER_PORT", 4100),
    runOnce: parseBoolean("WORKER_RUN_ONCE", false)
  };
}
