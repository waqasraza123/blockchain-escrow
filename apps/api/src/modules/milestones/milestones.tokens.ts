import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

export interface MilestoneReviewConfiguration {
  reviewDeadlineSeconds: number;
}

export interface MilestoneSettlementExecutionReconciliationConfiguration {
  indexerFreshnessTtlSeconds: number;
  pendingStaleAfterSeconds: number;
  release4CursorKeyOverride: string | null;
}

export const MILESTONE_REVIEW_CONFIGURATION = Symbol(
  "MILESTONE_REVIEW_CONFIGURATION"
);
export const MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION = Symbol(
  "MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION"
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

export function loadMilestoneReviewConfiguration(): MilestoneReviewConfiguration {
  return {
    reviewDeadlineSeconds: parsePositiveInteger(
      process.env.MILESTONE_REVIEW_DEADLINE_SECONDS,
      7 * 24 * 60 * 60
    )
  };
}

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function loadMilestoneSettlementExecutionReconciliationConfiguration(): MilestoneSettlementExecutionReconciliationConfiguration {
  return {
    indexerFreshnessTtlSeconds: parsePositiveInteger(
      process.env.MILESTONE_SETTLEMENT_EXECUTION_INDEXER_FRESHNESS_TTL_SECONDS,
      300
    ),
    pendingStaleAfterSeconds: parsePositiveInteger(
      process.env.MILESTONE_SETTLEMENT_EXECUTION_PENDING_STALE_AFTER_SECONDS,
      3600
    ),
    release4CursorKeyOverride:
      parseOptionalString(
        process.env.MILESTONE_SETTLEMENT_EXECUTION_RELEASE4_CURSOR_KEY
      ) ?? parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY)
  };
}

export function resolveMilestoneSettlementExecutionReconciliationCursorKey(
  configuration: MilestoneSettlementExecutionReconciliationConfiguration,
  chainId: number
): string | null {
  if (configuration.release4CursorKeyOverride) {
    return configuration.release4CursorKeyOverride;
  }

  const manifest = getDeploymentManifestByChainId(chainId);
  return manifest ? `release4:${manifest.network}` : null;
}
