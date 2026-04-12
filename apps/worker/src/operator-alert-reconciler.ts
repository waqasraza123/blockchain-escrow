import { randomUUID } from "node:crypto";

import type {
  DealMilestoneDisputeRecord,
  FundingTransactionRecord,
  OperatorAlertRecord,
  Release1Repositories,
  Release12Repositories,
  Release4Repositories,
  Release8Repositories,
  SponsoredTransactionRequestRecord,
  DealMilestoneSettlementExecutionTransactionRecord
} from "@blockchain-escrow/db";
import type { JsonObject, OperatorAlertKind } from "@blockchain-escrow/shared";

import type { WorkerOperatorAlertConfiguration } from "./config";

type ManagedAlertDetection = {
  agreementAddress: OperatorAlertRecord["agreementAddress"];
  dealVersionId: OperatorAlertRecord["dealVersionId"];
  description: string;
  draftDealId: OperatorAlertRecord["draftDealId"];
  fingerprint: string;
  kind: OperatorAlertRecord["kind"];
  metadata: JsonObject | null;
  organizationId: OperatorAlertRecord["organizationId"];
  severity: OperatorAlertRecord["severity"];
  subjectId: OperatorAlertRecord["subjectId"];
  subjectLabel: OperatorAlertRecord["subjectLabel"];
  subjectType: OperatorAlertRecord["subjectType"];
};

type RemoteHealthProbe = {
  details: JsonObject | null;
  live: boolean;
  ready: boolean;
};

const managedAlertKinds: readonly OperatorAlertKind[] = [
  "DISPUTE_UNRESOLVED",
  "FUNDING_TRANSACTION_FAILED",
  "FUNDING_TRANSACTION_MISMATCHED",
  "FUNDING_TRANSACTION_STALE_PENDING",
  "INDEXER_CURSOR_STALE",
  "INDEXER_DRIFT_FAILURE",
  "SERVICE_UNHEALTHY",
  "SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW",
  "SETTLEMENT_EXECUTION_FAILED",
  "SETTLEMENT_EXECUTION_MISMATCHED",
  "SETTLEMENT_EXECUTION_STALE_PENDING"
];

function isManagedAlertKind(kind: OperatorAlertRecord["kind"]): boolean {
  return managedAlertKinds.includes(kind);
}

function toTimestampMs(value: string): number {
  return new Date(value).getTime();
}

function buildFundingAlertDetection(
  transaction: FundingTransactionRecord,
  kind: Extract<
    OperatorAlertRecord["kind"],
    | "FUNDING_TRANSACTION_STALE_PENDING"
    | "FUNDING_TRANSACTION_FAILED"
    | "FUNDING_TRANSACTION_MISMATCHED"
  >
): ManagedAlertDetection {
  const descriptionByKind: Record<typeof kind, string> = {
    FUNDING_TRANSACTION_FAILED:
      "Funding transaction reverted or failed reconciliation.",
    FUNDING_TRANSACTION_MISMATCHED:
      "Funding transaction does not match the expected agreement or deal version.",
    FUNDING_TRANSACTION_STALE_PENDING:
      "Funding transaction remains pending beyond the stale threshold."
  };
  const severityByKind: Record<typeof kind, OperatorAlertRecord["severity"]> = {
    FUNDING_TRANSACTION_FAILED: "HIGH",
    FUNDING_TRANSACTION_MISMATCHED: "HIGH",
    FUNDING_TRANSACTION_STALE_PENDING: "MEDIUM"
  };

  return {
    agreementAddress: transaction.reconciledAgreementAddress,
    dealVersionId: transaction.dealVersionId,
    description: descriptionByKind[kind],
    draftDealId: transaction.draftDealId,
    fingerprint: `${kind}:${transaction.id}`,
    kind,
    metadata: {
      chainId: transaction.chainId,
      reconciledStatus: transaction.reconciledStatus,
      stalePendingEscalatedAt: transaction.stalePendingEscalatedAt,
      transactionHash: transaction.transactionHash
    },
    organizationId: transaction.organizationId,
    severity: severityByKind[kind],
    subjectId: transaction.id,
    subjectLabel: transaction.transactionHash,
    subjectType: "FUNDING_TRANSACTION"
  };
}

