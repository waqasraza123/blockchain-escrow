import {
  getDeploymentManifestByChainId,
  listDeploymentManifests
} from "@blockchain-escrow/contracts-sdk";

export interface OperatorConfiguration {
  chainId: number;
  indexerBaseUrl: string;
  indexerFreshnessTtlSeconds: number;
  release4CursorKey: string;
  requestTimeoutMs: number;
  unresolvedDisputeAfterSeconds: number;
  visibleChainIds: number[];
  workerBaseUrl: string;
}

export const OPERATOR_CONFIGURATION = Symbol("OPERATOR_CONFIGURATION");

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const normalized = parseOptionalString(value) ?? fallback;
  return normalized.replace(/\/+$/u, "");
}

function parseChainIds(
  value: string | undefined,
  fallback: readonly number[]
): number[] {
  if (!value || value.trim().length === 0) {
    return [...fallback];
  }

  const uniqueChainIds = new Set<number>();

  for (const segment of value.split(",")) {
    const normalized = segment.trim();
    if (normalized.length === 0) {
      continue;
    }

    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Expected a comma-separated list of positive integers but received "${value}".`);
    }

    if (!getDeploymentManifestByChainId(parsed)) {
      throw new Error(`No deployment manifest found for visible operator chain ${parsed}`);
    }

    uniqueChainIds.add(parsed);
  }

  return [...uniqueChainIds].sort((left, right) => left - right);
}

export function loadOperatorConfiguration(): OperatorConfiguration {
  const chainId = parsePositiveInteger(process.env.OPERATOR_CHAIN_ID, 84532);
  const manifest = getDeploymentManifestByChainId(chainId);
  const defaultVisibleChainIds = listDeploymentManifests().map(
    (deploymentManifest) => deploymentManifest.chainId
  );

  if (!manifest) {
    throw new Error(`No deployment manifest found for chain ${chainId}`);
  }

  return {
    chainId,
    indexerBaseUrl: normalizeBaseUrl(
      process.env.OPERATOR_INDEXER_BASE_URL,
      "http://127.0.0.1:4200"
    ),
    indexerFreshnessTtlSeconds: parsePositiveInteger(
      process.env.OPERATOR_INDEXER_FRESHNESS_TTL_SECONDS,
      300
    ),
    release4CursorKey:
      parseOptionalString(process.env.OPERATOR_RELEASE4_CURSOR_KEY) ??
      parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY) ??
      `release4:${manifest.network}`,
    requestTimeoutMs: parsePositiveInteger(
      process.env.OPERATOR_REMOTE_REQUEST_TIMEOUT_MS,
      3000
    ),
    unresolvedDisputeAfterSeconds: parsePositiveInteger(
      process.env.OPERATOR_UNRESOLVED_DISPUTE_AFTER_SECONDS,
      86400
    ),
    visibleChainIds: parseChainIds(
      process.env.OPERATOR_VISIBLE_CHAIN_IDS,
      defaultVisibleChainIds
    ),
    workerBaseUrl: normalizeBaseUrl(
      process.env.OPERATOR_WORKER_BASE_URL,
      "http://127.0.0.1:4100"
    )
  };
}
