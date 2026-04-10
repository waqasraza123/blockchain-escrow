import assert from "node:assert/strict";
import test from "node:test";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

import type { OperatorConfiguration } from "../src/modules/operator/operator.tokens";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { buildCanonicalDealId } from "../src/modules/drafts/deal-identity";
import { OperatorService } from "../src/modules/operator/operator.service";
import type { RequestMetadata } from "../src/modules/auth/auth.http";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease10Repositories } from "./helpers/in-memory-release10-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";
import { InMemoryRelease8Repositories } from "./helpers/in-memory-release8-repositories";

const configuration: OperatorConfiguration = {
  chainId: 84532,
  indexerBaseUrl: "http://127.0.0.1:4200",
  indexerFreshnessTtlSeconds: 300,
  release4CursorKey: "release4:base-sepolia",
  requestTimeoutMs: 3000,
  unresolvedDisputeAfterSeconds: 86400,
  workerBaseUrl: "http://127.0.0.1:4100"
};

function createServices() {
  const release1Repositories = new InMemoryRelease1Repositories();
  const release4Repositories = new InMemoryRelease4Repositories();
  const release8Repositories = new InMemoryRelease8Repositories();
  const release10Repositories = new InMemoryRelease10Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    release1Repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    authenticatedSessionService,
    operatorService: new OperatorService(
      release1Repositories,
      release4Repositories,
      release10Repositories,
      release8Repositories,
      authenticatedSessionService,
      configuration
    ),
    release1Repositories,
    release10Repositories,
    release4Repositories,
    release8Repositories,
    sessionTokenService
  };
}

function requestMetadata(cookieHeader: string): RequestMetadata {
  return {
    cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "operator-test"
  };
}

async function seedOperatorActor(
  services: ReturnType<typeof createServices>,
  role: "VIEWER" | "COMPLIANCE" | "PROTOCOL_ADMIN" | "SUPER_ADMIN" = "SUPER_ADMIN"
) {
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const now = new Date().toISOString();

  await services.release8Repositories.operatorAccounts.create({
    active: true,
    createdAt: now,
    id: "operator-1",
    role,
    updatedAt: now,
    userId: actor.userId,
    walletId: actor.walletId
  });

  return actor;
}

async function seedSearchFixture(services: ReturnType<typeof createServices>) {
  const now = new Date().toISOString();
  const manifest = getDeploymentManifestByChainId(84532);

  assert.ok(manifest, "missing base sepolia manifest");

  await services.release1Repositories.organizations.create({
    createdAt: now,
    createdByUserId: "user-1",
    id: "org-1",
    name: "Acme Procurement",
    slug: "acme-procurement",
    updatedAt: now
  });
  await services.release1Repositories.draftDeals.create({
    createdAt: now,
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Prototype integration",
    templateId: null,
    title: "Alpha Deal",
    updatedAt: now
  });
  await services.release1Repositories.dealVersions.create({
    bodyMarkdown: "# Alpha",
    createdAt: now,
    createdByUserId: "user-1",
    draftDealId: "draft-1",
    id: "version-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    summary: "Version summary",
    templateId: null,
    title: "Alpha Deal v1",
    versionNumber: 1
  });
  await services.release1Repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    id: "funding-1",
    organizationId: "org-1",
    reconciledAgreementAddress:
      "0x7777777777777777777777777777777777777777",
    reconciledAt: now,
    reconciledConfirmedAt: now,
    reconciledMatchesTrackedVersion: true,
    reconciledStatus: "CONFIRMED",
    stalePendingEscalatedAt: null,
    submittedAt: now,
    submittedByUserId: "user-1",
    submittedWalletAddress:
      "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212"
  });
  await services.release1Repositories.dealMilestoneSettlementExecutionTransactions.create({
    chainId: 84532,
    dealMilestoneReviewId: "review-1",
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: "submission-1",
    dealVersionId: "version-1",
    dealVersionMilestoneId: "milestone-1",
    draftDealId: "draft-1",
    id: "settlement-execution-1",
    organizationId: "org-1",
    reconciledAgreementAddress:
      "0x7777777777777777777777777777777777777777",
    reconciledAt: now,
    reconciledConfirmedAt: now,
    reconciledMatchesTrackedAgreement: true,
    reconciledStatus: "CONFIRMED",
    stalePendingEscalatedAt: null,
    submittedAt: now,
    submittedByUserId: "user-1",
    submittedWalletAddress:
      "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByDealMilestoneSettlementExecutionTransactionId: null,
    transactionHash:
      "0x3434343434343434343434343434343434343434343434343434343434343434"
  });
  await services.release1Repositories.dealMilestoneDisputes.create({
    dealMilestoneReviewId: "review-1",
    dealMilestoneSubmissionId: "submission-1",
    dealVersionId: "version-1",
    dealVersionMilestoneId: "milestone-1",
    draftDealId: "draft-1",
    id: "dispute-1",
    openedAt: now,
    openedByUserId: "user-1",
    organizationId: "org-1",
    statementMarkdown: "Payment dispute on milestone one"
  });
  await services.release4Repositories.escrowAgreements.upsert({
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
    dealId: buildCanonicalDealId("org-1", "draft-1"),
    dealVersionHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    factoryAddress: manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    funded: true,
    fundedAt: now,
    fundedBlockHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    fundedBlockNumber: "11",
    fundedLogIndex: 0,
    fundedPayerAddress: "0x1111111111111111111111111111111111111111",
    fundedTransactionHash:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    initializedBlockHash:
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: now,
    initializedTransactionHash:
      "0x9999999999999999999999999999999999999999999999999999999999999999",
    milestoneCount: 1,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    sellerAddress: "0x3333333333333333333333333333333333333333",
    settlementTokenAddress: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount: "1000000",
    updatedAt: now
  });
}

