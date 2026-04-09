import { randomUUID } from "node:crypto";

import type {
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import {
  buildCanonicalDealId,
  custodyTrackedDealStates,
  type DealState
} from "@blockchain-escrow/shared";

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function findLatestSettlement(
  settlements: readonly EscrowAgreementMilestoneSettlementRecord[]
): EscrowAgreementMilestoneSettlementRecord | null {
  return settlements.reduce<EscrowAgreementMilestoneSettlementRecord | null>(
    (latest, settlement) => {
      if (!latest) {
        return settlement;
      }

      if (compareIsoTimestamps(settlement.settledAt, latest.settledAt) > 0) {
        return settlement;
      }

      if (
        settlement.settledAt === latest.settledAt &&
        settlement.milestonePosition > latest.milestonePosition
      ) {
        return settlement;
      }

      return latest;
    },
    null
  );
}

function resolveDraftCustodyState(
  linkedAgreement: EscrowAgreementRecord,
  settlements: readonly EscrowAgreementMilestoneSettlementRecord[]
): DealState {
  if (settlements.length === 0 || linkedAgreement.milestoneCount <= 0) {
    return "ACTIVE";
  }

  if (settlements.length >= linkedAgreement.milestoneCount) {
    return settlements.every((settlement) => settlement.kind === "REFUND")
      ? "REFUNDED"
      : "COMPLETED";
  }

  // The canonical deal states do not yet distinguish partial refund from partial
  // release, so non-terminal partial settlement stays in PARTIALLY_RELEASED.
  return "PARTIALLY_RELEASED";
}

function buildDraftCustodyStateAuditMetadata(input: {
  chainId: number;
  linkedAgreement: EscrowAgreementRecord;
  nextState: DealState;
  previousState: DealState;
  settlements: readonly EscrowAgreementMilestoneSettlementRecord[];
}): Record<string, number | string | null> {
  const latestSettlement = findLatestSettlement(input.settlements);
  const releasedMilestoneCount = input.settlements.filter(
    (settlement) => settlement.kind === "RELEASE"
  ).length;
  const refundedMilestoneCount = input.settlements.filter(
    (settlement) => settlement.kind === "REFUND"
  ).length;

  return {
    agreementAddress: input.linkedAgreement.agreementAddress,
    chainId: input.chainId,
    dealId: input.linkedAgreement.dealId,
    dealVersionHash: input.linkedAgreement.dealVersionHash,
    latestSettlementKind: latestSettlement?.kind ?? null,
    latestSettlementMilestonePosition: latestSettlement?.milestonePosition ?? null,
    latestSettlementOccurredAt: latestSettlement?.settledAt ?? null,
    latestSettlementTransactionHash:
      latestSettlement?.settledTransactionHash ?? null,
    milestoneCount: input.linkedAgreement.milestoneCount,
    nextState: input.nextState,
    previousState: input.previousState,
    refundedMilestoneCount,
    releasedMilestoneCount,
    settledMilestoneCount: input.settlements.length
  };
}

export interface DraftCustodyStateReconciliationResult {
  readonly reconciledDraftCustodyStateCount: number;
  readonly scannedDraftCustodyStateCount: number;
}

export class DraftCustodyStateReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly chainId: number,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<DraftCustodyStateReconciliationResult> {
    const [drafts, agreements, settlements] = await Promise.all([
      this.release1Repositories.draftDeals.listByStates([...custodyTrackedDealStates]),
      this.release4Repositories.escrowAgreements.listByChainId(this.chainId),
      this.release4Repositories.escrowAgreementMilestoneSettlements.listByChainId(
        this.chainId
      )
    ]);
    const agreementsByDealId = new Map(
      agreements.map((agreement) => [agreement.dealId, agreement] as const)
    );
    const settlementsByAgreementAddress = new Map<
      string,
      EscrowAgreementMilestoneSettlementRecord[]
    >();
    let reconciledDraftCustodyStateCount = 0;
    const occurredAt = this.now();

    for (const settlement of settlements) {
      const records =
        settlementsByAgreementAddress.get(settlement.agreementAddress) ?? [];
      records.push(settlement);
      settlementsByAgreementAddress.set(settlement.agreementAddress, records);
    }

    for (const draft of drafts) {
      const linkedAgreement =
        agreementsByDealId.get(buildCanonicalDealId(draft.organizationId, draft.id)) ??
        null;

      if (!linkedAgreement) {
        continue;
      }

      const draftSettlements =
        settlementsByAgreementAddress.get(linkedAgreement.agreementAddress) ?? [];
      const desiredState = resolveDraftCustodyState(linkedAgreement, draftSettlements);

      if (draft.state === desiredState) {
        continue;
      }

      const previousState = draft.state;

      const updatedDraft = await this.release1Repositories.draftDeals.updateState(
        draft.id,
        desiredState,
        occurredAt
      );

      if (!updatedDraft) {
        continue;
      }

      reconciledDraftCustodyStateCount += 1;

      await this.release1Repositories.auditLogs.append({
        action: "DRAFT_DEAL_CUSTODY_STATE_RECONCILED",
        actorUserId: null,
        entityId: updatedDraft.id,
        entityType: "DRAFT_DEAL",
        id: randomUUID(),
        ipAddress: null,
        metadata: buildDraftCustodyStateAuditMetadata({
          chainId: this.chainId,
          linkedAgreement,
          nextState: desiredState,
          previousState,
          settlements: draftSettlements
        }),
        occurredAt,
        organizationId: updatedDraft.organizationId,
        userAgent: "worker:draft-custody-state-reconciler"
      });
    }

    return {
      reconciledDraftCustodyStateCount,
      scannedDraftCustodyStateCount: drafts.length
    };
  }
}