function buildSettlementAlertDetection(
  transaction: DealMilestoneSettlementExecutionTransactionRecord,
  kind: Extract<
    OperatorAlertRecord["kind"],
    | "SETTLEMENT_EXECUTION_STALE_PENDING"
    | "SETTLEMENT_EXECUTION_FAILED"
    | "SETTLEMENT_EXECUTION_MISMATCHED"
  >
): ManagedAlertDetection {
  const descriptionByKind: Record<typeof kind, string> = {
    SETTLEMENT_EXECUTION_FAILED:
      "Settlement execution reverted or failed reconciliation.",
    SETTLEMENT_EXECUTION_MISMATCHED:
      "Settlement execution does not match the prepared agreement target.",
    SETTLEMENT_EXECUTION_STALE_PENDING:
      "Settlement execution remains pending beyond the stale threshold."
  };
  const severityByKind: Record<typeof kind, OperatorAlertRecord["severity"]> = {
    SETTLEMENT_EXECUTION_FAILED: "HIGH",
    SETTLEMENT_EXECUTION_MISMATCHED: "HIGH",
    SETTLEMENT_EXECUTION_STALE_PENDING: "MEDIUM"
  };

  return {
    agreementAddress: transaction.reconciledAgreementAddress,
    dealVersionId: transaction.dealVersionId,
    description: descriptionByKind[kind],
    draftDealId: transaction.draftDealId,
    fingerprint: `${kind}:${transaction.id}`,
    kind,
    metadata: {
      chainId: transaction.chainId,
      reconciledStatus: transaction.reconciledStatus,
      stalePendingEscalatedAt: transaction.stalePendingEscalatedAt,
      transactionHash: transaction.transactionHash
    },
    organizationId: transaction.organizationId,
    severity: severityByKind[kind],
    subjectId: transaction.id,
    subjectLabel: transaction.transactionHash,
    subjectType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
  };
}

function buildDisputeAlertDetection(
  dispute: DealMilestoneDisputeRecord,
  ageSeconds: number
): ManagedAlertDetection {
  return {
    agreementAddress: null,
    dealVersionId: dispute.dealVersionId,
    description: "Dispute remains unresolved beyond the operator review threshold.",
    draftDealId: dispute.draftDealId,
    fingerprint: `DISPUTE_UNRESOLVED:${dispute.id}`,
    kind: "DISPUTE_UNRESOLVED",
    metadata: {
      ageSeconds,
      openedAt: dispute.openedAt
    },
    organizationId: dispute.organizationId,
    severity: "HIGH",
    subjectId: dispute.id,
    subjectLabel: dispute.statementMarkdown,
    subjectType: "DEAL_MILESTONE_DISPUTE"
  };
}

function buildSponsoredTransactionRequestAlertDetection(
  request: SponsoredTransactionRequestRecord,
  ageSeconds: number,
  subjectLabel: string
): ManagedAlertDetection {
  const subjectId =
    request.draftDealId ?? `sponsored-transaction-request:${request.id}`;
  const subjectType: ManagedAlertDetection["subjectType"] = request.draftDealId
    ? "DRAFT_DEAL"
    : "SYSTEM";

  return {
    agreementAddress: null,
    dealVersionId: request.dealVersionId,
    description:
      "Sponsored transaction request remains pending operator review beyond the configured threshold.",
    draftDealId: request.draftDealId,
    fingerprint: `SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW:${request.id}`,
    kind: "SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW",
    metadata: {
      chainId: request.chainId,
      createdAt: request.createdAt,
      dealMilestoneSettlementRequestId: request.dealMilestoneSettlementRequestId,
      gasPolicyId: request.gasPolicyId,
      kind: request.kind,
      pendingAgeSeconds: ageSeconds,
      requestId: request.id,
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      walletId: request.walletId
    },
    organizationId: request.organizationId,
    severity: "MEDIUM",
    subjectId,
    subjectLabel,
    subjectType
  };
}

