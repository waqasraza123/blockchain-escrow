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

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  return (parseOptionalString(value) ?? fallback).replace(/\/+$/u, "");
}

export interface WorkerFundingReconciliationConfiguration {
  readonly indexerFreshnessTtlSeconds: number;
  readonly pendingStaleAfterSeconds: number;
  readonly release4CursorKey: string;
}

export interface WorkerMilestoneSettlementExecutionReconciliationConfiguration {
  readonly indexerFreshnessTtlSeconds: number;
  readonly pendingStaleAfterSeconds: number;
  readonly release4CursorKey: string;
}

export interface WorkerOperatorAlertConfiguration {
  readonly indexerBaseUrl: string;
  readonly indexerFreshnessTtlSeconds: number;
  readonly pendingSponsoredTransactionReviewAfterSeconds: number;
  readonly release4CursorKey: string;
  readonly requestTimeoutMs: number;
  readonly unresolvedDisputeAfterSeconds: number;
}

export interface WorkerPartnerWebhookConfiguration {
  readonly maxAttempts: number;
  readonly requestTimeoutMs: number;
  readonly retryBaseDelaySeconds: number;
}

export interface WorkerConfig {
  readonly chainId: number;
  readonly fundingReconciliation: WorkerFundingReconciliationConfiguration;
  readonly milestoneSettlementExecutionReconciliation: WorkerMilestoneSettlementExecutionReconciliationConfiguration;
  readonly operatorAlerts: WorkerOperatorAlertConfiguration;
  readonly partnerWebhooks: WorkerPartnerWebhookConfiguration;
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
    milestoneSettlementExecutionReconciliation: {
      indexerFreshnessTtlSeconds: parsePositiveInteger(
        "MILESTONE_SETTLEMENT_EXECUTION_INDEXER_FRESHNESS_TTL_SECONDS",
        300
      ),
      pendingStaleAfterSeconds: parsePositiveInteger(
        "MILESTONE_SETTLEMENT_EXECUTION_PENDING_STALE_AFTER_SECONDS",
        3600
      ),
      release4CursorKey:
        parseOptionalString(
          process.env.WORKER_MILESTONE_SETTLEMENT_EXECUTION_RELEASE4_CURSOR_KEY
        ) ??
        parseOptionalString(process.env.WORKER_RELEASE4_CURSOR_KEY) ??
        parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY) ??
        `release4:${manifest.network}`
    },
    operatorAlerts: {
      indexerBaseUrl: normalizeBaseUrl(
        process.env.WORKER_OPERATOR_ALERT_INDEXER_BASE_URL ??
          process.env.OPERATOR_INDEXER_BASE_URL,
        "http://127.0.0.1:4200"
      ),
      indexerFreshnessTtlSeconds: parsePositiveInteger(
        "WORKER_OPERATOR_ALERT_INDEXER_FRESHNESS_TTL_SECONDS",
        parsePositiveInteger("FUNDING_INDEXER_FRESHNESS_TTL_SECONDS", 300)
      ),
      pendingSponsoredTransactionReviewAfterSeconds: parsePositiveInteger(
        "WORKER_OPERATOR_ALERT_PENDING_SPONSORED_TRANSACTION_REVIEW_AFTER_SECONDS",
        3600
      ),
      release4CursorKey:
        parseOptionalString(process.env.WORKER_OPERATOR_ALERT_RELEASE4_CURSOR_KEY) ??
        parseOptionalString(process.env.WORKER_RELEASE4_CURSOR_KEY) ??
        parseOptionalString(process.env.API_RELEASE4_CURSOR_KEY) ??
        `release4:${manifest.network}`,
      requestTimeoutMs: parsePositiveInteger(
        "WORKER_OPERATOR_ALERT_REQUEST_TIMEOUT_MS",
        3000
      ),
      unresolvedDisputeAfterSeconds: parsePositiveInteger(
        "WORKER_OPERATOR_ALERT_UNRESOLVED_DISPUTE_AFTER_SECONDS",
        86400
      )
    },
    partnerWebhooks: {
      maxAttempts: parsePositiveInteger("WORKER_PARTNER_WEBHOOK_MAX_ATTEMPTS", 5),
      requestTimeoutMs: parsePositiveInteger(
        "WORKER_PARTNER_WEBHOOK_REQUEST_TIMEOUT_MS",
        5000
      ),
      retryBaseDelaySeconds: parsePositiveInteger(
        "WORKER_PARTNER_WEBHOOK_RETRY_BASE_DELAY_SECONDS",
        60
      )
    },
    pollIntervalMs: parsePositiveInteger("WORKER_POLL_INTERVAL_MS", 15000),
    port: parsePositiveInteger("WORKER_PORT", 4100),
    runOnce: parseBoolean("WORKER_RUN_ONCE", false)
  };
}
