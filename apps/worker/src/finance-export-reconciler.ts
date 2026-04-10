import { randomUUID } from "node:crypto";

import type {
  ApprovalRequestRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealVersionMilestoneRecord,
  DealVersionRecord,
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  FinanceExportArtifactRecord,
  FinanceExportJobRecord,
  FundingTransactionRecord,
  Release1Repositories,
  Release4Repositories,
  Release9Repositories,
  StatementSnapshotRecord
} from "@blockchain-escrow/db";
import { buildCanonicalDealId, type JsonObject } from "@blockchain-escrow/shared";

interface FinanceExportFilters {
  actionKinds?: ApprovalRequestRecord["kind"][];
  costCenterId?: string;
  dateFrom?: string;
  dateTo?: string;
  dealVersionId?: string;
  draftDealId?: string;
  statuses?: ApprovalRequestRecord["status"][];
}

interface FinanceExportPayload {
  approvalRequests: JsonObject[];
  dealVersionFinanceContexts: JsonObject[];
  filters: FinanceExportFilters;
  generatedAt: string;
  organizationId: string;
  settlementExecutionTransactions: JsonObject[];
  settlementStatementAggregates: JsonObject[];
  statementSnapshots: JsonObject[];
  fundingTransactions: JsonObject[];
}

export interface FinanceExportReconciliationResult {
  readonly completedFinanceExportJobCount: number;
  readonly failedFinanceExportJobCount: number;
  readonly generatedFinanceExportArtifactCount: number;
  readonly processedFinanceExportJobCount: number;
}

function isOnOrAfter(value: string, minimum?: string): boolean {
  if (!minimum) {
    return true;
  }

  return new Date(value).getTime() >= new Date(minimum).getTime();
}

function isOnOrBefore(value: string, maximum?: string): boolean {
  if (!maximum) {
    return true;
  }

  return new Date(value).getTime() <= new Date(maximum).getTime();
}

function escapeCsvCell(value: unknown): string {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);

  if (/[",\n]/u.test(normalized)) {
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  }

  return normalized;
}

function toCsvSection(name: string, rows: JsonObject[]): string {
  if (rows.length === 0) {
    return `${name}\nmessage\n(no rows)`;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort((left, right) =>
    left.localeCompare(right)
  );
  const body = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header])).join(",")
  );

  return [name, headers.join(","), ...body].join("\n");
}

function jsonToCsv(payload: FinanceExportPayload): string {
  return [
    toCsvSection("approval_requests", payload.approvalRequests),
    toCsvSection("statement_snapshots", payload.statementSnapshots),
    toCsvSection("funding_transactions", payload.fundingTransactions),
    toCsvSection(
      "settlement_execution_transactions",
      payload.settlementExecutionTransactions
    ),
    toCsvSection(
      "settlement_statement_aggregates",
      payload.settlementStatementAggregates
    ),
    toCsvSection("deal_version_finance_contexts", payload.dealVersionFinanceContexts)
  ].join("\n\n");
}

function toApprovalRequestRow(record: ApprovalRequestRecord, stepCount: number): JsonObject {
  return {
    actionKind: record.kind,
    approvalPolicyId: record.approvalPolicyId,
    costCenterId: record.costCenterId,
    decidedAt: record.decidedAt,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    requestedAt: record.requestedAt,
    settlementCurrency: record.settlementCurrency,
    status: record.status,
    stepCount,
    subjectFingerprint: record.subjectFingerprint,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    subjectType: record.subjectType,
    title: record.title,
    totalAmountMinor: record.totalAmountMinor
  };
}

function toStatementSnapshotRow(record: StatementSnapshotRecord): JsonObject {
  return {
    approvalRequestId: record.approvalRequestId,
    asOf: record.asOf,
    costCenterId: record.costCenterId,
    createdAt: record.createdAt,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    kind: record.kind,
    note: record.note,
    payload: record.payload
  };
}

