import assert from "node:assert/strict";
import test from "node:test";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { ApprovalRuntimeService } from "../src/modules/approvals/approval-runtime.service";
import { ApprovalsService } from "../src/modules/approvals/approvals.service";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { MilestonesService } from "../src/modules/milestones/milestones.service";
import type {
  MilestoneReviewConfiguration,
  MilestoneSettlementExecutionReconciliationConfiguration
} from "../src/modules/milestones/milestones.tokens";
import type { FundingReconciliationConfiguration } from "../src/modules/funding/funding.tokens";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { createRelease12RepositoriesStub } from "./helpers/release12-test-stub";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";
import { InMemoryRelease9Repositories } from "./helpers/in-memory-release9-repositories";

const fundingReconciliationConfiguration: FundingReconciliationConfiguration = {
  indexerFreshnessTtlSeconds: 300,
  pendingStaleAfterSeconds: 3600,
  release4CursorKeyOverride: "release4:base-sepolia"
};
const milestoneReviewConfiguration: MilestoneReviewConfiguration = {
  reviewDeadlineSeconds: 7 * 24 * 60 * 60
};
const milestoneSettlementExecutionReconciliationConfiguration: MilestoneSettlementExecutionReconciliationConfiguration =
  {
    indexerFreshnessTtlSeconds: 300,
    pendingStaleAfterSeconds: 3600,
    release4CursorKeyOverride: "release4:base-sepolia"
  };

function requestMetadata(cookieHeader: string) {
  return {
    cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "approval-test"
  };
}

async function seedOrganizationMembership(
  repositories: InMemoryRelease1Repositories,
  options: {
    createdByUserId: string;
    organizationId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    userId: string;
  }
) {
  const now = new Date().toISOString();

  if (!(await repositories.organizations.findById(options.organizationId))) {
    await repositories.organizations.create({
      createdAt: now,
      createdByUserId: options.createdByUserId,
      id: options.organizationId,
      name: "Acme Procurement",
      slug: "acme-procurement",
      updatedAt: now
    });
  }

  if (
    !(await repositories.organizationMembers.findMembership(
      options.organizationId,
      options.userId
    ))
  ) {
    await repositories.organizationMembers.add({
      createdAt: now,
      id: `member-${options.userId}-${options.organizationId}`,
      organizationId: options.organizationId,
      role: options.role,
      updatedAt: now,
      userId: options.userId
    });
  }
}

function createServices() {
  const release1Repositories = new InMemoryRelease1Repositories();
  const release4Repositories = new InMemoryRelease4Repositories();
  const release9Repositories = new InMemoryRelease9Repositories();
  const { release12Repositories } = createRelease12RepositoriesStub();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    release1Repositories,
    authConfiguration,
    sessionTokenService
  );
  const milestonesService = new MilestonesService(
    release1Repositories,
    release12Repositories,
    release4Repositories,
    authenticatedSessionService,
    new ApprovalRuntimeService(release9Repositories),
    milestoneReviewConfiguration,
    milestoneSettlementExecutionReconciliationConfiguration
  );

  return {
    approvalsService: new ApprovalsService(
      release1Repositories,
      release9Repositories,
      authenticatedSessionService,
      new ApprovalRuntimeService(release9Repositories),
      milestonesService
    ),
    draftsService: new DraftsService(
      release1Repositories,
      release4Repositories,
      authenticatedSessionService,
      new ApprovalRuntimeService(release9Repositories),
      fundingReconciliationConfiguration
    ),
    release1Repositories,
    release4Repositories,
    release9Repositories,
    sessionTokenService
  };
}

