import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { buildCanonicalDealId } from "../../api/src/modules/drafts/deal-identity";

function canActivateDraftFromAgreement(
  chainId: number,
  agreement: EscrowAgreementRecord | null
): boolean {
  if (!agreement) {
    return false;
  }

  const manifest = getDeploymentManifestByChainId(chainId);
  return !manifest || !deploymentSupportsCreateAndFund(manifest) || agreement.funded;
}

function buildDraftActivationAuditMetadata(
  chainId: number,
  agreement: EscrowAgreementRecord
): Record<string, boolean | number | string | null> {
  return {
    activationObservedAt: agreement.fundedAt ?? agreement.initializedTimestamp,
    activationSource: agreement.funded ? "INDEXED_AGREEMENT_FUNDED" : "INDEXED_AGREEMENT_CREATED",
    agreementAddress: agreement.agreementAddress,
    chainId,
    createdTransactionHash: agreement.createdTransactionHash,
    dealId: agreement.dealId,
    dealVersionHash: agreement.dealVersionHash,
    funded: agreement.funded,
    fundedTransactionHash: agreement.fundedTransactionHash,
    initializedTransactionHash: agreement.initializedTransactionHash
  };
}

export interface DraftActivationReconciliationResult {
  readonly activatedDraftCount: number;
  readonly scannedDraftCount: number;
}

export class DraftActivationReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly chainId: number,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<DraftActivationReconciliationResult> {
    const candidateDrafts = await this.release1Repositories.draftDeals.listByStates([
      "DRAFT",
      "AWAITING_SELLER_ACCEPTANCE",
      "AWAITING_FUNDING"
    ]);
    const agreements = await this.release4Repositories.escrowAgreements.listByChainId(
      this.chainId
    );
    const agreementsByDealId = new Map(
      agreements.map((agreement) => [agreement.dealId, agreement] as const)
    );
    const occurredAt = this.now();
    let activatedDraftCount = 0;

    for (const draft of candidateDrafts) {
      const linkedAgreement =
        agreementsByDealId.get(
          buildCanonicalDealId(draft.organizationId, draft.id)
        ) ?? null;

      if (!canActivateDraftFromAgreement(this.chainId, linkedAgreement)) {
        continue;
      }

      const updatedDraft = await this.release1Repositories.draftDeals.updateState(
        draft.id,
        "ACTIVE",
        occurredAt
      );

      if (!updatedDraft || !linkedAgreement) {
        continue;
      }

      activatedDraftCount += 1;

      await this.release1Repositories.auditLogs.append({
        action: "DRAFT_DEAL_ACTIVATED",
        actorUserId: null,
        entityId: updatedDraft.id,
        entityType: "DRAFT_DEAL",
        id: randomUUID(),
        ipAddress: null,
        metadata: buildDraftActivationAuditMetadata(this.chainId, linkedAgreement),
        occurredAt,
        organizationId: updatedDraft.organizationId,
        userAgent: "worker:draft-activation-reconciler"
      });
    }

    return {
      activatedDraftCount,
      scannedDraftCount: candidateDrafts.length
    };
  }
}
