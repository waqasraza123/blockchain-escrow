import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  FundingTransactionRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import {
  buildCanonicalDealId,
  buildDesiredFundingTransactionReconciliationState,
  buildPersistedFundingTransactionReconciliationState,
  fundingTransactionReconciliationStateChanged,
  resolveFundingTransactionStalePendingState,
  resolveFundingTransactionState,
  type FundingTransactionStalePendingState
} from "@blockchain-escrow/shared";

import type { WorkerFundingReconciliationConfiguration } from "./config";

function buildStalePendingAuditMetadata(input: {
  chainId: number;
  dealId: `0x${string}`;
  escalatedAt: string;
  fundingTransactionId: string;
  stalePendingState: FundingTransactionStalePendingState;
  transactionHash: `0x${string}`;
}): Record<string, string | number | boolean | null> {
  return {
    chainId: input.chainId,
    dealId: input.dealId,
    fundingTransactionId: input.fundingTransactionId,
    stalePendingAt: input.stalePendingState.stalePendingAt,
    stalePendingEscalatedAt: input.escalatedAt,
    stalePendingEvaluation: input.stalePendingState.stalePendingEvaluation,
    transactionHash: input.transactionHash
  };
}

function buildFundingReconciliationAuditMetadata(input: {
  chainId: number;
  dealId: `0x${string}`;
  fundingTransaction: FundingTransactionRecord;
  nextReconciliation: Pick<
    FundingTransactionRecord,
    | "reconciledAgreementAddress"
    | "reconciledAt"
    | "reconciledConfirmedAt"
    | "reconciledMatchesTrackedVersion"
    | "reconciledStatus"
  >;
}): Record<string, string | number | boolean | null> {
  return {
    chainId: input.chainId,
    dealId: input.dealId,
    fundingTransactionId: input.fundingTransaction.id,
    previousReconciledAt: input.fundingTransaction.reconciledAt,
    previousReconciledStatus: input.fundingTransaction.reconciledStatus,
    reconciledAgreementAddress: input.nextReconciliation.reconciledAgreementAddress,
    reconciledAt: input.nextReconciliation.reconciledAt,
    reconciledConfirmedAt: input.nextReconciliation.reconciledConfirmedAt,
    reconciledMatchesTrackedVersion:
      input.nextReconciliation.reconciledMatchesTrackedVersion,
    reconciledStatus: input.nextReconciliation.reconciledStatus,
    reconciliationCleared: input.nextReconciliation.reconciledStatus === null,
    transactionHash: input.fundingTransaction.transactionHash
  };
}

export interface FundingReconciliationResult {
  readonly clearedFundingReconciliationCount: number;
  readonly reconciledFundingTransactionCount: number;
  readonly scannedFundingTransactionCount: number;
  readonly stalePendingEscalationCount: number;
}