async function seedDraftVersionScenario(
  services: ReturnType<typeof createServices>,
  actor: Awaited<ReturnType<typeof seedAuthenticatedActor>>
) {
  const now = new Date().toISOString();

  await seedOrganizationMembership(services.release1Repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "OWNER",
    userId: actor.userId
  });
  await services.release1Repositories.counterparties.create({
    contactEmail: "vendor@example.com",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "counterparty-1",
    legalName: null,
    name: "Vendor One",
    normalizedName: "vendor one",
    organizationId: "org-1",
    updatedAt: now
  });

  const draft = await services.draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole: "BUYER",
      settlementCurrency: "USDC",
      title: "Website Rebuild"
    },
    requestMetadata(actor.cookieHeader)
  );
  const version = await services.draftsService.createVersionSnapshot(
    {
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      bodyMarkdown: "# Final terms",
      milestoneSnapshots: [
        {
          amountMinor: "1000000",
          title: "Design phase"
        }
      ]
    },
    requestMetadata(actor.cookieHeader)
  );

  return {
    draft,
    version
  };
}

test("approvals service creates and resolves a funding approval request from the applicable policy", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedDraftVersionScenario(services, actor);

  const createdCostCenter = await services.approvalsService.createCostCenter(
    "org-1",
    {
      code: "ENG-001",
      name: "Engineering"
    },
    requestMetadata(actor.cookieHeader)
  );
  await services.approvalsService.updateDraftCostCenter(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      costCenterId: createdCostCenter.costCenter.id
    },
    requestMetadata(actor.cookieHeader)
  );
  await services.approvalsService.createApprovalPolicy(
    "org-1",
    {
      costCenterId: createdCostCenter.costCenter.id,
      kind: "FUNDING_TRANSACTION_CREATE",
      name: "Engineering funding approval",
      settlementCurrency: "USDC",
      steps: [
        { label: "Owner review", requiredRole: "OWNER" },
        { label: "Admin finance sign-off", requiredRole: "ADMIN" }
      ]
    },
    requestMetadata(actor.cookieHeader)
  );

  const requiredBeforeRequest = await services.approvalsService.getCurrentApproval(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(requiredBeforeRequest.approval.required, true);
  assert.equal(requiredBeforeRequest.approval.status, "REQUIRED");
  assert.equal(requiredBeforeRequest.approval.currentRequest, null);

  const createdRequest = await services.approvalsService.createApprovalRequest(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      kind: "FUNDING_TRANSACTION_CREATE",
      note: "Funding approval for production rollout"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(createdRequest.approvalRequest.status, "PENDING");
  assert.equal(createdRequest.approvalRequest.steps.length, 2);

  const firstDecision = await services.approvalsService.decideApprovalStep(
    {
      approvalRequestId: createdRequest.approvalRequest.id,
      approvalStepId: createdRequest.approvalRequest.steps[0]!.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(firstDecision.approvalRequest.status, "PENDING");
  assert.equal(firstDecision.step.status, "APPROVED");

  const secondDecision = await services.approvalsService.decideApprovalStep(
    {
      approvalRequestId: createdRequest.approvalRequest.id,
      approvalStepId: createdRequest.approvalRequest.steps[1]!.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(secondDecision.approvalRequest.status, "APPROVED");
  assert.equal(secondDecision.step.status, "APPROVED");

  const approvalAfterDecision = await services.approvalsService.getCurrentApproval(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(approvalAfterDecision.approval.status, "APPROVED");
  assert.equal(
    approvalAfterDecision.approval.currentRequest?.status,
    "APPROVED"
  );
});

test("approvals service captures a statement snapshot from the current settlement statement", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedDraftVersionScenario(services, actor);

  const createdSnapshot = await services.approvalsService.createStatementSnapshot(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      kind: "DEAL_VERSION_SETTLEMENT",
      note: "Month-end statement capture"
    },
    requestMetadata(actor.cookieHeader)
  );
  const listedSnapshots = await services.approvalsService.listStatementSnapshots(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(listedSnapshots.snapshots.length, 1);
  assert.equal(createdSnapshot.snapshot.kind, "DEAL_VERSION_SETTLEMENT");
  assert.equal(
    (
      createdSnapshot.snapshot.payload as unknown as {
        statement: { totalAmountMinor: string };
      }
    ).statement.totalAmountMinor,
    "1000000"
  );
});
