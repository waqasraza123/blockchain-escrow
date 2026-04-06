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

export interface WorkerConfig {
  readonly chainId: number;
  readonly pollIntervalMs: number;
  readonly port: number;
  readonly runOnce: boolean;
}

export function loadWorkerConfig(): WorkerConfig {
  const chainId = parsePositiveInteger("WORKER_CHAIN_ID", 84532);

  if (!getDeploymentManifestByChainId(chainId)) {
    throw new Error(`No deployment manifest found for chain ${chainId}`);
  }

  return {
    chainId,
    pollIntervalMs: parsePositiveInteger("WORKER_POLL_INTERVAL_MS", 15000),
    port: parsePositiveInteger("WORKER_PORT", 4100),
    runOnce: parseBoolean("WORKER_RUN_ONCE", false)
  };
}