export class FundingReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly chainId: number,
    private readonly configuration: WorkerFundingReconciliationConfiguration,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<FundingReconciliationResult> {
    const [fundingTransactions, agreements, indexedTransactions, release4ChainCursor] =
      await Promise.all([
        this.release1Repositories.fundingTransactions.listByChainId(this.chainId),
        this.release4Repositories.escrowAgreements.listByChainId(this.chainId),
        this.release4Repositories.indexedTransactions.listByChainId(this.chainId),
        this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
          this.chainId,
          this.configuration.release4CursorKey
        )
      ]);

    const manifest = getDeploymentManifestByChainId(this.chainId);
    const requiresFundedAgreement = manifest
      ? deploymentSupportsCreateAndFund(manifest)
      : false;
    const agreementsByObservedTransactionHash = new Map(
      agreements.flatMap((agreement) => {
        const entries: [`0x${string}`, (typeof agreements)[number]][] = [
          [agreement.createdTransactionHash, agreement]
        ];

        if (agreement.fundedTransactionHash) {
          entries.push([agreement.fundedTransactionHash, agreement]);
        }

        return entries;
      })
    );
    const indexedTransactionsByHash = new Map(
      indexedTransactions.map((transaction) => [
        transaction.transactionHash,
        transaction
      ] as const)
    );
    const occurredAt = this.now();
    let clearedFundingReconciliationCount = 0;
    let reconciledFundingTransactionCount = 0;
    let stalePendingEscalationCount = 0;

    for (const fundingTransaction of fundingTransactions) {
      const dealId = buildCanonicalDealId(
        fundingTransaction.organizationId,
        fundingTransaction.draftDealId
      );
      const resolvedState = resolveFundingTransactionState({
        dealId,
        fundingTransaction,
        indexedTransaction:
          indexedTransactionsByHash.get(fundingTransaction.transactionHash) ?? null,
        observedAgreement:
          agreementsByObservedTransactionHash.get(fundingTransaction.transactionHash) ?? null,
        requiresFundedAgreement
      });
      const desiredReconciliationState =
        buildDesiredFundingTransactionReconciliationState(resolvedState);

      if (
        fundingTransactionReconciliationStateChanged({
          currentState: {
            reconciledAgreementAddress: fundingTransaction.reconciledAgreementAddress,
            reconciledAt: fundingTransaction.reconciledAt,
            reconciledConfirmedAt: fundingTransaction.reconciledConfirmedAt,
            reconciledMatchesTrackedVersion:
              fundingTransaction.reconciledMatchesTrackedVersion,
            reconciledStatus: fundingTransaction.reconciledStatus
          },
          desiredState: desiredReconciliationState
        })
      ) {
        const nextReconciliation = buildPersistedFundingTransactionReconciliationState({
          desiredState: desiredReconciliationState,
          reconciledAt: occurredAt
        });
        const updatedTransaction =
          await this.release1Repositories.fundingTransactions.updateReconciliation(
            fundingTransaction.id,
            nextReconciliation
          );

        if (nextReconciliation.reconciledStatus) {
          reconciledFundingTransactionCount += 1;
        } else {
          clearedFundingReconciliationCount += 1;
        }

        await this.release1Repositories.auditLogs.append({
          action: "FUNDING_TRANSACTION_RECONCILIATION_UPDATED",
          actorUserId: null,
          entityId: updatedTransaction.id,
          entityType: "FUNDING_TRANSACTION",
          id: randomUUID(),
          ipAddress: null,
          metadata: buildFundingReconciliationAuditMetadata({
            chainId: this.chainId,
            dealId,
            fundingTransaction,
            nextReconciliation
          }),
          occurredAt,
          organizationId: updatedTransaction.organizationId,
          userAgent: "worker:funding-reconciler"
        });
      }

      if (fundingTransaction.stalePendingEscalatedAt) {
        continue;
      }

      const stalePendingState = resolveFundingTransactionStalePendingState({
        currentStatus: resolvedState.status,
        evaluatedAt: occurredAt,
        fundingTransaction,
        indexerFreshnessTtlSeconds: this.configuration.indexerFreshnessTtlSeconds,
        pendingStaleAfterSeconds: this.configuration.pendingStaleAfterSeconds,
        release4ChainCursor
      });

      if (stalePendingState.stalePending !== true) {
        continue;
      }

      const updatedTransaction =
        await this.release1Repositories.fundingTransactions.markStalePendingEscalated(
          fundingTransaction.id,
          occurredAt
        );
      stalePendingEscalationCount += 1;

      await this.release1Repositories.auditLogs.append({
        action: "FUNDING_TRANSACTION_STALE_PENDING",
        actorUserId: null,
        entityId: updatedTransaction.id,
        entityType: "FUNDING_TRANSACTION",
        id: randomUUID(),
        ipAddress: null,
        metadata: buildStalePendingAuditMetadata({
          chainId: this.chainId,
          dealId,
          escalatedAt: occurredAt,
          fundingTransactionId: updatedTransaction.id,
          stalePendingState,
          transactionHash: updatedTransaction.transactionHash
        }),
        occurredAt,
        organizationId: updatedTransaction.organizationId,
        userAgent: "worker:funding-reconciler"
      });
    }

    return {
      clearedFundingReconciliationCount,
      reconciledFundingTransactionCount,
      scannedFundingTransactionCount: fundingTransactions.length,
      stalePendingEscalationCount
    };
  }
}
