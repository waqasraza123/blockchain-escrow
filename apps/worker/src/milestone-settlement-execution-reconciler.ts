import { randomUUID } from "node:crypto";

import type {
  DealMilestoneSettlementExecutionTransactionRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import {
  buildCanonicalDealId,
  buildDesiredSettlementExecutionTransactionReconciliationState,
  buildPersistedSettlementExecutionTransactionReconciliationState,
  resolveSettlementExecutionTransactionStalePendingState,
  resolveSettlementExecutionTransactionState,
  settlementExecutionTransactionReconciliationStateChanged,
  type SettlementExecutionTransactionStalePendingState
} from "@blockchain-escrow/shared";

import type { WorkerMilestoneSettlementExecutionReconciliationConfiguration } from "./config";

function buildStalePendingAuditMetadata(input: {
  chainId: number;
  dealId: `0x${string}`;
  escalatedAt: string;
  settlementExecutionTransaction: DealMilestoneSettlementExecutionTransactionRecord;
  stalePendingState: SettlementExecutionTransactionStalePendingState;
}): Record<string, string | number | boolean | null> {
  return {
    chainId: input.chainId,
    dealId: input.dealId,
    settlementExecutionTransactionId: input.settlementExecutionTransaction.id,
    stalePendingAt: input.stalePendingState.stalePendingAt,
    stalePendingEscalatedAt: input.escalatedAt,
    stalePendingEvaluation: input.stalePendingState.stalePendingEvaluation,
    transactionHash: input.settlementExecutionTransaction.transactionHash
  };
}

function buildReconciliationAuditMetadata(input: {
  chainId: number;
  dealId: `0x${string}`;
  expectedAgreementAddress: `0x${string}` | null;
  nextReconciliation: Pick<
    DealMilestoneSettlementExecutionTransactionRecord,
    | "reconciledAgreementAddress"
    | "reconciledAt"
    | "reconciledConfirmedAt"
    | "reconciledMatchesTrackedAgreement"
    | "reconciledStatus"
  >;
  settlementExecutionTransaction: DealMilestoneSettlementExecutionTransactionRecord;
}): Record<string, string | number | boolean | null> {
  return {
    chainId: input.chainId,
    dealId: input.dealId,
    expectedAgreementAddress: input.expectedAgreementAddress,
    previousReconciledAt: input.settlementExecutionTransaction.reconciledAt,
    previousReconciledStatus: input.settlementExecutionTransaction.reconciledStatus,
    reconciledAgreementAddress: input.nextReconciliation.reconciledAgreementAddress,
    reconciledAt: input.nextReconciliation.reconciledAt,
    reconciledConfirmedAt: input.nextReconciliation.reconciledConfirmedAt,
    reconciledMatchesTrackedAgreement:
      input.nextReconciliation.reconciledMatchesTrackedAgreement,
    reconciledStatus: input.nextReconciliation.reconciledStatus,
    reconciliationCleared: input.nextReconciliation.reconciledStatus === null,
    settlementExecutionTransactionId: input.settlementExecutionTransaction.id,
    transactionHash: input.settlementExecutionTransaction.transactionHash
  };
}

export interface MilestoneSettlementExecutionReconciliationResult {
  readonly clearedMilestoneSettlementExecutionReconciliationCount: number;
  readonly reconciledMilestoneSettlementExecutionTransactionCount: number;
  readonly scannedMilestoneSettlementExecutionTransactionCount: number;
  readonly stalePendingMilestoneSettlementExecutionCount: number;
}

export class MilestoneSettlementExecutionReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly chainId: number,
    private readonly configuration: WorkerMilestoneSettlementExecutionReconciliationConfiguration,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<MilestoneSettlementExecutionReconciliationResult> {
    const [
      settlementExecutionTransactions,
      settlementPreparations,
      indexedTransactions,
      release4ChainCursor
    ] = await Promise.all([
      this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
        this.chainId
      ),
      this.release1Repositories.dealMilestoneSettlementPreparations.listByChainId(
        this.chainId
      ),
      this.release4Repositories.indexedTransactions.listByChainId(this.chainId),
      this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
        this.chainId,
        this.configuration.release4CursorKey
      )
    ]);

    const preparationsByRequestId = new Map(
      settlementPreparations.map((record) => [
        record.dealMilestoneSettlementRequestId,
        record
      ] as const)
    );
    const indexedTransactionsByHash = new Map(
      indexedTransactions.map((transaction) => [transaction.transactionHash, transaction] as const)
    );
    const occurredAt = this.now();
    let clearedMilestoneSettlementExecutionReconciliationCount = 0;
    let reconciledMilestoneSettlementExecutionTransactionCount = 0;
    let stalePendingMilestoneSettlementExecutionCount = 0;

    for (const settlementExecutionTransaction of settlementExecutionTransactions) {
      const dealId = buildCanonicalDealId(
        settlementExecutionTransaction.organizationId,
        settlementExecutionTransaction.draftDealId
      );
      const expectedAgreementAddress =
        preparationsByRequestId.get(
          settlementExecutionTransaction.dealMilestoneSettlementRequestId
        )?.agreementAddress ?? null;
      const resolvedState = resolveSettlementExecutionTransactionState({
        agreementAddress: expectedAgreementAddress,
        indexedTransaction:
          indexedTransactionsByHash.get(settlementExecutionTransaction.transactionHash) ??
          null,
        settlementExecutionTransaction
      });
      const desiredReconciliationState =
        buildDesiredSettlementExecutionTransactionReconciliationState(resolvedState);

      if (
        settlementExecutionTransactionReconciliationStateChanged({
          currentState: {
            reconciledAgreementAddress:
              settlementExecutionTransaction.reconciledAgreementAddress,
            reconciledAt: settlementExecutionTransaction.reconciledAt,
            reconciledConfirmedAt:
              settlementExecutionTransaction.reconciledConfirmedAt,
            reconciledMatchesTrackedAgreement:
              settlementExecutionTransaction.reconciledMatchesTrackedAgreement,
            reconciledStatus: settlementExecutionTransaction.reconciledStatus
          },
          desiredState: desiredReconciliationState
        })
      ) {
        const nextReconciliation =
          buildPersistedSettlementExecutionTransactionReconciliationState({
            desiredState: desiredReconciliationState,
            reconciledAt: occurredAt
          });
        const updatedTransaction =
          await this.release1Repositories.dealMilestoneSettlementExecutionTransactions.updateReconciliation(
            settlementExecutionTransaction.id,
            nextReconciliation
          );

        if (nextReconciliation.reconciledStatus) {
          reconciledMilestoneSettlementExecutionTransactionCount += 1;
        } else {
          clearedMilestoneSettlementExecutionReconciliationCount += 1;
        }

        await this.release1Repositories.auditLogs.append({
          action:
            "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_RECONCILIATION_UPDATED",
          actorUserId: null,
          entityId: updatedTransaction.id,
          entityType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
          id: randomUUID(),
          ipAddress: null,
          metadata: buildReconciliationAuditMetadata({
            chainId: this.chainId,
            dealId,
            expectedAgreementAddress,
            nextReconciliation,
            settlementExecutionTransaction
          }),
          occurredAt,
          organizationId: updatedTransaction.organizationId,
          userAgent: "worker:milestone-settlement-execution-reconciler"
        });
      }

      if (settlementExecutionTransaction.stalePendingEscalatedAt) {
        continue;
      }

      const stalePendingState =
        resolveSettlementExecutionTransactionStalePendingState({
          currentStatus: resolvedState.status,
          evaluatedAt: occurredAt,
          indexerFreshnessTtlSeconds:
            this.configuration.indexerFreshnessTtlSeconds,
          pendingStaleAfterSeconds:
            this.configuration.pendingStaleAfterSeconds,
          release4ChainCursor,
          settlementExecutionTransaction
        });

      if (stalePendingState.stalePending !== true) {
        continue;
      }

      const updatedTransaction =
        await this.release1Repositories.dealMilestoneSettlementExecutionTransactions.markStalePendingEscalated(
          settlementExecutionTransaction.id,
          occurredAt
        );
      stalePendingMilestoneSettlementExecutionCount += 1;

      await this.release1Repositories.auditLogs.append({
        action: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_STALE_PENDING",
        actorUserId: null,
        entityId: updatedTransaction.id,
        entityType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
        id: randomUUID(),
        ipAddress: null,
        metadata: buildStalePendingAuditMetadata({
          chainId: this.chainId,
          dealId,
          escalatedAt: occurredAt,
          settlementExecutionTransaction: updatedTransaction,
          stalePendingState
        }),
        occurredAt,
        organizationId: updatedTransaction.organizationId,
        userAgent: "worker:milestone-settlement-execution-reconciler"
      });
    }

    return {
      clearedMilestoneSettlementExecutionReconciliationCount,
      reconciledMilestoneSettlementExecutionTransactionCount,
      scannedMilestoneSettlementExecutionTransactionCount:
        settlementExecutionTransactions.length,
      stalePendingMilestoneSettlementExecutionCount
    };
  }
}
