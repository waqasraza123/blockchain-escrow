import { randomUUID } from "node:crypto";

import type {
  DealMilestoneReviewRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import {
  buildCanonicalDealId,
  milestoneWorkflowOpenDealStates
} from "@blockchain-escrow/shared";

function buildPreparationAuditMetadata(input: {
  chainId: number;
  dealId: `0x${string}`;
  preparationId: string;
  settlementRequest: DealMilestoneSettlementRequestRecord;
  linkedAgreement: EscrowAgreementRecord;
  milestone: DealVersionMilestoneRecord;
  preparedAt: string;
}): Record<string, string | number | null> {
  return {
    agreementAddress: input.linkedAgreement.agreementAddress,
    chainId: input.chainId,
    dealId: input.dealId,
    dealMilestoneReviewId: input.settlementRequest.dealMilestoneReviewId,
    dealMilestoneSettlementPreparationId: input.preparationId,
    dealMilestoneSettlementRequestId: input.settlementRequest.id,
    dealMilestoneSubmissionId: input.settlementRequest.dealMilestoneSubmissionId,
    dealVersionHash: input.linkedAgreement.dealVersionHash,
    kind: input.settlementRequest.kind,
    milestoneAmountMinor: input.milestone.amountMinor,
    milestonePosition: input.milestone.position,
    preparedAt: input.preparedAt,
    settlementTokenAddress: input.linkedAgreement.settlementTokenAddress,
    totalAmount: input.linkedAgreement.totalAmount
  };
}

export interface MilestoneSettlementPreparationReconciliationResult {
  readonly blockedMilestoneSettlementPreparationCount: number;
  readonly preparedMilestoneSettlementCount: number;
  readonly scannedMilestoneSettlementDraftCount: number;
  readonly scannedMilestoneSettlementRequestCount: number;
}

export class MilestoneSettlementPreparationReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release4Repositories: Release4Repositories,
    private readonly chainId: number,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<MilestoneSettlementPreparationReconciliationResult> {
    const [drafts, agreements] = await Promise.all([
      this.release1Repositories.draftDeals.listByStates([
        ...milestoneWorkflowOpenDealStates
      ]),
      this.release4Repositories.escrowAgreements.listByChainId(this.chainId)
    ]);
    const agreementsByDealId = new Map(
      agreements.map((agreement) => [agreement.dealId, agreement] as const)
    );
    const preparedAt = this.now();
    let blockedMilestoneSettlementPreparationCount = 0;
    let preparedMilestoneSettlementCount = 0;
    let scannedMilestoneSettlementRequestCount = 0;

    for (const draft of drafts) {
      const version =
        await this.release1Repositories.dealVersions.findLatestByDraftDealId(draft.id);

      if (!version) {
        continue;
      }

      const linkedAgreement =
        agreementsByDealId.get(buildCanonicalDealId(draft.organizationId, draft.id)) ??
        null;
      const [
        milestones,
        submissions,
        reviews,
        settlementRequests,
        settlementPreparations
      ] = await Promise.all([
        this.release1Repositories.dealVersionMilestones.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneSubmissions.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneReviews.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneSettlementRequests.listByDealVersionId(
          version.id
        ),
        this.release1Repositories.dealMilestoneSettlementPreparations.listByDealVersionId(
          version.id
        )
      ]);
      const submissionsByMilestoneId = new Map<string, DealMilestoneSubmissionRecord[]>();
      const reviewsBySubmissionId = new Map<string, DealMilestoneReviewRecord>();
      const settlementRequestsByReviewId = new Map<
        string,
        DealMilestoneSettlementRequestRecord
      >();
      const existingPreparationsByRequestId = new Map(
        settlementPreparations.map((preparation) => [
          preparation.dealMilestoneSettlementRequestId,
          preparation
        ] as const)
      );

      for (const submission of submissions) {
        const records =
          submissionsByMilestoneId.get(submission.dealVersionMilestoneId) ?? [];
        records.push(submission);
        submissionsByMilestoneId.set(submission.dealVersionMilestoneId, records);
      }

      for (const review of reviews) {
        reviewsBySubmissionId.set(review.dealMilestoneSubmissionId, review);
      }

      for (const settlementRequest of settlementRequests) {
        settlementRequestsByReviewId.set(
          settlementRequest.dealMilestoneReviewId,
          settlementRequest
        );
      }

      for (const milestone of milestones) {
        const latestSubmission =
          submissionsByMilestoneId.get(milestone.id)?.[
            (submissionsByMilestoneId.get(milestone.id)?.length ?? 1) - 1
          ] ?? null;

        if (!latestSubmission) {
          continue;
        }

        const review = reviewsBySubmissionId.get(latestSubmission.id) ?? null;

        if (!review) {
          continue;
        }

        const settlementRequest = settlementRequestsByReviewId.get(review.id) ?? null;

        if (!settlementRequest) {
          continue;
        }

        scannedMilestoneSettlementRequestCount += 1;

        if (existingPreparationsByRequestId.has(settlementRequest.id)) {
          continue;
        }

        if (!linkedAgreement || linkedAgreement.milestoneCount < milestone.position) {
          blockedMilestoneSettlementPreparationCount += 1;
          continue;
        }

        const preparation =
          await this.release1Repositories.dealMilestoneSettlementPreparations.create({
            agreementAddress: linkedAgreement.agreementAddress,
            chainId: linkedAgreement.chainId,
            dealId: linkedAgreement.dealId,
            dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
            dealMilestoneSettlementRequestId: settlementRequest.id,
            dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
            dealVersionHash: linkedAgreement.dealVersionHash,
            dealVersionId: settlementRequest.dealVersionId,
            dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
            draftDealId: settlementRequest.draftDealId,
            id: randomUUID(),
            kind: settlementRequest.kind,
            milestoneAmountMinor: milestone.amountMinor,
            milestonePosition: milestone.position,
            organizationId: settlementRequest.organizationId,
            preparedAt,
            settlementTokenAddress: linkedAgreement.settlementTokenAddress,
            totalAmount: linkedAgreement.totalAmount
          });
        preparedMilestoneSettlementCount += 1;

        await this.release1Repositories.auditLogs.append({
          action: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_PREPARED",
          actorUserId: null,
          entityId: settlementRequest.id,
          entityType: "DEAL_MILESTONE_SETTLEMENT_REQUEST",
          id: randomUUID(),
          ipAddress: null,
          metadata: buildPreparationAuditMetadata({
            chainId: this.chainId,
            dealId: linkedAgreement.dealId,
            linkedAgreement,
            milestone,
            preparedAt,
            preparationId: preparation.id,
            settlementRequest
          }),
          occurredAt: preparedAt,
          organizationId: settlementRequest.organizationId,
          userAgent: "worker:milestone-settlement-preparation-reconciler"
        });
      }
    }

    return {
      blockedMilestoneSettlementPreparationCount,
      preparedMilestoneSettlementCount,
      scannedMilestoneSettlementDraftCount: drafts.length,
      scannedMilestoneSettlementRequestCount
    };
  }
}
