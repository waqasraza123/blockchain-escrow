import { randomUUID } from "node:crypto";

import type {
  DealMilestoneReviewRecord,
  DealMilestoneSubmissionRecord,
  Release1Repositories
} from "@blockchain-escrow/db";

export interface MilestoneReviewDeadlineReconciliationResult {
  readonly expiredMilestoneReviewDeadlineCount: number;
  readonly scannedMilestoneReviewDeadlineCount: number;
  readonly scannedMilestoneReviewDeadlineDraftCount: number;
}

function isExpiredAtOrBefore(evaluatedAt: string, deadlineAt: string): boolean {
  return new Date(evaluatedAt).getTime() >= new Date(deadlineAt).getTime();
}

function isReviewedAfterDeadline(
  review: DealMilestoneReviewRecord | null,
  submission: DealMilestoneSubmissionRecord
): boolean {
  return review !== null && new Date(review.reviewedAt).getTime() > new Date(submission.reviewDeadlineAt).getTime();
}

export class MilestoneReviewDeadlineReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<MilestoneReviewDeadlineReconciliationResult> {
    const drafts = await this.release1Repositories.draftDeals.listByStates(["ACTIVE"]);
    const occurredAt = this.now();
    let expiredMilestoneReviewDeadlineCount = 0;
    let scannedMilestoneReviewDeadlineCount = 0;

    for (const draft of drafts) {
      const version =
        await this.release1Repositories.dealVersions.findLatestByDraftDealId(draft.id);

      if (!version) {
        continue;
      }

      const [milestones, submissions, reviews, deadlineExpiries] = await Promise.all([
        this.release1Repositories.dealVersionMilestones.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneSubmissions.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneReviews.listByDealVersionId(version.id),
        this.release1Repositories.dealMilestoneReviewDeadlineExpiries.listByDealVersionId(
          version.id
        )
      ]);
      const submissionsByMilestoneId = new Map<string, DealMilestoneSubmissionRecord[]>();
      const reviewsBySubmissionId = new Map<string, DealMilestoneReviewRecord>();
      const expirySubmissionIds = new Set(
        deadlineExpiries.map((expiry) => expiry.dealMilestoneSubmissionId)
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

      for (const milestone of milestones) {
        const latestSubmission =
          submissionsByMilestoneId.get(milestone.id)?.[
            (submissionsByMilestoneId.get(milestone.id)?.length ?? 1) - 1
          ] ?? null;

        if (!latestSubmission) {
          continue;
        }

        scannedMilestoneReviewDeadlineCount += 1;

        if (expirySubmissionIds.has(latestSubmission.id)) {
          continue;
        }

        const review = reviewsBySubmissionId.get(latestSubmission.id) ?? null;
        const deadlinePassed = isExpiredAtOrBefore(
          occurredAt,
          latestSubmission.reviewDeadlineAt
        );

        if (!deadlinePassed) {
          continue;
        }

        if (review && !isReviewedAfterDeadline(review, latestSubmission)) {
          continue;
        }

        const expiry =
          await this.release1Repositories.dealMilestoneReviewDeadlineExpiries.create({
            dealMilestoneSubmissionId: latestSubmission.id,
            dealVersionId: latestSubmission.dealVersionId,
            dealVersionMilestoneId: latestSubmission.dealVersionMilestoneId,
            deadlineAt: latestSubmission.reviewDeadlineAt,
            draftDealId: latestSubmission.draftDealId,
            expiredAt: latestSubmission.reviewDeadlineAt,
            id: randomUUID(),
            organizationId: latestSubmission.organizationId
          });
        expiredMilestoneReviewDeadlineCount += 1;

        await this.release1Repositories.auditLogs.append({
          action: "DEAL_MILESTONE_REVIEW_DEADLINE_EXPIRED",
          actorUserId: null,
          entityId: latestSubmission.id,
          entityType: "DEAL_MILESTONE_SUBMISSION",
          id: randomUUID(),
          ipAddress: null,
          metadata: {
            deadlineAt: expiry.deadlineAt,
            dealMilestoneSubmissionId: latestSubmission.id,
            dealVersionId: latestSubmission.dealVersionId,
            dealVersionMilestoneId: latestSubmission.dealVersionMilestoneId,
            draftDealId: latestSubmission.draftDealId,
            evaluatedAt: occurredAt,
            expiredAt: expiry.expiredAt,
            reviewId: review?.id ?? null,
            reviewedAt: review?.reviewedAt ?? null
          },
          occurredAt,
          organizationId: latestSubmission.organizationId,
          userAgent: "worker:milestone-review-deadline-reconciler"
        });
      }
    }

    return {
      expiredMilestoneReviewDeadlineCount,
      scannedMilestoneReviewDeadlineCount,
      scannedMilestoneReviewDeadlineDraftCount: drafts.length
    };
  }
}
