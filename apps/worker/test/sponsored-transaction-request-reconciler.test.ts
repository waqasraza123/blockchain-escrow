import test from "node:test";
import assert from "node:assert/strict";

import type {
  AuditLogRecord,
  Release1Repositories,
  Release12Repositories,
  SponsoredTransactionRequestRecord
} from "@blockchain-escrow/db";

import { SponsoredTransactionRequestReconciler } from "../src/sponsored-transaction-request-reconciler";

function createRequest(
  overrides: Partial<SponsoredTransactionRequestRecord> = {}
): SponsoredTransactionRequestRecord {
  return {
    amountMinor: "1000000",
    approvedAt: "2026-04-12T09:00:00.000Z",
    chainId: 84532,
    createdAt: "2026-04-12T09:00:00.000Z",
    data: "0x1234",
    dealMilestoneSettlementRequestId: null,
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    expiresAt: "2026-04-12T09:30:00.000Z",
    gasPolicyId: "gas-policy-1",
    id: "sponsored-request-1",
    kind: "FUNDING_TRANSACTION_CREATE",
    organizationId: "org-1",
    reason: null,
    requestedByUserId: "user-1",
    rejectedAt: null,
    status: "APPROVED",
    subjectId: "version-1",
    subjectType: "DEAL_VERSION",
    submittedAt: null,
    submittedTransactionHash: null,
    toAddress: "0x1111111111111111111111111111111111111111",
    updatedAt: "2026-04-12T09:00:00.000Z",
    value: "0",
    walletAddress: "0x2222222222222222222222222222222222222222",
    walletId: "wallet-1",
    ...overrides
  };
}

function createRepositories(
  requests: SponsoredTransactionRequestRecord[]
): {
  readonly auditLogs: AuditLogRecord[];
  readonly requests: SponsoredTransactionRequestRecord[];
  readonly release1Repositories: Release1Repositories;
  readonly release12Repositories: Release12Repositories;
} {
  const auditLogs: AuditLogRecord[] = [];
  const requestStore = [...requests];

  const release1Repositories = {
    auditLogs: {
      append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
        auditLogs.push(record);
        return record;
      }
    }
  } as unknown as Release1Repositories;

  const release12Repositories = {
    sponsoredTransactionRequests: {
      expireIfStillPending: async (input: { evaluatedAt: string; id: string }) => {
        const index = requestStore.findIndex((record) => record.id === input.id);

        if (index < 0) {
          return null;
        }

        const existing = requestStore[index]!;

        if (
          existing.status !== "APPROVED" ||
          existing.submittedAt !== null ||
          new Date(existing.expiresAt).getTime() > new Date(input.evaluatedAt).getTime()
        ) {
          return null;
        }

        const updated: SponsoredTransactionRequestRecord = {
          ...existing,
          status: "EXPIRED",
          updatedAt: input.evaluatedAt
        };
        requestStore[index] = updated;
        return updated;
      },
      listApprovedPendingByExpiresAt: async (expiresAt: string) =>
        requestStore.filter(
          (record) =>
            record.status === "APPROVED" &&
            record.submittedAt === null &&
            new Date(record.expiresAt).getTime() <= new Date(expiresAt).getTime()
        )
    }
  } as unknown as Release12Repositories;

  return {
    auditLogs,
    release1Repositories,
    release12Repositories,
    requests: requestStore
  };
}

test("sponsored transaction request reconciler expires overdue approved requests and appends audit logs", async () => {
  const repositories = createRepositories([createRequest()]);
  const reconciler = new SponsoredTransactionRequestReconciler(
    repositories.release1Repositories,
    repositories.release12Repositories,
    () => "2026-04-12T10:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedExpirableSponsoredTransactionRequestCount, 1);
  assert.equal(result.expiredSponsoredTransactionRequestCount, 1);
  assert.equal(repositories.requests[0]?.status, "EXPIRED");
  assert.equal(repositories.requests[0]?.updatedAt, "2026-04-12T10:00:00.000Z");
  assert.equal(repositories.auditLogs.length, 1);
  assert.equal(
    repositories.auditLogs[0]?.action,
    "SPONSORED_TRANSACTION_REQUEST_EXPIRED"
  );
  assert.equal(
    repositories.auditLogs[0]?.entityType,
    "SPONSORED_TRANSACTION_REQUEST"
  );
});

test("sponsored transaction request reconciler skips submitted, already expired, and future requests", async () => {
  const repositories = createRepositories([
    createRequest({
      expiresAt: "2026-04-12T11:00:00.000Z",
      id: "future-request"
    }),
    createRequest({
      id: "submitted-request",
      status: "SUBMITTED",
      submittedAt: "2026-04-12T09:15:00.000Z",
      submittedTransactionHash:
        "0x3333333333333333333333333333333333333333333333333333333333333333"
    }),
    createRequest({
      id: "expired-request",
      status: "EXPIRED",
      updatedAt: "2026-04-12T09:45:00.000Z"
    })
  ]);
  const reconciler = new SponsoredTransactionRequestReconciler(
    repositories.release1Repositories,
    repositories.release12Repositories,
    () => "2026-04-12T10:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedExpirableSponsoredTransactionRequestCount, 0);
  assert.equal(result.expiredSponsoredTransactionRequestCount, 0);
  assert.equal(repositories.requests[0]?.status, "APPROVED");
  assert.equal(repositories.requests[1]?.status, "SUBMITTED");
  assert.equal(repositories.requests[2]?.status, "EXPIRED");
  assert.equal(repositories.auditLogs.length, 0);
});
