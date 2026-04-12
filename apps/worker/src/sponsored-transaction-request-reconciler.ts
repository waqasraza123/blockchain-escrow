import { randomUUID } from "node:crypto";

import type {
  Release1Repositories,
  Release12Repositories
} from "@blockchain-escrow/db";

export interface SponsoredTransactionRequestReconciliationResult {
  readonly expiredSponsoredTransactionRequestCount: number;
  readonly scannedExpirableSponsoredTransactionRequestCount: number;
}

export class SponsoredTransactionRequestReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release12Repositories: Release12Repositories,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<SponsoredTransactionRequestReconciliationResult> {
    const evaluatedAt = this.now();
    const requests =
      await this.release12Repositories.sponsoredTransactionRequests.listApprovedPendingByExpiresAt(
        evaluatedAt
      );
    let expiredSponsoredTransactionRequestCount = 0;

    for (const request of requests) {
      const expiredRequest =
        await this.release12Repositories.sponsoredTransactionRequests.expireIfStillPending({
          evaluatedAt,
          id: request.id
        });

      if (!expiredRequest) {
        continue;
      }

      expiredSponsoredTransactionRequestCount += 1;

      await this.release1Repositories.auditLogs.append({
        action: "SPONSORED_TRANSACTION_REQUEST_EXPIRED",
        actorUserId: null,
        entityId: expiredRequest.id,
        entityType: "SPONSORED_TRANSACTION_REQUEST",
        id: randomUUID(),
        ipAddress: null,
        metadata: {
          chainId: expiredRequest.chainId,
          dealMilestoneSettlementRequestId:
            expiredRequest.dealMilestoneSettlementRequestId,
          dealVersionId: expiredRequest.dealVersionId,
          draftDealId: expiredRequest.draftDealId,
          evaluatedAt,
          expiresAt: expiredRequest.expiresAt,
          gasPolicyId: expiredRequest.gasPolicyId,
          kind: expiredRequest.kind,
          subjectId: expiredRequest.subjectId,
          subjectType: expiredRequest.subjectType,
          walletId: expiredRequest.walletId
        },
        occurredAt: evaluatedAt,
        organizationId: expiredRequest.organizationId,
        userAgent: "worker:sponsored-transaction-request-reconciler"
      });
    }

    return {
      expiredSponsoredTransactionRequestCount,
      scannedExpirableSponsoredTransactionRequestCount: requests.length
    };
  }
}