function buildSystemAlertDetection(input: {
  chainId: number;
  cursorKey?: string;
  description: string;
  fingerprint: string;
  kind: Extract<
    OperatorAlertRecord["kind"],
    "INDEXER_CURSOR_STALE" | "INDEXER_DRIFT_FAILURE" | "SERVICE_UNHEALTHY"
  >;
  metadata: JsonObject | null;
  severity: OperatorAlertRecord["severity"];
  subjectId: string;
  subjectLabel: string;
}): ManagedAlertDetection {
  return {
    agreementAddress: null,
    dealVersionId: null,
    description: input.description,
    draftDealId: null,
    fingerprint: input.fingerprint,
    kind: input.kind,
    metadata: {
      chainId: input.chainId,
      cursorKey: input.cursorKey ?? null,
      ...input.metadata
    },
    organizationId: null,
    severity: input.severity,
    subjectId: input.subjectId,
    subjectLabel: input.subjectLabel,
    subjectType: "SYSTEM"
  };
}

export interface OperatorAlertReconciliationResult {
  readonly activeOperatorAlertCount: number;
  readonly autoResolvedOperatorAlertCount: number;
  readonly reopenedOperatorAlertCount: number;
  readonly scannedOperatorAlertSourceCount: number;
}

export class OperatorAlertReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release12Repositories: Release12Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly release8Repositories: Release8Repositories,
    private readonly chainId: number,
    private readonly configuration: WorkerOperatorAlertConfiguration,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<OperatorAlertReconciliationResult> {
    const evaluatedAt = this.now();
    const pendingSponsoredTransactionReviewCutoff = new Date(
      toTimestampMs(evaluatedAt) -
        this.configuration.pendingSponsoredTransactionReviewAfterSeconds * 1000
    ).toISOString();
    const [
      fundingTransactions,
      settlementTransactions,
      pendingSponsoredTransactionRequests,
      disputes,
      existingAlerts,
      chainCursor,
      remoteHealth
    ] = await Promise.all([
      this.release1Repositories.fundingTransactions.listByChainId(this.chainId),
      this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
        this.chainId
      ),
      this.release12Repositories.sponsoredTransactionRequests.listPendingReviewCreatedBefore(
        pendingSponsoredTransactionReviewCutoff
      ),
      this.release1Repositories.dealMilestoneDisputes.listAll(),
      this.release8Repositories.operatorAlerts.listAll(),
      this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
        this.chainId,
        this.configuration.release4CursorKey
      ),
      this.probeIndexerHealth()
    ]);

    const detections: ManagedAlertDetection[] = [];

    for (const transaction of fundingTransactions) {
      if (
        transaction.stalePendingEscalatedAt &&
        transaction.reconciledStatus === null
      ) {
        detections.push(
          buildFundingAlertDetection(transaction, "FUNDING_TRANSACTION_STALE_PENDING")
        );
      }

      if (transaction.reconciledStatus === "FAILED") {
        detections.push(
          buildFundingAlertDetection(transaction, "FUNDING_TRANSACTION_FAILED")
        );
      }

      if (transaction.reconciledStatus === "MISMATCHED") {
        detections.push(
          buildFundingAlertDetection(transaction, "FUNDING_TRANSACTION_MISMATCHED")
        );
      }
    }

    for (const transaction of settlementTransactions) {
      if (
        transaction.stalePendingEscalatedAt &&
        transaction.reconciledStatus === null
      ) {
        detections.push(
          buildSettlementAlertDetection(
            transaction,
            "SETTLEMENT_EXECUTION_STALE_PENDING"
          )
        );
      }

      if (transaction.reconciledStatus === "FAILED") {
        detections.push(
          buildSettlementAlertDetection(transaction, "SETTLEMENT_EXECUTION_FAILED")
        );
      }

      if (transaction.reconciledStatus === "MISMATCHED") {
        detections.push(
          buildSettlementAlertDetection(
            transaction,
            "SETTLEMENT_EXECUTION_MISMATCHED"
          )
        );
      }
    }

    for (const dispute of disputes) {
      const decision =
        await this.release1Repositories.dealMilestoneDisputeDecisions.findByDealMilestoneDisputeId(
          dispute.id
        );

      if (decision) {
        continue;
      }

      const ageSeconds = Math.floor(
        (toTimestampMs(evaluatedAt) - toTimestampMs(dispute.openedAt)) / 1000
      );

      if (ageSeconds >= this.configuration.unresolvedDisputeAfterSeconds) {
        detections.push(buildDisputeAlertDetection(dispute, ageSeconds));
      }
    }

    for (const request of pendingSponsoredTransactionRequests) {
      const ageSeconds = Math.floor(
        (toTimestampMs(evaluatedAt) - toTimestampMs(request.createdAt)) / 1000
      );

      if (
        ageSeconds < this.configuration.pendingSponsoredTransactionReviewAfterSeconds
      ) {
        continue;
      }

      const subjectLabel = await this.resolveSponsoredTransactionRequestSubjectLabel(
        request
      );
      detections.push(
        buildSponsoredTransactionRequestAlertDetection(
          request,
          ageSeconds,
          subjectLabel
        )
      );
    }

    const cursorFresh =
      chainCursor != null &&
      toTimestampMs(evaluatedAt) - toTimestampMs(chainCursor.updatedAt) <=
        this.configuration.indexerFreshnessTtlSeconds * 1000;

    if (!cursorFresh) {
      detections.push(
        buildSystemAlertDetection({
          chainId: this.chainId,
          cursorKey: this.configuration.release4CursorKey,
          description:
            "Release 4 cursor freshness is outside the configured operator threshold.",
          fingerprint: `INDEXER_CURSOR_STALE:${this.chainId}:${this.configuration.release4CursorKey}`,
          kind: "INDEXER_CURSOR_STALE",
          metadata: {
            cursorUpdatedAt: chainCursor?.updatedAt ?? null,
            freshnessTtlSeconds: this.configuration.indexerFreshnessTtlSeconds
          },
          severity: "HIGH",
          subjectId: `release4-cursor:${this.chainId}:${this.configuration.release4CursorKey}`,
          subjectLabel: "Release 4 cursor"
        })
      );
    }

    if (!remoteHealth.live || !remoteHealth.ready) {
      detections.push(
        buildSystemAlertDetection({
          chainId: this.chainId,
          description: "Indexer health endpoint is unhealthy or unreachable.",
          fingerprint: `SERVICE_UNHEALTHY:indexer:${this.chainId}`,
          kind: "SERVICE_UNHEALTHY",
          metadata: {
            details: remoteHealth.details,
            live: remoteHealth.live,
            ready: remoteHealth.ready
          },
          severity: "CRITICAL",
          subjectId: `indexer:${this.chainId}`,
          subjectLabel: "Indexer service"
        })
      );
    }

    const driftError =
      remoteHealth.details &&
      typeof remoteHealth.details.driftError === "string" &&
      remoteHealth.details.driftError.length > 0
        ? remoteHealth.details.driftError
        : null;

    if (driftError) {
      detections.push(
        buildSystemAlertDetection({
          chainId: this.chainId,
          description: "Indexer reported a projection drift failure.",
          fingerprint: `INDEXER_DRIFT_FAILURE:indexer:${this.chainId}`,
          kind: "INDEXER_DRIFT_FAILURE",
          metadata: {
            driftError,
            lastDriftCheckAt:
              typeof remoteHealth.details?.lastDriftCheckAt === "string"
                ? remoteHealth.details.lastDriftCheckAt
                : null
          },
          severity: "CRITICAL",
          subjectId: `indexer:${this.chainId}`,
          subjectLabel: "Indexer drift state"
        })
      );
    }

    let reopenedOperatorAlertCount = 0;

    for (const detection of detections) {
      const existing =
        existingAlerts.find((alert) => alert.fingerprint === detection.fingerprint) ??
        (await this.release8Repositories.operatorAlerts.findByFingerprint(
          detection.fingerprint
        ));

      if (!existing) {
        await this.release8Repositories.operatorAlerts.create({
          acknowledgedAt: null,
          acknowledgedByOperatorAccountId: null,
          agreementAddress: detection.agreementAddress,
          assignedOperatorAccountId: null,
          dealVersionId: detection.dealVersionId,
          description: detection.description,
          draftDealId: detection.draftDealId,
          fingerprint: detection.fingerprint,
          firstDetectedAt: evaluatedAt,
          id: randomUUID(),
          kind: detection.kind,
          lastDetectedAt: evaluatedAt,
          linkedComplianceCaseId: null,
          metadata: detection.metadata,
          organizationId: detection.organizationId,
          resolvedAt: null,
          resolvedByOperatorAccountId: null,
          severity: detection.severity,
          status: "OPEN",
          subjectId: detection.subjectId,
          subjectLabel: detection.subjectLabel,
          subjectType: detection.subjectType
        });
        continue;
      }

      const reopened = existing.status === "RESOLVED";

      await this.release8Repositories.operatorAlerts.update(existing.id, {
        acknowledgedAt: reopened ? null : existing.acknowledgedAt,
        acknowledgedByOperatorAccountId: reopened
          ? null
          : existing.acknowledgedByOperatorAccountId,
        agreementAddress: detection.agreementAddress,
        dealVersionId: detection.dealVersionId,
        description: detection.description,
        draftDealId: detection.draftDealId,
        kind: detection.kind,
        lastDetectedAt: evaluatedAt,
        metadata: detection.metadata,
        organizationId: detection.organizationId,
        resolvedAt: reopened ? null : existing.resolvedAt,
        resolvedByOperatorAccountId: reopened
          ? null
          : existing.resolvedByOperatorAccountId,
        severity: detection.severity,
        status: reopened ? "OPEN" : existing.status,
        subjectId: detection.subjectId,
        subjectLabel: detection.subjectLabel,
        subjectType: detection.subjectType
      });

      if (reopened) {
        reopenedOperatorAlertCount += 1;
      }
    }

    const activeFingerprints = new Set(detections.map((entry) => entry.fingerprint));
    let autoResolvedOperatorAlertCount = 0;

    for (const alert of existingAlerts) {
      if (!isManagedAlertKind(alert.kind)) {
        continue;
      }

      if (activeFingerprints.has(alert.fingerprint) || alert.status === "RESOLVED") {
        continue;
      }

      await this.release8Repositories.operatorAlerts.update(alert.id, {
        metadata: {
          ...(alert.metadata ?? {}),
          autoResolvedAt: evaluatedAt
        },
        resolvedAt: evaluatedAt,
        resolvedByOperatorAccountId: null,
        status: "RESOLVED"
      });
      autoResolvedOperatorAlertCount += 1;
    }

    return {
      activeOperatorAlertCount: detections.length,
      autoResolvedOperatorAlertCount,
      reopenedOperatorAlertCount,
      scannedOperatorAlertSourceCount:
        fundingTransactions.length +
        settlementTransactions.length +
        pendingSponsoredTransactionRequests.length +
        disputes.length
    };
  }

  private async resolveSponsoredTransactionRequestSubjectLabel(
    request: SponsoredTransactionRequestRecord
  ): Promise<string> {
    if (request.draftDealId) {
      const draft = await this.release1Repositories.draftDeals.findById(
        request.draftDealId
      );

      if (draft) {
        return draft.title;
      }
    }

    return request.id;
  }

  private async probeIndexerHealth(): Promise<RemoteHealthProbe> {
    const signal = AbortSignal.timeout(this.configuration.requestTimeoutMs);

    try {
      const [liveResponse, readyResponse] = await Promise.all([
        this.fetcher(`${this.configuration.indexerBaseUrl}/health/live`, { signal }),
        this.fetcher(`${this.configuration.indexerBaseUrl}/health/ready`, { signal })
      ]);

      let details: JsonObject | null = null;

      try {
        const json = (await readyResponse.json()) as unknown;
        if (json && typeof json === "object" && !Array.isArray(json)) {
          details = json as JsonObject;
        }
      } catch {
        details = null;
      }

      return {
        details,
        live: liveResponse.ok,
        ready: readyResponse.ok
      };
    } catch {
      return {
        details: null,
        live: false,
        ready: false
      };
    }
  }
}
