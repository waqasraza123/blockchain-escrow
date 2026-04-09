import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuditLogRecord,
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { buildCanonicalDealId } from "@blockchain-escrow/shared";

import { DraftCustodyStateReconciler } from "../src/draft-custody-state-reconciler";

function createDraft(overrides: Partial<DraftDealRecord> = {}): DraftDealRecord {
  return {
    createdAt: "2026-04-09T09:00:00.000Z",
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Escrow draft",
    templateId: null,
    title: "Escrow draft",
    updatedAt: "2026-04-09T09:00:00.000Z",
    ...overrides
  };
}

function createAgreement(
  draft: DraftDealRecord,
  overrides: Partial<EscrowAgreementRecord> = {}
): EscrowAgreementRecord {
  return {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: "0x4444444444444444444444444444444444444444",
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    dealId: buildCanonicalDealId(draft.organizationId, draft.id),
    dealVersionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    factoryAddress: "0x8888888888888888888888888888888888888888",
    feeVaultAddress: "0x9999999999999999999999999999999999999999",
    funded: true,
    fundedAt: "2026-04-09T09:01:00.000Z",
    fundedBlockHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    fundedBlockNumber: "11",
    fundedLogIndex: 0,
    fundedPayerAddress: "0x4444444444444444444444444444444444444444",
    fundedTransactionHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    initializedBlockHash:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: "2026-04-09T09:00:00.000Z",
    initializedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    milestoneCount: 2,
    protocolConfigAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    protocolFeeBps: 250,
    sellerAddress: "0x5555555555555555555555555555555555555555",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000",
    updatedAt: "2026-04-09T09:01:00.000Z",
    ...overrides
  };
}

function createSettlement(
  agreement: EscrowAgreementRecord,
  milestonePosition: number,
  kind: "RELEASE" | "REFUND",
  overrides: Partial<EscrowAgreementMilestoneSettlementRecord> = {}
): EscrowAgreementMilestoneSettlementRecord {
  return {
    agreementAddress: agreement.agreementAddress,
    amount: milestonePosition === 1 ? "1000000" : "2000000",
    beneficiaryAddress:
      kind === "RELEASE" ? agreement.sellerAddress : agreement.buyerAddress,
    chainId: agreement.chainId,
    dealId: agreement.dealId,
    dealVersionHash: agreement.dealVersionHash,
    kind,
    milestonePosition,
    settledAt: `2026-04-09T09:0${milestonePosition + 1}:00.000Z`,
    settledBlockHash:
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    settledBlockNumber: `${11 + milestonePosition}`,
    settledByAddress: agreement.buyerAddress,
    settledLogIndex: milestonePosition - 1,
    settledTransactionHash: `0x${`${milestonePosition}`.repeat(64)}` as `0x${string}`,
    updatedAt: `2026-04-09T09:0${milestonePosition + 1}:00.000Z`,
    ...overrides
  };
}

function createRelease1Repositories(drafts: DraftDealRecord[]) {
  const auditLogs: AuditLogRecord[] = [];

  return {
    auditLogs,
    repositories: {
      auditLogs: {
        append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
          auditLogs.push(record);
          return record;
        }
      },
      draftDeals: {
        listByStates: async (
          states: DraftDealRecord["state"][]
        ): Promise<DraftDealRecord[]> =>
          drafts.filter((draft) => states.includes(draft.state)),
        updateState: async (
          id: string,
          state: DraftDealRecord["state"],
          updatedAt: string
        ): Promise<DraftDealRecord | null> => {
          const draft = drafts.find((entry) => entry.id === id) ?? null;

          if (!draft) {
            return null;
          }

          draft.state = state;
          draft.updatedAt = updatedAt;
          return draft;
        }
      }
    } as unknown as Release1Repositories
  };
}

function createRelease4Repositories(input: {
  agreements: EscrowAgreementRecord[];
  settlements?: EscrowAgreementMilestoneSettlementRecord[];
}) {
  return {
    repositories: {
      escrowAgreements: {
        listByChainId: async (chainId: number): Promise<EscrowAgreementRecord[]> =>
          input.agreements.filter((agreement) => agreement.chainId === chainId)
      },
      escrowAgreementMilestoneSettlements: {
        listByChainId: async (
          chainId: number
        ): Promise<EscrowAgreementMilestoneSettlementRecord[]> =>
          (input.settlements ?? []).filter((settlement) => settlement.chainId === chainId)
      }
    } as unknown as Release4Repositories
  };
}

test("draft custody state reconciler marks partially refunded drafts as PARTIALLY_RELEASED", async () => {
  const draft = createDraft();
  const agreement = createAgreement(draft);
  const release1 = createRelease1Repositories([draft]);
  const release4 = createRelease4Repositories({
    agreements: [agreement],
    settlements: [createSettlement(agreement, 1, "REFUND")]
  });
  const reconciler = new DraftCustodyStateReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-09T09:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedDraftCustodyStateCount, 1);
  assert.equal(result.reconciledDraftCustodyStateCount, 1);
  assert.equal(draft.state, "PARTIALLY_RELEASED");
  assert.equal(
    release1.auditLogs[0]?.action,
    "DRAFT_DEAL_CUSTODY_STATE_RECONCILED"
  );
  assert.equal(release1.auditLogs[0]?.metadata?.refundedMilestoneCount, 1);
  assert.equal(release1.auditLogs[0]?.metadata?.nextState, "PARTIALLY_RELEASED");
});

test("draft custody state reconciler marks terminal mixed-settlement drafts as COMPLETED", async () => {
  const draft = createDraft();
  const agreement = createAgreement(draft);
  const release1 = createRelease1Repositories([draft]);
  const release4 = createRelease4Repositories({
    agreements: [agreement],
    settlements: [
      createSettlement(agreement, 1, "RELEASE"),
      createSettlement(agreement, 2, "REFUND")
    ]
  });
  const reconciler = new DraftCustodyStateReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-09T09:06:00.000Z"
  );

  await reconciler.reconcileOnce();

  assert.equal(draft.state, "COMPLETED");
});

test("draft custody state reconciler marks fully refunded drafts as REFUNDED", async () => {
  const draft = createDraft();
  const agreement = createAgreement(draft);
  const release1 = createRelease1Repositories([draft]);
  const release4 = createRelease4Repositories({
    agreements: [agreement],
    settlements: [
      createSettlement(agreement, 1, "REFUND"),
      createSettlement(agreement, 2, "REFUND")
    ]
  });
  const reconciler = new DraftCustodyStateReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-09T09:07:00.000Z"
  );

  await reconciler.reconcileOnce();

  assert.equal(draft.state, "REFUNDED");
});

test("draft custody state reconciler reverts custody state to ACTIVE when settlements disappear", async () => {
  const draft = createDraft({ state: "COMPLETED" });
  const agreement = createAgreement(draft);
  const release1 = createRelease1Repositories([draft]);
  const release4 = createRelease4Repositories({
    agreements: [agreement],
    settlements: []
  });
  const reconciler = new DraftCustodyStateReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-09T09:08:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.reconciledDraftCustodyStateCount, 1);
  assert.equal(draft.state, "ACTIVE");
  assert.equal(release1.auditLogs[0]?.metadata?.previousState, "COMPLETED");
  assert.equal(release1.auditLogs[0]?.metadata?.nextState, "ACTIVE");
});
