import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

export interface FundingReconciliationConfiguration {
  indexerFreshnessTtlSeconds: number;
  pendingStaleAfterSeconds: number;
  release4CursorKeyOverride: string | null;
}

export const FUNDING_RECONCILIATION_CONFIGURATION = Symbol(
  "FUNDING_RECONCILIATION_CONFIGURATION"
);

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function loadFundingReconciliationConfiguration(): FundingReconciliationConfiguration {
  return {
    indexerFreshnessTtlSeconds: parsePositiveInteger(
      process.env.FUNDING_INDEXER_FRESHNESS_TTL_SECONDS,
      300
    ),
    pendingStaleAfterSeconds: parsePositiveInteger(
      process.env.FUNDING_PENDING_STALE_AFTER_SECONDS,
      3600
    ),
    release4CursorKeyOverride: parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY)
  };
}

export function resolveFundingReconciliationCursorKey(
  configuration: FundingReconciliationConfiguration,
  chainId: number
): string | null {
  if (configuration.release4CursorKeyOverride) {
    return configuration.release4CursorKeyOverride;
  }

  const manifest = getDeploymentManifestByChainId(chainId);
  return manifest ? `release4:${manifest.network}` : null;
}