test("operator session requires an active operator account", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );

  await assert.rejects(
    services.operatorService.getSession(requestMetadata(actor.cookieHeader)),
    /operator access is required/
  );
});

test("operator search returns core operational entities", async () => {
  const services = createServices();
  const actor = await seedOperatorActor(services, "VIEWER");
  await seedSearchFixture(services);

  const titleResults = await services.operatorService.search(
    { q: "Alpha" },
    requestMetadata(actor.cookieHeader)
  );
  const agreementResults = await services.operatorService.search(
    { q: "0x7777777777777777777777777777777777777777" },
    requestMetadata(actor.cookieHeader)
  );
  const disputeResults = await services.operatorService.search(
    { q: "Payment dispute" },
    requestMetadata(actor.cookieHeader)
  );

  assert.ok(
    titleResults.hits.some((entry) => entry.entityType === "DRAFT_DEAL")
  );
  assert.ok(
    titleResults.hits.some((entry) => entry.entityType === "DEAL_VERSION")
  );
  assert.ok(
    agreementResults.hits.some((entry) => entry.entityType === "ESCROW_AGREEMENT")
  );
  assert.ok(
    disputeResults.hits.some(
      (entry) => entry.entityType === "DEAL_MILESTONE_DISPUTE"
    )
  );
});

test("compliance operators can manage alerts, checkpoints, and cases", async () => {
  const services = createServices();
  const actor = await seedOperatorActor(services, "COMPLIANCE");
  const now = new Date().toISOString();

  await services.release1Repositories.organizations.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "org-1",
    name: "Acme Procurement",
    slug: "acme-procurement",
    updatedAt: now
  });
  await services.release1Repositories.draftDeals.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Flagged for review",
    templateId: null,
    title: "Review Deal",
    updatedAt: now
  });
  await services.release8Repositories.operatorAlerts.create({
    acknowledgedAt: null,
    acknowledgedByOperatorAccountId: null,
    agreementAddress: null,
    assignedOperatorAccountId: null,
    dealVersionId: null,
    description: "Funding transaction remains pending beyond the stale threshold.",
    draftDealId: "draft-1",
    fingerprint: "FUNDING_TRANSACTION_STALE_PENDING:funding-1",
    firstDetectedAt: now,
    id: "alert-1",
    kind: "FUNDING_TRANSACTION_STALE_PENDING",
    lastDetectedAt: now,
    linkedComplianceCaseId: null,
    metadata: { transactionHash: "0xabc" },
    organizationId: "org-1",
    resolvedAt: null,
    resolvedByOperatorAccountId: null,
    severity: "MEDIUM",
    status: "OPEN",
    subjectId: "draft-1",
    subjectLabel: "Review Deal",
    subjectType: "DRAFT_DEAL"
  });

  const acknowledged = await services.operatorService.acknowledgeAlert(
    { alertId: "alert-1" },
    { note: "Investigating" },
    requestMetadata(actor.cookieHeader)
  );
  const checkpoint = await services.operatorService.createCheckpoint(
    {
      kind: "SANCTIONS",
      note: "Manual sanctions review required",
      subjectId: "draft-1",
      subjectType: "DRAFT_DEAL"
    },
    requestMetadata(actor.cookieHeader)
  );
  const complianceCase = await services.operatorService.createCase(
    {
      alertId: "alert-1",
      checkpointId: checkpoint.id,
      severity: "HIGH",
      subjectId: "draft-1",
      subjectType: "DRAFT_DEAL",
      summary: "Investigate funding anomaly and sanctions checkpoint.",
      title: "Funding review"
    },
    requestMetadata(actor.cookieHeader)
  );
  const detailedCase = await services.operatorService.addCaseNote(
    { caseId: complianceCase.id },
    { bodyMarkdown: "Initial triage note" },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(acknowledged.status, "ACKNOWLEDGED");
  assert.equal(checkpoint.status, "PENDING");
  assert.equal(complianceCase.linkedAlertId, "alert-1");
  assert.equal(detailedCase.notes.length, 1);
  assert.equal(
    services.release8Repositories.operatorAlertRecords[0]?.linkedComplianceCaseId,
    complianceCase.id
  );
});

test("operator health aggregates remote readiness and protocol proposal drafts encode calldata", async () => {
  const services = createServices();
  const actor = await seedOperatorActor(services, "SUPER_ADMIN");
  const now = new Date().toISOString();
  const originalFetch = globalThis.fetch;

  await services.release4Repositories.chainCursors.upsert({
    chainId: 84532,
    cursorKey: configuration.release4CursorKey,
    lastProcessedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastProcessedBlockNumber: "100",
    nextBlockNumber: "101",
    updatedAt: now
  });

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url.endsWith("/health/live")) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        driftError: null,
        lastSyncCompletedAt: now,
        ready: true,
        service: "indexer"
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  }) as typeof fetch;

  try {
    const health = await services.operatorService.getHealth(
      requestMetadata(actor.cookieHeader)
    );
    const proposal = await services.operatorService.createProtocolProposalDraft(
      {
        action: "SET_PROTOCOL_FEE_BPS",
        chainId: 84532,
        description: "Adjust protocol fee",
        input: { newProtocolFeeBps: 125 },
        target: "ProtocolConfig"
      },
      requestMetadata(actor.cookieHeader)
    );
    const manifest = getDeploymentManifestByChainId(84532);

    assert.equal(health.cursorFresh, true);
    assert.equal(health.worker.status, "HEALTHY");
    assert.ok(manifest, "missing base sepolia manifest");
    assert.equal(
      proposal.proposal.targetAddress,
      manifest.contracts.ProtocolConfig!.toLowerCase()
    );
    assert.ok(proposal.proposal.calldata.startsWith("0x"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