function toFundingTransactionRow(record: FundingTransactionRecord): JsonObject {
  return {
    chainId: record.chainId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    reconciledAgreementAddress: record.reconciledAgreementAddress,
    reconciledAt: record.reconciledAt,
    reconciledConfirmedAt: record.reconciledConfirmedAt,
    reconciledMatchesTrackedVersion: record.reconciledMatchesTrackedVersion,
    reconciledStatus: record.reconciledStatus,
    stalePendingEscalatedAt: record.stalePendingEscalatedAt,
    submittedAt: record.submittedAt,
    supersededAt: record.supersededAt,
    transactionHash: record.transactionHash
  };
}

function toSettlementExecutionTransactionRow(
  record: DealMilestoneSettlementExecutionTransactionRecord
): JsonObject {
  return {
    chainId: record.chainId,
    dealMilestoneReviewId: record.dealMilestoneReviewId,
    dealMilestoneSettlementRequestId: record.dealMilestoneSettlementRequestId,
    dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    reconciledAgreementAddress: record.reconciledAgreementAddress,
    reconciledAt: record.reconciledAt,
    reconciledConfirmedAt: record.reconciledConfirmedAt,
    reconciledMatchesTrackedAgreement: record.reconciledMatchesTrackedAgreement,
    reconciledStatus: record.reconciledStatus,
    stalePendingEscalatedAt: record.stalePendingEscalatedAt,
    submittedAt: record.submittedAt,
    supersededAt: record.supersededAt,
    transactionHash: record.transactionHash
  };
}

function sumMilestones(milestones: readonly DealVersionMilestoneRecord[]): bigint {
  return milestones.reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n);
}

function sumSettlements(
  settlements: readonly EscrowAgreementMilestoneSettlementRecord[],
  kind: EscrowAgreementMilestoneSettlementRecord["kind"]
): bigint {
  return settlements
    .filter((record) => record.kind === kind)
    .reduce((total, record) => total + BigInt(record.amount), 0n);
}

