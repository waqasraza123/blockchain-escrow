import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import type {
  AuditLogRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { buildCanonicalDealId } from "@blockchain-escrow/shared";

import { DraftActivationReconciler } from "../src/draft-activation-reconciler";

async function withContractVersion<T>(
  chainId: number,
  contractVersion: number,
  run: () => Promise<T>
): Promise<T> {
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest) {
    throw new Error(`missing manifest for chain ${chainId}`);
  }

  const mutableManifest = manifest as typeof manifest & { contractVersion: number };
  const previousVersion = mutableManifest.contractVersion;
  mutableManifest.contractVersion = contractVersion;

  try {
    return await run();
  } finally {
    mutableManifest.contractVersion = previousVersion;
  }
}

function createRelease1Repositories(drafts: DraftDealRecord[]) {
  const auditLogs: AuditLogRecord[] = [];

  const repositories = {
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
  } as unknown as Release1Repositories;

  return { auditLogs, repositories };
}

function createRelease4Repositories(agreements: EscrowAgreementRecord[]) {
  return {
    repositories: {
      escrowAgreements: {
        listByChainId: async (chainId: number): Promise<EscrowAgreementRecord[]> =>
          agreements.filter((agreement) => agreement.chainId === chainId)
      }
    } as unknown as Release4Repositories
  };
}

function createDraft(
  overrides: Partial<DraftDealRecord> = {}
): DraftDealRecord {
  return {
    createdAt: "2026-04-06T12:00:00.000Z",
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "AWAITING_FUNDING",
    summary: "Draft summary",
    templateId: null,
    title: "Draft title",
    updatedAt: "2026-04-06T12:00:00.000Z",
    ...overrides
  };
}

function createAgreement(
  draft: DraftDealRecord,
  overrides: Partial<EscrowAgreementRecord> = {}
): EscrowAgreementRecord {
  const manifest = getDeploymentManifestByChainId(84532);

  assert.ok(manifest, "missing base sepolia manifest");

  return {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: "0x1111111111111111111111111111111111111111",
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    dealId: buildCanonicalDealId(draft.organizationId, draft.id),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    factoryAddress: manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    funded: false,
    fundedAt: null,
    fundedBlockHash: null,
    fundedBlockNumber: null,
    fundedLogIndex: null,
    fundedPayerAddress: null,
    fundedTransactionHash: null,
    initializedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: "2026-04-06T12:05:00.000Z",
    initializedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    milestoneCount: 2,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    sellerAddress: "0x3333333333333333333333333333333333333333",
    settlementTokenAddress: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount: "3500000",
    updatedAt: "2026-04-06T12:05:00.000Z",
    ...overrides
  };
}

test("draft activation reconciler activates linked drafts and emits an audit log", async () => {
  const draft = createDraft();
  const agreement = createAgreement(draft);
  const release1 = createRelease1Repositories([draft]);
  const release4 = createRelease4Repositories([agreement]);
  const reconciler = new DraftActivationReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-06T12:10:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedDraftCount, 1);
  assert.equal(result.activatedDraftCount, 1);
  assert.equal(draft.state, "ACTIVE");
  assert.equal(release1.auditLogs.length, 1);
  assert.equal(release1.auditLogs[0]?.action, "DRAFT_DEAL_ACTIVATED");
  assert.equal(
    release1.auditLogs[0]?.metadata?.agreementAddress,
    agreement.agreementAddress
  );
});

test("draft activation reconciler waits for funded agreements on v2 deployments", async () => {
  await withContractVersion(84532, 2, async () => {
    const draft = createDraft();
    const release1 = createRelease1Repositories([draft]);
    const release4 = createRelease4Repositories([createAgreement(draft)]);
    const reconciler = new DraftActivationReconciler(
      release1.repositories,
      release4.repositories,
      84532,
      () => "2026-04-06T12:10:00.000Z"
    );

    let result = await reconciler.reconcileOnce();

    assert.equal(result.activatedDraftCount, 0);
    assert.equal(draft.state, "AWAITING_FUNDING");
    assert.equal(release1.auditLogs.length, 0);

    release4.repositories.escrowAgreements = {
      listByChainId: async (): Promise<EscrowAgreementRecord[]> => [
        createAgreement(draft, {
          funded: true,
          fundedAt: "2026-04-06T12:08:00.000Z",
          fundedBlockHash:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          fundedBlockNumber: "10",
          fundedLogIndex: 2,
          fundedPayerAddress: "0x1111111111111111111111111111111111111111",
          fundedTransactionHash:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          updatedAt: "2026-04-06T12:08:00.000Z"
        })
      ]
    } as unknown as Release4Repositories["escrowAgreements"];

    result = await reconciler.reconcileOnce();

    assert.equal(result.activatedDraftCount, 1);
    assert.equal(draft.state, "ACTIVE");
    assert.equal(release1.auditLogs.length, 1);
  });
});