export class FinanceExportReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly release9Repositories: Release9Repositories,
    private readonly chainId: number,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<FinanceExportReconciliationResult> {
    const claimedJob = await this.release9Repositories.financeExportJobs.claimNextPending(
      this.now()
    );

    if (!claimedJob) {
      return {
        completedFinanceExportJobCount: 0,
        failedFinanceExportJobCount: 0,
        generatedFinanceExportArtifactCount: 0,
        processedFinanceExportJobCount: 0
      };
    }

    try {
      const payload = await this.buildPayload(claimedJob);
      const artifacts = await this.persistArtifacts(claimedJob, payload);
      const finishedAt = this.now();

      await this.release9Repositories.financeExportJobs.update(claimedJob.id, {
        errorMessage: null,
        failedAt: null,
        finishedAt,
        status: "COMPLETED"
      });
      await this.release1Repositories.auditLogs.append({
        action: "FINANCE_EXPORT_COMPLETED",
        actorUserId: null,
        entityId: claimedJob.id,
        entityType: "FINANCE_EXPORT_JOB",
        id: randomUUID(),
        ipAddress: null,
        metadata: {
          artifactCount: artifacts.length
        },
        occurredAt: finishedAt,
        organizationId: claimedJob.organizationId,
        userAgent: "worker:finance-export-reconciler"
      });

      return {
        completedFinanceExportJobCount: 1,
        failedFinanceExportJobCount: 0,
        generatedFinanceExportArtifactCount: artifacts.length,
        processedFinanceExportJobCount: 1
      };
    } catch (error) {
      const failedAt = this.now();
      const errorMessage =
        error instanceof Error ? error.message : "finance export reconciliation failed";

      await this.release9Repositories.financeExportJobs.update(claimedJob.id, {
        errorMessage,
        failedAt,
        finishedAt: failedAt,
        status: "FAILED"
      });
      await this.release1Repositories.auditLogs.append({
        action: "FINANCE_EXPORT_FAILED",
        actorUserId: null,
        entityId: claimedJob.id,
        entityType: "FINANCE_EXPORT_JOB",
        id: randomUUID(),
        ipAddress: null,
        metadata: {
          errorMessage
        },
        occurredAt: failedAt,
        organizationId: claimedJob.organizationId,
        userAgent: "worker:finance-export-reconciler"
      });

      return {
        completedFinanceExportJobCount: 0,
        failedFinanceExportJobCount: 1,
        generatedFinanceExportArtifactCount: 0,
        processedFinanceExportJobCount: 1
      };
    }
  }

  private async buildPayload(job: FinanceExportJobRecord): Promise<FinanceExportPayload> {
    const filters = job.filters as unknown as FinanceExportFilters;
    const [
      drafts,
      approvalRequests,
      statementSnapshots,
      costCenters,
      agreements,
      indexedSettlements,
      settlementExecutionTransactions
    ] = await Promise.all([
      this.release1Repositories.draftDeals.listByOrganizationId(job.organizationId),
      this.release9Repositories.approvalRequests.listByOrganizationId(job.organizationId),
      this.release9Repositories.statementSnapshots.listByOrganizationId(job.organizationId),
      this.release9Repositories.costCenters.listByOrganizationId(job.organizationId),
      this.release4Repositories.escrowAgreements.listByChainId(this.chainId),
      this.release4Repositories.escrowAgreementMilestoneSettlements.listByChainId(this.chainId),
      this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
        this.chainId
      )
    ]);
    const versions = (
      await Promise.all(drafts.map((draft) => this.release1Repositories.dealVersions.listByDraftDealId(draft.id)))
    ).flat();
    const milestonesByVersionId = new Map<string, DealVersionMilestoneRecord[]>(
      await Promise.all(
        versions.map(async (version) => [
          version.id,
          await this.release1Repositories.dealVersionMilestones.listByDealVersionId(version.id)
        ] as const)
      )
    );
    const fundingTransactions = (
      await Promise.all(
        drafts.map((draft) => this.release1Repositories.fundingTransactions.listByDraftDealId(draft.id))
      )
    ).flat();
    const filteredDrafts = drafts.filter((draft) => {
      if (filters.draftDealId && draft.id !== filters.draftDealId) {
        return false;
      }
      if (filters.costCenterId && draft.costCenterId !== filters.costCenterId) {
        return false;
      }
      return true;
    });
    const visibleDraftIds = new Set(filteredDrafts.map((draft) => draft.id));
    const filteredVersions = versions.filter((version) => {
      if (!visibleDraftIds.has(version.draftDealId)) {
        return false;
      }
      if (filters.dealVersionId && version.id !== filters.dealVersionId) {
        return false;
      }
      return true;
    });
    const draftById = new Map(filteredDrafts.map((draft) => [draft.id, draft] as const));
    const latestVersionByDraftId = new Map<string, DealVersionRecord>();

    for (const version of filteredVersions) {
      const current = latestVersionByDraftId.get(version.draftDealId) ?? null;

      if (!current || current.versionNumber < version.versionNumber) {
        latestVersionByDraftId.set(version.draftDealId, version);
      }
    }

    const agreementsByDealId = new Map<string, EscrowAgreementRecord>(
      agreements.map((agreement) => [agreement.dealId, agreement] as const)
    );
    const settlementsByAgreementAddress = new Map<
      string,
      EscrowAgreementMilestoneSettlementRecord[]
    >();

    for (const settlement of indexedSettlements) {
      const current = settlementsByAgreementAddress.get(settlement.agreementAddress) ?? [];
      current.push(settlement);
      settlementsByAgreementAddress.set(settlement.agreementAddress, current);
    }

    const approvalRequestRows = await Promise.all(
      approvalRequests
        .filter((record) => {
          if (filters.actionKinds && !filters.actionKinds.includes(record.kind)) {
            return false;
          }
          if (filters.statuses && !filters.statuses.includes(record.status)) {
            return false;
          }
          if (filters.draftDealId && record.draftDealId !== filters.draftDealId) {
            return false;
          }
          if (filters.dealVersionId && record.dealVersionId !== filters.dealVersionId) {
            return false;
          }
          if (filters.costCenterId && record.costCenterId !== filters.costCenterId) {
            return false;
          }
          return (
            isOnOrAfter(record.requestedAt, filters.dateFrom) &&
            isOnOrBefore(record.requestedAt, filters.dateTo)
          );
        })
        .map(async (record) =>
          toApprovalRequestRow(
            record,
            (
              await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
                record.id
              )
            ).length
          )
        )
    );
    const statementSnapshotRows = statementSnapshots
      .filter((record) => {
        if (!visibleDraftIds.has(record.draftDealId)) {
          return false;
        }
        if (filters.dealVersionId && record.dealVersionId !== filters.dealVersionId) {
          return false;
        }
        if (filters.costCenterId && record.costCenterId !== filters.costCenterId) {
          return false;
        }
        return isOnOrAfter(record.createdAt, filters.dateFrom) &&
          isOnOrBefore(record.createdAt, filters.dateTo);
      })
      .map(toStatementSnapshotRow);
    const fundingTransactionRows = fundingTransactions
      .filter((record) => {
        if (!visibleDraftIds.has(record.draftDealId)) {
          return false;
        }
        if (filters.dealVersionId && record.dealVersionId !== filters.dealVersionId) {
          return false;
        }
        return isOnOrAfter(record.submittedAt, filters.dateFrom) &&
          isOnOrBefore(record.submittedAt, filters.dateTo);
      })
      .map(toFundingTransactionRow);
    const settlementExecutionRows = settlementExecutionTransactions
      .filter((record) => {
        if (record.organizationId !== job.organizationId) {
          return false;
        }
        if (!visibleDraftIds.has(record.draftDealId)) {
          return false;
        }
        if (filters.dealVersionId && record.dealVersionId !== filters.dealVersionId) {
          return false;
        }
        return isOnOrAfter(record.submittedAt, filters.dateFrom) &&
          isOnOrBefore(record.submittedAt, filters.dateTo);
      })
      .map(toSettlementExecutionTransactionRow);
    const settlementStatementAggregates = filteredVersions
      .filter((version) => latestVersionByDraftId.get(version.draftDealId)?.id === version.id)
      .map((version) => {
        const draft = draftById.get(version.draftDealId);

        if (!draft) {
          return null;
        }

        const dealId = buildCanonicalDealId(job.organizationId, draft.id);
        const linkedAgreement = agreementsByDealId.get(dealId) ?? null;
        const versionMilestones = milestonesByVersionId.get(version.id) ?? [];
        const agreementSettlements = linkedAgreement
          ? settlementsByAgreementAddress.get(linkedAgreement.agreementAddress) ?? []
          : [];
        const releasedAmountMinor = sumSettlements(agreementSettlements, "RELEASE");
        const refundedAmountMinor = sumSettlements(agreementSettlements, "REFUND");
        const totalAmountMinor = sumMilestones(versionMilestones);
        const pendingAmountMinor = totalAmountMinor - releasedAmountMinor - refundedAmountMinor;
        const latestSettledAt =
          [...agreementSettlements]
            .sort((left, right) => right.settledAt.localeCompare(left.settledAt))[0]
            ?.settledAt ?? null;

        if (
          latestSettledAt &&
          (!isOnOrAfter(latestSettledAt, filters.dateFrom) ||
            !isOnOrBefore(latestSettledAt, filters.dateTo))
        ) {
          return null;
        }

        return {
          dealVersionId: version.id,
          draftDealId: draft.id,
          linkedAgreementAddress: linkedAgreement?.agreementAddress ?? null,
          pendingAmountMinor: (pendingAmountMinor > 0n ? pendingAmountMinor : 0n).toString(),
          refundedAmountMinor: refundedAmountMinor.toString(),
          releasedAmountMinor: releasedAmountMinor.toString(),
          settlementCount: agreementSettlements.length,
          settlementCurrency: version.settlementCurrency,
          title: version.title,
          totalAmountMinor: totalAmountMinor.toString(),
          versionNumber: version.versionNumber,
          latestSettledAt
        } satisfies JsonObject;
      })
      .filter((row) => row !== null)
      .map((row) => row as JsonObject);
    const dealVersionFinanceContexts = filteredVersions.map((version) => {
      const draft = draftById.get(version.draftDealId);
      const milestones = milestonesByVersionId.get(version.id) ?? [];
      const latestFundingTransaction =
        [...fundingTransactions]
          .filter((record) => record.dealVersionId === version.id)
          .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))[0] ??
        null;

      return {
        costCenterCode:
          costCenters.find((record) => record.id === draft?.costCenterId)?.code ?? null,
        costCenterId: draft?.costCenterId ?? null,
        dealVersionId: version.id,
        draftDealId: version.draftDealId,
        latestFundingReconciledStatus: latestFundingTransaction?.reconciledStatus ?? null,
        latestFundingSubmittedAt: latestFundingTransaction?.submittedAt ?? null,
        milestoneCount: milestones.length,
        settlementCurrency: version.settlementCurrency,
        title: version.title,
        totalAmountMinor: sumMilestones(milestones).toString(),
        versionNumber: version.versionNumber
      } satisfies JsonObject;
    });

    return {
      approvalRequests: approvalRequestRows,
      dealVersionFinanceContexts,
      filters,
      generatedAt: this.now(),
      organizationId: job.organizationId,
      settlementExecutionTransactions: settlementExecutionRows,
      settlementStatementAggregates,
      statementSnapshots: statementSnapshotRows,
      fundingTransactions: fundingTransactionRows
    };
  }

  private async persistArtifacts(
    job: FinanceExportJobRecord,
    payload: FinanceExportPayload
  ): Promise<FinanceExportArtifactRecord[]> {
    const createdAt = this.now();
    const jsonBody = JSON.stringify(payload, null, 2);
    const csvBody = jsonToCsv(payload);
    const artifacts: FinanceExportArtifactRecord[] = [
      {
        body: jsonBody,
        createdAt,
        fileId: null,
        filename: `finance-export-${job.id}.json`,
        financeExportJobId: job.id,
        format: "JSON",
        id: randomUUID(),
        mediaType: "application/json",
        sizeBytes: Buffer.byteLength(jsonBody, "utf8")
      },
      {
        body: csvBody,
        createdAt,
        fileId: null,
        filename: `finance-export-${job.id}.csv`,
        financeExportJobId: job.id,
        format: "CSV",
        id: randomUUID(),
        mediaType: "text/csv; charset=utf-8",
        sizeBytes: Buffer.byteLength(csvBody, "utf8")
      }
    ];

    for (const artifact of artifacts) {
      await this.release9Repositories.financeExportArtifacts.create(artifact);
      await this.release1Repositories.auditLogs.append({
        action: "FINANCE_EXPORT_COMPLETED",
        actorUserId: null,
        entityId: artifact.id,
        entityType: "FINANCE_EXPORT_ARTIFACT",
        id: randomUUID(),
        ipAddress: null,
        metadata: {
          filename: artifact.filename,
          financeExportJobId: job.id,
          format: artifact.format,
          sizeBytes: artifact.sizeBytes
        },
        occurredAt: createdAt,
        organizationId: job.organizationId,
        userAgent: "worker:finance-export-reconciler"
      });
    }

    return artifacts;
  }
}
