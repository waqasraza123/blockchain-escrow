import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import { privateKeyToAccount } from "viem/accounts";

import { AuditService } from "../src/modules/audit/audit.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { ApprovalRuntimeService } from "../src/modules/approvals/approval-runtime.service";
import { ApprovalsService } from "../src/modules/approvals/approvals.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash
} from "../src/modules/drafts/deal-identity";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { createUnavailableFundingChainReader } from "../src/modules/funding/funding-chain-reader";
import { FundingService } from "../src/modules/funding/funding.service";
import { MilestonesService } from "../src/modules/milestones/milestones.service";
import { buildSettlementExecutionPreparedTransaction } from "../src/modules/milestones/settlement-execution-transaction";
import type {
  MilestoneReviewConfiguration,
  MilestoneSettlementExecutionReconciliationConfiguration
} from "../src/modules/milestones/milestones.tokens";
import type { RequestMetadata } from "../src/modules/auth/auth.http";
import type { FundingReconciliationConfiguration } from "../src/modules/funding/funding.tokens";
import { SponsorshipService } from "../src/modules/sponsorship/sponsorship.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { createRelease12RepositoriesStub } from "./helpers/release12-test-stub";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";
import { InMemoryRelease9Repositories } from "./helpers/in-memory-release9-repositories";

const counterpartyAccount = privateKeyToAccount(
  "0x8b3a350cf5c34c9194ca7a545d6a76fc4d6f8d4894d3e9d2046df1d5c8d14d14"
);
const alternateCounterpartyAccount = privateKeyToAccount(
  "0x0dbbe8d4c1fdb23f4d4cf8f3668a5985bce4a35d7473f2c452ecf72edb5d2d57"
);
const arbitratorAccount = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945382d7f1f6e0c42b4ed44c8a3b77e7d1f123"
);
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

function requestMetadata(cookieHeader: string): RequestMetadata {
  return {
    cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  };
}

async function withManifestContractVersion<T>(
  contractVersion: number,
  run: () => Promise<T>
): Promise<T> {
  const manifest = getDeploymentManifestByChainId(84532);

  if (!manifest) {
    throw new Error("missing base sepolia manifest");
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

async function seedOrganizationMembership(
  repositories: InMemoryRelease1Repositories,
  options: {
    createdByUserId: string;
    name?: string;
    organizationId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    slug?: string;
    userId: string;
  }
) {
  const now = new Date().toISOString();

  if (!(await repositories.organizations.findById(options.organizationId))) {
    await repositories.organizations.create({
      createdAt: now,
      createdByUserId: options.createdByUserId,
      id: options.organizationId,
      name: options.name ?? options.organizationId,
      slug: options.slug ?? options.organizationId,
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

function isoFromNow(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

async function upsertRelease4Cursor(
  release4Repositories: InMemoryRelease4Repositories,
  updatedAt: string
) {
  return release4Repositories.chainCursors.upsert({
    chainId: 84532,
    cursorKey:
      milestoneSettlementExecutionReconciliationConfiguration.release4CursorKeyOverride ??
      "release4:base-sepolia",
    lastProcessedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastProcessedBlockNumber: "100",
    nextBlockNumber: "101",
    updatedAt
  });
}

function createServices() {
  const repositories = new InMemoryRelease1Repositories();
  const release4Repositories = new InMemoryRelease4Repositories();
  const release9Repositories = new InMemoryRelease9Repositories();
  const { release12Repositories, sponsoredRequestStore } = createRelease12RepositoriesStub();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );
  const approvalRuntimeService = new ApprovalRuntimeService(release9Repositories);
  const approvalsService = {
    buildApprovalRequirement: async () => ({
      applicablePolicy: null,
      currentRequest: null,
      required: false,
      status: "NOT_REQUIRED" as const,
      subject: null
    })
  } as Pick<ApprovalsService, "buildApprovalRequirement"> as ApprovalsService;
  const fundingService = new FundingService(
    repositories,
    release12Repositories,
    release4Repositories,
    authenticatedSessionService,
    fundingReconciliationConfiguration,
    createUnavailableFundingChainReader(),
    approvalsService,
    approvalRuntimeService
  );
  const milestonesService = new MilestonesService(
    repositories,
    release12Repositories,
    release4Repositories,
    authenticatedSessionService,
    approvalRuntimeService,
    milestoneReviewConfiguration,
    milestoneSettlementExecutionReconciliationConfiguration
  );

  return {
    auditService: new AuditService(repositories, authenticatedSessionService),
    draftsService: new DraftsService(
      repositories,
      release4Repositories,
      authenticatedSessionService,
      approvalRuntimeService,
      fundingReconciliationConfiguration
    ),
    fundingService,
    milestonesService,
    release1Repositories: repositories,
    release12Repositories,
    release4Repositories,
    release9Repositories,
    sponsorshipService: new SponsorshipService(
      repositories,
      release12Repositories,
      authenticatedSessionService,
      fundingService,
      milestonesService
    ),
    sponsoredRequestStore,
    sessionTokenService
  };
}

async function seedFile(
  repositories: InMemoryRelease1Repositories,
  options: {
    createdByUserId: string;
    fileId: string;
    organizationId: string;
  }
) {
  const now = new Date().toISOString();

  return repositories.files.create({
    byteSize: 1024,
    category: "EVIDENCE",
    createdAt: now,
    createdByUserId: options.createdByUserId,
    id: options.fileId,
    mediaType: "text/plain",
    organizationId: options.organizationId,
    originalFilename: `${options.fileId}.txt`,
    sha256Hex: "a".repeat(64),
    storageKey: `${options.organizationId}/${options.fileId}.txt`,
    updatedAt: now
  });
}

async function seedMilestoneScenario(
  services: ReturnType<typeof createServices>,
  actor: Awaited<ReturnType<typeof seedAuthenticatedActor>>,
  organizationRole: "BUYER" | "SELLER" = "SELLER"
) {
  const now = new Date().toISOString();

  await seedOrganizationMembership(services.release1Repositories, {
    createdByUserId: actor.userId,
    name: "Acme Procurement",
    organizationId: "org-1",
    role: "OWNER",
    slug: "acme-procurement",
    userId: actor.userId
  });
  await services.release1Repositories.counterparties.create({
    contactEmail: "buyer@example.com",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "counterparty-1",
    legalName: null,
    name: "Buyer One",
    normalizedName: "buyer one",
    organizationId: "org-1",
    updatedAt: now
  });

  const draft = await services.draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole,
      settlementCurrency: "USDC",
      title: "Milestone Escrow"
    },
    requestMetadata(actor.cookieHeader)
  );
  const version = await services.draftsService.createVersionSnapshot(
    {
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      bodyMarkdown: "# Final scope",
      milestoneSnapshots: [
        {
          amountMinor: "1000000",
          title: "Design"
        },
        {
          amountMinor: "2000000",
          title: "Build"
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

async function seedActiveAgreement(
  services: ReturnType<typeof createServices>,
  seeded: Awaited<ReturnType<typeof seedMilestoneScenario>>,
  sellerAddress: `0x${string}` = "0x3333333333333333333333333333333333333333",
  buyerAddress: `0x${string}` = "0x4444444444444444444444444444444444444444",
  arbitratorAddress: `0x${string}` | null = null
) {
  const manifest = getDeploymentManifestByChainId(84532);

  if (!manifest) {
    throw new Error("missing base sepolia manifest");
  }

  const [draftRecord, versionRecord, parties, milestones, fileLinks] = await Promise.all([
    services.release1Repositories.draftDeals.findById(seeded.draft.draft.id),
    services.release1Repositories.dealVersions.findById(seeded.version.version.id),
    services.release1Repositories.dealVersionParties.listByDealVersionId(
      seeded.version.version.id
    ),
    services.release1Repositories.dealVersionMilestones.listByDealVersionId(
      seeded.version.version.id
    ),
    services.release1Repositories.dealVersionFiles.listByDealVersionId(
      seeded.version.version.id
    )
  ]);

  if (!draftRecord || !versionRecord) {
    throw new Error("seeded draft/version missing");
  }

  const files = await Promise.all(
    fileLinks.map(async (link) => {
      const file = await services.release1Repositories.files.findById(link.fileId);

      if (!file) {
        throw new Error(`file not found: ${link.fileId}`);
      }

      return file;
    })
  );
  const totalAmount = milestones
    .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
    .toString();
  const dealVersionHash = buildCanonicalDealVersionHash(
    draftRecord,
    versionRecord,
    parties,
    milestones,
    files
  );
  const now = new Date().toISOString();

  await services.release4Repositories.escrowAgreements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress,
    buyerAddress,
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash,
    factoryAddress: manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    funded: true,
    fundedAt: now,
    fundedBlockHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    fundedBlockNumber: "10",
    fundedLogIndex: 2,
    fundedPayerAddress: buyerAddress,
    fundedTransactionHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    initializedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: now,
    initializedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    milestoneCount: milestones.length,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    sellerAddress,
    settlementTokenAddress: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount,
    updatedAt: now
  });
}

async function seedCounterpartySellerSubmission(
  services: ReturnType<typeof createServices>,
  seeded: Awaited<ReturnType<typeof seedMilestoneScenario>>,
  options?: {
    attachmentFileIds?: string[];
    dealVersionMilestoneId?: string;
    reviewDeadlineAt?: string;
    statementMarkdown?: string;
    submittedAt?: string;
    submissionNumber?: number;
  }
) {
  const submittedAt = options?.submittedAt ?? new Date().toISOString();
  const sellerParty = (
    await services.release1Repositories.dealVersionParties.listByDealVersionId(
      seeded.version.version.id
    )
  ).find((party) => party.role === "SELLER");

  if (!sellerParty || sellerParty.subjectType !== "COUNTERPARTY") {
    throw new Error("counterparty seller party not found");
  }
  const dealVersionMilestoneId =
    options?.dealVersionMilestoneId ?? seeded.version.version.milestones[0]!.id;
  const submissionNumber = options?.submissionNumber ?? 1;

  const submission = await services.release1Repositories.dealMilestoneSubmissions.create({
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId,
    draftDealId: seeded.draft.draft.id,
    id: `${dealVersionMilestoneId}-submission-${submissionNumber}`,
    organizationId: "org-1",
    reviewDeadlineAt:
      options?.reviewDeadlineAt ??
      new Date(
        new Date(submittedAt).getTime() +
          milestoneReviewConfiguration.reviewDeadlineSeconds * 1000
      ).toISOString(),
    scheme: null,
    signature: null,
    statementMarkdown:
      options?.statementMarkdown ?? "Counterparty seller delivery evidence.",
    submissionNumber,
    submittedAt,
    submittedByCounterpartyId: sellerParty.counterpartyId,
    submittedByPartyRole: "SELLER",
    submittedByPartySubjectType: "COUNTERPARTY",
    submittedByUserId: null,
    typedData: null
  });

  for (const fileId of options?.attachmentFileIds ?? []) {
    await services.release1Repositories.dealMilestoneSubmissionFiles.add({
      createdAt: submittedAt,
      dealMilestoneSubmissionId: submission.id,
      fileId,
      id: `${submission.id}-${fileId}`
    });
  }

  return submission;
}

async function seedApprovedArbitrator(
  services: ReturnType<typeof createServices>,
  arbitratorAddress: `0x${string}`
) {
  const manifest = getDeploymentManifestByChainId(84532);

  if (!manifest?.contracts.ProtocolConfig || !manifest.contracts.ArbitratorRegistry) {
    throw new Error("missing protocol config or arbitrator registry manifest");
  }

  await services.release4Repositories.protocolConfigStates.upsert({
    arbitratorRegistryAddress:
      manifest.contracts.ArbitratorRegistry.toLowerCase() as `0x${string}`,
    chainId: 84532,
    createEscrowPaused: false,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    fundingPaused: false,
    owner: "0x1111111111111111111111111111111111111111",
    pendingOwner: null,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    tokenAllowlistAddress:
      manifest.contracts.TokenAllowlist!.toLowerCase() as `0x${string}`,
    treasuryAddress: "0x9999999999999999999999999999999999999999",
    updatedAt: new Date().toISOString()
    ,
    updatedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedBlockNumber: "100",
    updatedLogIndex: 0,
    updatedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  });
  await services.release4Repositories.arbitratorRegistryEntries.upsert({
    arbitrator: arbitratorAddress,
    arbitratorRegistryAddress:
      manifest.contracts.ArbitratorRegistry.toLowerCase() as `0x${string}`,
    chainId: 84532,
    isApproved: true,
    updatedAt: new Date().toISOString(),
    updatedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedBlockNumber: "100",
    updatedLogIndex: 1,
    updatedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  });
}

async function seedMilestoneReview(
  services: ReturnType<typeof createServices>,
  seeded: Awaited<ReturnType<typeof seedMilestoneScenario>>,
  actor: Awaited<ReturnType<typeof seedAuthenticatedActor>>,
  submissionId: string,
  options?: {
    decision?: "APPROVED" | "REJECTED";
    dealVersionMilestoneId?: string;
    reviewedAt?: string;
    statementMarkdown?: string | null;
  }
) {
  const reviewedAt = options?.reviewedAt ?? new Date().toISOString();

  return services.release1Repositories.dealMilestoneReviews.create({
    decision: options?.decision ?? "APPROVED",
    dealMilestoneSubmissionId: submissionId,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId:
      options?.dealVersionMilestoneId ?? seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: `review-${submissionId}`,
    organizationId: "org-1",
    reviewedAt,
    reviewedByUserId: actor.userId,
    statementMarkdown: options?.statementMarkdown ?? null
  });
}

async function prepareCounterpartyMilestoneSubmissionChallenge(
  services: ReturnType<typeof createServices>,
  seeded: Awaited<ReturnType<typeof seedMilestoneScenario>>,
  statementMarkdown = "Counterparty seller delivery evidence."
) {
  return services.milestonesService.prepareCounterpartyMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      statementMarkdown
    }
  );
}

async function signCounterpartyMilestoneSubmissionChallenge(
  challenge: Awaited<ReturnType<typeof prepareCounterpartyMilestoneSubmissionChallenge>>,
  signer = counterpartyAccount
): Promise<`0x${string}`> {
  return (
    signer.signTypedData as (input: {
      domain: unknown;
      message: unknown;
      primaryType: unknown;
      types: unknown;
    }) => Promise<`0x${string}`>
  )({
    domain: challenge.challenge.typedData.domain,
    message: challenge.challenge.typedData.message,
    primaryType: challenge.challenge.typedData.primaryType,
    types: challenge.challenge.typedData.types
  });
}

async function signMilestoneDisputeDecisionChallenge(
  challenge: { challenge: { typedData: Record<string, unknown> } },
  signer = arbitratorAccount
): Promise<`0x${string}`> {
  return (
    signer.signTypedData as (input: {
      domain: unknown;
      message: unknown;
      primaryType: unknown;
      types: unknown;
    }) => Promise<`0x${string}`>
  )({
    domain: challenge.challenge.typedData.domain,
    message: challenge.challenge.typedData.message,
    primaryType: challenge.challenge.typedData.primaryType,
    types: challenge.challenge.typedData.types
  });
}

async function expectRejectsWith(
  action: Promise<unknown>,
  expectedName: string,
  expectedMessage: string
) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, expectedName);
    assert.equal(error.message, expectedMessage);
    return true;
  });
}

async function expectRejectsInstance(
  action: Promise<unknown>,
  expectedName: string
) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, expectedName);
    return true;
  });
}

test("milestones service lists workflows and creates immutable seller submissions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");
  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "file-1",
    organizationId: "org-1"
  });
  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "file-2",
    organizationId: "org-1"
  });

  const listedBefore = await services.milestonesService.listMilestoneWorkflows(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(listedBefore.milestones.length, 2);
  assert.equal(listedBefore.milestones[0]?.state, "PENDING");
  assert.deepEqual(listedBefore.milestones[0]?.submissions, []);

  await seedActiveAgreement(services, seeded);

  const firstSubmission = await services.milestonesService.createMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      attachmentFileIds: ["file-1"],
      statementMarkdown: "Initial delivery evidence."
    },
    requestMetadata(actor.cookieHeader)
  );
  const secondSubmission = await services.milestonesService.createMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      attachmentFileIds: ["file-2"],
      statementMarkdown: "Revised delivery evidence."
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(firstSubmission.submission.submissionNumber, 1);
  assert.equal(firstSubmission.submission.attachmentFiles[0]?.id, "file-1");
  assert.equal(firstSubmission.submission.review, null);
  assert.equal(firstSubmission.submission.reviewDeadline.status, "OPEN");
  assert.equal(
    new Date(firstSubmission.submission.reviewDeadline.deadlineAt).getTime() -
      new Date(firstSubmission.submission.submittedAt).getTime(),
    milestoneReviewConfiguration.reviewDeadlineSeconds * 1000
  );
  assert.equal(firstSubmission.submission.submittedByPartyRole, "SELLER");
  assert.equal(firstSubmission.submission.submittedByPartySubjectType, "ORGANIZATION");
  assert.equal(secondSubmission.submission.submissionNumber, 2);
  assert.equal(secondSubmission.submission.attachmentFiles[0]?.id, "file-2");
  assert.equal(secondSubmission.milestone.state, "SUBMITTED");
  assert.equal(secondSubmission.milestone.latestReviewDeadline?.status, "OPEN");
  assert.equal(secondSubmission.milestone.submissions.length, 2);
  assert.equal(secondSubmission.milestone.latestReviewAt, null);

  const listedAfter = await services.milestonesService.listMilestoneWorkflows(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(listedAfter.milestones[0]?.state, "SUBMITTED");
  assert.equal(listedAfter.milestones[0]?.latestReviewDeadline?.status, "OPEN");
  assert.equal(listedAfter.milestones[0]?.latestReviewAt, null);
  assert.equal(listedAfter.milestones[0]?.submissions[0]?.submissionNumber, 1);
  assert.equal(listedAfter.milestones[0]?.submissions[1]?.submissionNumber, 2);

  const auditLogs = await services.auditService.listByEntity(
    {
      entityId: secondSubmission.submission.id,
      entityType: "DEAL_MILESTONE_SUBMISSION"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(auditLogs.auditLogs.length, 1);
  assert.equal(
    auditLogs.auditLogs[0]?.action,
    "DEAL_MILESTONE_SUBMISSION_CREATED"
  );
});

test("milestones service rejects submissions for buyer-side organizations", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);

  await expectRejectsWith(
    services.milestonesService.createMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        statementMarkdown: "Attempted submission."
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ForbiddenException",
    "seller organization party is required"
  );
});

test("milestones service rejects submissions before escrow is active", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await expectRejectsWith(
    services.milestonesService.createMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        statementMarkdown: "Attempted early submission."
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "draft deal escrow is not active"
  );
});

test("milestones service enforces attachment file organization scoping", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedOrganizationMembership(services.release1Repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-2",
    role: "OWNER",
    userId: actor.userId
  });
  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "foreign-file-1",
    organizationId: "org-2"
  });
  await seedActiveAgreement(services, seeded);

  await expectRejectsWith(
    services.milestonesService.createMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        attachmentFileIds: ["foreign-file-1"],
        statementMarkdown: "Submission with wrong file scope."
      },
      requestMetadata(actor.cookieHeader)
    ),
    "NotFoundException",
    "file not found"
  );
});

test("milestones service rejects duplicate attachment ids in one submission", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "file-1",
    organizationId: "org-1"
  });
  await seedActiveAgreement(services, seeded);

  await expectRejectsWith(
    services.milestonesService.createMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        attachmentFileIds: ["file-1", "file-1"],
        statementMarkdown: "Submission with duplicate attachments."
      },
      requestMetadata(actor.cookieHeader)
    ),
    "BadRequestException",
    "attachment file ids must be unique"
  );
});

test("milestones service lets counterparty-side sellers prepare and create signed milestone submissions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  await services.draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    requestMetadata(actor.cookieHeader)
  );
  await seedActiveAgreement(services, seeded);

  const challenge = await prepareCounterpartyMilestoneSubmissionChallenge(
    services,
    seeded,
    "Counterparty signed milestone evidence."
  );
  const signature = await signCounterpartyMilestoneSubmissionChallenge(challenge);
  const result = await services.milestonesService.createCounterpartyMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      signature,
      statementMarkdown: "Counterparty signed milestone evidence."
    }
  );

  assert.equal(
    challenge.challenge.expectedWalletAddress,
    counterpartyAccount.address.toLowerCase()
  );
  assert.equal(result.submission.submissionNumber, 1);
  assert.equal(result.submission.statementMarkdown, "Counterparty signed milestone evidence.");
  assert.equal(result.submission.submittedByPartyRole, "SELLER");
  assert.equal(result.submission.submittedByPartySubjectType, "COUNTERPARTY");
  assert.equal(result.submission.submittedByCounterpartyId, "counterparty-1");
  assert.equal(result.submission.submittedByUserId, null);
  assert.deepEqual(result.submission.attachmentFiles, []);
  assert.equal(result.milestone.state, "SUBMITTED");

  const auditLogs = await services.auditService.listByEntity(
    {
      entityId: result.submission.id,
      entityType: "DEAL_MILESTONE_SUBMISSION"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(auditLogs.auditLogs.length, 1);
  assert.equal(
    auditLogs.auditLogs[0]?.action,
    "DEAL_MILESTONE_SUBMISSION_CREATED"
  );
});

test("milestones service rejects counterparty milestone submissions with an invalid signature", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  await services.draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    requestMetadata(actor.cookieHeader)
  );
  await seedActiveAgreement(services, seeded);

  const challenge = await prepareCounterpartyMilestoneSubmissionChallenge(
    services,
    seeded
  );
  const signature = await signCounterpartyMilestoneSubmissionChallenge(
    challenge,
    alternateCounterpartyAccount
  );

  await expectRejectsWith(
    services.milestonesService.createCounterpartyMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        signature,
        statementMarkdown: "Counterparty seller delivery evidence."
      }
    ),
    "UnauthorizedException",
    "invalid counterparty milestone submission signature"
  );
});

test("milestones service requires a tracked counterparty wallet for signed counterparty milestone submissions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);

  await expectRejectsWith(
    services.milestonesService.prepareCounterpartyMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        statementMarkdown: "Counterparty seller delivery evidence."
      }
    ),
    "ConflictException",
    "counterparty wallet address is required"
  );
});

test("milestones service only allows signed counterparty milestone submissions when the seller party is counterparty-backed", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedActiveAgreement(services, seeded);

  await expectRejectsWith(
    services.milestonesService.prepareCounterpartyMilestoneSubmission(
      {
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        statementMarkdown: "Counterparty seller delivery evidence."
      }
    ),
    "ConflictException",
    "milestone seller party is not a counterparty"
  );
});

test("milestones service lets buyer-side organizations approve latest counterparty seller submissions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "file-1",
    organizationId: "org-1"
  });
  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    attachmentFileIds: ["file-1"]
  });

  const result = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.review.decision, "APPROVED");
  assert.equal(result.review.statementMarkdown, null);
  assert.equal(result.review.reviewedByUserId, actor.userId);
  assert.equal(result.milestone.state, "APPROVED");
  assert.equal(result.milestone.latestReviewDeadline?.status, "REVIEWED_ON_TIME");
  assert.equal(result.milestone.latestReviewAt, result.review.reviewedAt);
  assert.equal(result.milestone.submissions.length, 1);
  assert.equal(result.milestone.submissions[0]?.review?.decision, "APPROVED");
  assert.equal(
    result.milestone.submissions[0]?.submittedByPartySubjectType,
    "COUNTERPARTY"
  );
  assert.equal(
    result.milestone.submissions[0]?.submittedByCounterpartyId,
    "counterparty-1"
  );

  const auditLogs = await services.auditService.listByEntity(
    {
      entityId: result.review.id,
      entityType: "DEAL_MILESTONE_REVIEW"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(auditLogs.auditLogs.length, 1);
  assert.equal(auditLogs.auditLogs[0]?.action, "DEAL_MILESTONE_REVIEW_APPROVED");
});

test("milestones service lets buyer-side organizations reject latest counterparty seller submissions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);

  const result = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "REJECTED",
      statementMarkdown: "Missing acceptance criteria evidence."
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.review.decision, "REJECTED");
  assert.equal(
    result.review.statementMarkdown,
    "Missing acceptance criteria evidence."
  );
  assert.equal(result.milestone.state, "REJECTED");
  assert.equal(result.milestone.latestReviewDeadline?.status, "REVIEWED_ON_TIME");
  assert.equal(result.milestone.submissions[0]?.review?.decision, "REJECTED");
});

test("milestones service derives expired and late-reviewed deadline summaries", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  const overdueSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    reviewDeadlineAt: "2026-04-01T00:00:00.000Z",
    statementMarkdown: "Waiting on buyer review.",
    submittedAt: "2026-03-25T00:00:00.000Z",
    submissionNumber: 1
  });
  const lateReviewedSubmission = await seedCounterpartySellerSubmission(
    services,
    seeded,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
      reviewDeadlineAt: "2026-04-01T00:00:00.000Z",
      statementMarkdown: "Delivered after deadline path.",
      submittedAt: "2026-03-24T00:00:00.000Z",
      submissionNumber: 1
    }
  );

  await seedMilestoneReview(services, seeded, actor, lateReviewedSubmission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    reviewedAt: "2026-04-03T00:00:00.000Z"
  });

  const result = await services.milestonesService.listMilestoneWorkflows(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.milestones[0]?.submissions[0]?.id, overdueSubmission.id);
  assert.equal(result.milestones[0]?.latestReviewDeadline?.status, "EXPIRED");
  assert.equal(
    result.milestones[0]?.latestReviewDeadline?.expiredAt,
    "2026-04-01T00:00:00.000Z"
  );
  assert.equal(
    result.milestones[1]?.latestReviewDeadline?.status,
    "REVIEWED_AFTER_DEADLINE"
  );
  assert.equal(
    result.milestones[1]?.latestReviewDeadline?.expiredAt,
    "2026-04-01T00:00:00.000Z"
  );
});

test("milestones service lists grouped milestone timelines from immutable milestone records", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "file-1",
    organizationId: "org-1"
  });

  const approvedSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    attachmentFileIds: ["file-1"],
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    reviewDeadlineAt: "2026-04-08T00:00:00.000Z",
    statementMarkdown: "Design milestone delivered.",
    submittedAt: "2026-04-01T00:00:00.000Z",
    submissionNumber: 1
  });
  const approvedReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    approvedSubmission.id,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      reviewedAt: "2026-04-02T00:00:00.000Z"
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: approvedReview.id,
    dealMilestoneSubmissionId: approvedSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-1",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-03T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: "Release approved milestone funds."
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: approvedReview.id,
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: approvedSubmission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-1",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-03T12:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const expiredSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    reviewDeadlineAt: "2026-04-04T00:00:00.000Z",
    statementMarkdown: "Build milestone delivered.",
    submittedAt: "2026-04-01T12:00:00.000Z",
    submissionNumber: 1
  });
  await services.release1Repositories.dealMilestoneReviewDeadlineExpiries.create({
    dealMilestoneSubmissionId: expiredSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    deadlineAt: "2026-04-04T00:00:00.000Z",
    draftDealId: seeded.draft.draft.id,
    expiredAt: "2026-04-04T00:00:00.000Z",
    id: "deadline-expiry-1",
    organizationId: "org-1"
  });

  const result = await services.milestonesService.listMilestoneTimelines(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.milestones.length, 2);
  assert.deepEqual(
    result.milestones[0]?.events.map((event) => event.kind),
    [
      "SUBMISSION_CREATED",
      "REVIEW_APPROVED",
      "RELEASE_REQUESTED",
      "SETTLEMENT_PREPARED"
    ]
  );
  assert.equal(result.milestones[0]?.latestOccurredAt, "2026-04-03T12:00:00.000Z");
  assert.equal(result.milestones[0]?.events[0]?.attachmentFiles[0]?.id, "file-1");
  assert.equal(
    result.milestones[0]?.events[0]?.submittedByPartySubjectType,
    "COUNTERPARTY"
  );
  assert.equal(result.milestones[0]?.events[1]?.reviewDecision, "APPROVED");
  assert.equal(result.milestones[0]?.events[1]?.reviewDeadline?.status, "REVIEWED_ON_TIME");
  assert.equal(result.milestones[0]?.events[2]?.settlementKind, "RELEASE");
  assert.equal(
    result.milestones[0]?.events[2]?.statementMarkdown,
    "Release approved milestone funds."
  );
  assert.equal(result.milestones[0]?.events[3]?.settlementKind, "RELEASE");
  assert.equal(
    result.milestones[0]?.events[3]?.settlementPreparation?.agreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(
    result.milestones[0]?.events[3]?.settlementPreparation?.preparedAt,
    "2026-04-03T12:00:00.000Z"
  );

  assert.deepEqual(
    result.milestones[1]?.events.map((event) => event.kind),
    ["SUBMISSION_CREATED", "REVIEW_DEADLINE_EXPIRED"]
  );
  assert.equal(result.milestones[1]?.latestOccurredAt, "2026-04-04T00:00:00.000Z");
  assert.equal(
    result.milestones[1]?.events[1]?.dealMilestoneSubmissionId,
    expiredSubmission.id
  );
  assert.equal(result.milestones[1]?.events[1]?.reviewDeadline?.status, "EXPIRED");
  assert.equal(
    result.milestones[1]?.events[1]?.reviewDeadline?.expiredAt,
    "2026-04-04T00:00:00.000Z"
  );
});

test("milestones service exposes settlement execution preparation on workflow summaries", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await seedMilestoneReview(services, seeded, actor, submission.id);

  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-1",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-03T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-1",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-03T12:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const result = await services.milestonesService.listMilestoneWorkflows(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(
    result.milestones[0]?.submissions[0]?.review?.settlementRequest?.executionPreparation?.id,
    "settlement-preparation-1"
  );
  assert.equal(
    result.milestones[0]?.submissions[0]?.review?.settlementRequest?.executionPreparation
      ?.milestonePosition,
    1
  );
});

test("milestones service lists milestone settlement executions with prepared and pending statuses", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const firstSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const firstReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    firstSubmission.id,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: firstReview.id,
    dealMilestoneSubmissionId: firstSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-1",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-03T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: firstReview.id,
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: firstSubmission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-1",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-03T12:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const secondSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    submissionNumber: 1
  });
  const secondReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    secondSubmission.id,
    {
      decision: "REJECTED",
      dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
      statementMarkdown: "Refund this milestone."
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: secondReview.id,
    dealMilestoneSubmissionId: secondSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-2",
    kind: "REFUND",
    organizationId: "org-1",
    requestedAt: "2026-04-04T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: "Refund the rejected milestone."
  });

  const result = await services.milestonesService.listMilestoneSettlementExecutions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.settlements.length, 2);
  assert.equal(result.settlements[0]?.status, "PREPARED");
  assert.deepEqual(result.settlements[0]?.blockers, []);
  assert.equal(
    result.settlements[0]?.executionPreparation?.id,
    "settlement-preparation-1"
  );
  assert.equal(result.settlements[1]?.status, "PENDING_PREPARATION");
  assert.deepEqual(result.settlements[1]?.blockers, []);
  assert.equal(result.settlements[1]?.executionPreparation, null);
  assert.equal(result.settlements[1]?.settlementRequest.kind, "REFUND");
});

test("milestones service marks settlement executions blocked when indexed agreement truth is incompatible", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const [linkedAgreement] =
    await services.release4Repositories.escrowAgreements.listByChainId(84532);

  if (!linkedAgreement) {
    throw new Error("linked agreement missing");
  }

  await services.release4Repositories.escrowAgreements.upsert({
    ...linkedAgreement,
    milestoneCount: 1,
    updatedAt: "2026-04-05T00:00:00.000Z"
  });

  const blockedSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    submissionNumber: 1
  });
  const blockedReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    blockedSubmission.id,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[1]!.id
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: blockedReview.id,
    dealMilestoneSubmissionId: blockedSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-blocked",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-05T01:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });

  const result = await services.milestonesService.listMilestoneSettlementExecutions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.settlements.length, 1);
  assert.equal(result.settlements[0]?.status, "BLOCKED");
  assert.deepEqual(result.settlements[0]?.blockers, [
    "AGREEMENT_MILESTONE_COUNT_MISMATCH"
  ]);
  assert.equal(result.settlements[0]?.executionPreparation, null);
});

test("milestones service blocks superseded settlement executions when a newer submission exists", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const firstSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1,
    submittedAt: "2026-04-03T00:00:00.000Z"
  });
  const firstReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    firstSubmission.id,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      reviewedAt: "2026-04-03T01:00:00.000Z"
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: firstReview.id,
    dealMilestoneSubmissionId: firstSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-superseded",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-03T02:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: firstReview.id,
    dealMilestoneSettlementRequestId: "settlement-request-superseded",
    dealMilestoneSubmissionId: firstSubmission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-superseded",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-03T03:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 2,
    submittedAt: "2026-04-04T00:00:00.000Z"
  });

  const result = await services.milestonesService.listMilestoneSettlementExecutions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.settlements.length, 1);
  assert.equal(result.settlements[0]?.status, "BLOCKED");
  assert.deepEqual(result.settlements[0]?.blockers, ["NEWER_SUBMISSION_EXISTS"]);
  assert.equal(
    result.settlements[0]?.executionPreparation?.id,
    "settlement-preparation-superseded"
  );
});

test("milestones service returns execution plans with honest unsupported-contract blockers", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-plan",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-06T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-plan",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-plan",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-06T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const result = await withManifestContractVersion(1, async () =>
    services.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId: "settlement-request-plan",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    )
  );

  assert.equal(result.plan.ready, false);
  assert.deepEqual(result.plan.blockers, [
    "SETTLEMENT_EXECUTION_METHOD_UNAVAILABLE"
  ]);
  assert.equal(result.plan.contractVersion, 1);
  assert.equal(result.plan.chainId, 84532);
  assert.equal(result.plan.executionPreparation?.id, "settlement-preparation-plan");
  assert.equal(result.plan.executionTransaction, null);
  assert.equal(result.plan.executionTransactionMethod, null);
  assert.equal(result.plan.settlementRequest.id, "settlement-request-plan");
  assert.equal(
    result.plan.agreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
});

test("milestones service returns executable settlement transaction payloads for release and refund", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);

  const releaseMilestone = seeded.version.version.milestones[0]!;
  const releaseSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: releaseMilestone.id,
    submissionNumber: 1
  });
  const releaseReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    releaseSubmission.id,
    {
      dealVersionMilestoneId: releaseMilestone.id
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: releaseReview.id,
    dealMilestoneSubmissionId: releaseSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: releaseMilestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-release",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-06T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: releaseReview.id,
    dealMilestoneSettlementRequestId: "settlement-request-release",
    dealMilestoneSubmissionId: releaseSubmission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: releaseMilestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-release",
    kind: "RELEASE",
    milestoneAmountMinor: releaseMilestone.amountMinor,
    milestonePosition: releaseMilestone.position,
    organizationId: "org-1",
    preparedAt: "2026-04-06T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const refundMilestone = seeded.version.version.milestones[1]!;
  const refundSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: refundMilestone.id,
    submissionNumber: 1
  });
  const refundReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    refundSubmission.id,
    {
      decision: "REJECTED",
      dealVersionMilestoneId: refundMilestone.id
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: refundReview.id,
    dealMilestoneSubmissionId: refundSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: refundMilestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-refund",
    kind: "REFUND",
    organizationId: "org-1",
    requestedAt: "2026-04-06T02:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: refundReview.id,
    dealMilestoneSettlementRequestId: "settlement-request-refund",
    dealMilestoneSubmissionId: refundSubmission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: refundMilestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-refund",
    kind: "REFUND",
    milestoneAmountMinor: refundMilestone.amountMinor,
    milestonePosition: refundMilestone.position,
    organizationId: "org-1",
    preparedAt: "2026-04-06T03:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  await withManifestContractVersion(3, async () => {
    const releasePlan = await services.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId: "settlement-request-release",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );
    const refundPlan = await services.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId: "settlement-request-refund",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );
    const expectedReleaseTransaction = buildSettlementExecutionPreparedTransaction({
      agreementAddress: "0x7777777777777777777777777777777777777777",
      kind: "RELEASE",
      milestoneAmountMinor: releaseMilestone.amountMinor,
      milestonePosition: releaseMilestone.position
    });
    const expectedRefundTransaction = buildSettlementExecutionPreparedTransaction({
      agreementAddress: "0x7777777777777777777777777777777777777777",
      kind: "REFUND",
      milestoneAmountMinor: refundMilestone.amountMinor,
      milestonePosition: refundMilestone.position
    });

    assert.equal(releasePlan.plan.ready, true);
    assert.deepEqual(releasePlan.plan.blockers, []);
    assert.equal(releasePlan.plan.executionTransactionMethod, "releaseMilestone");
    assert.deepEqual(
      releasePlan.plan.executionTransaction,
      expectedReleaseTransaction.transaction
    );

    assert.equal(refundPlan.plan.ready, true);
    assert.deepEqual(refundPlan.plan.blockers, []);
    assert.equal(refundPlan.plan.executionTransactionMethod, "refundMilestone");
    assert.deepEqual(
      refundPlan.plan.executionTransaction,
      expectedRefundTransaction.transaction
    );
  });
});

test("sponsorship service reuses settlement execution calldata from the execution plan", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  const now = "2026-04-08T00:00:00.000Z";

  await seedActiveAgreement(services, seeded);
  const milestone = seeded.version.version.milestones[0]!;
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: milestone.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: milestone.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-sponsored-plan",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: now,
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-sponsored-plan",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-sponsored-plan",
    kind: "RELEASE",
    milestoneAmountMinor: milestone.amountMinor,
    milestonePosition: milestone.position,
    organizationId: "org-1",
    preparedAt: "2026-04-08T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await services.release12Repositories.gasPolicies.create({
    active: true,
    allowedApprovalPolicyKinds: [],
    allowedChainIds: [84532],
    allowedTransactionKinds: [
      "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE"
    ],
    createdAt: now,
    createdByUserId: actor.userId,
    description: null,
    id: "gas-policy-1",
    maxAmountMinor: null,
    maxRequestsPerDay: 10,
    name: "Settlement policy",
    organizationId: "org-1",
    sponsorWindowMinutes: 60,
    updatedAt: now
  });

  await withManifestContractVersion(3, async () => {
    const plan = await services.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId: "settlement-request-sponsored-plan",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );
    const sponsored =
      await services.sponsorshipService.createSponsoredSettlementExecutionRequest(
        {
          dealMilestoneSettlementRequestId: "settlement-request-sponsored-plan",
          dealVersionId: seeded.version.version.id,
          draftDealId: seeded.draft.draft.id,
          organizationId: "org-1"
        },
        {
          gasPolicyId: "gas-policy-1"
        },
        requestMetadata(actor.cookieHeader)
      );

    assert.equal(plan.plan.ready, true);
    assert.ok(plan.plan.executionTransaction);
    assert.equal(
      sponsored.sponsoredTransactionRequest.data,
      plan.plan.executionTransaction.data
    );
    assert.equal(
      sponsored.sponsoredTransactionRequest.toAddress,
      plan.plan.executionTransaction.to
    );
    assert.equal(
      sponsored.sponsoredTransactionRequest.value,
      plan.plan.executionTransaction.value
    );
  });
});

test("milestones service reflects indexed settlements as executed milestone truth", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const milestone = seeded.version.version.milestones[0]!;
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: milestone.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: milestone.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-indexed",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-08T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-indexed",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-indexed",
    kind: "RELEASE",
    milestoneAmountMinor: milestone.amountMinor,
    milestonePosition: milestone.position,
    organizationId: "org-1",
    preparedAt: "2026-04-08T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await services.release4Repositories.escrowAgreementMilestoneSettlements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    amount: milestone.amountMinor,
    beneficiaryAddress: "0x3333333333333333333333333333333333333333",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    kind: "RELEASE",
    milestonePosition: milestone.position,
    settledAt: "2026-04-08T02:00:00.000Z",
    settledBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    settledBlockNumber: "42",
    settledByAddress: actor.walletAddress,
    settledLogIndex: 0,
    settledTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    updatedAt: "2026-04-08T02:00:00.000Z"
  });

  await withManifestContractVersion(3, async () => {
    const workflows = await services.milestonesService.listMilestoneWorkflows(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );
    const timelines = await services.milestonesService.listMilestoneTimelines(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );
    const settlements =
      await services.milestonesService.listMilestoneSettlementExecutions(
        {
          dealVersionId: seeded.version.version.id,
          draftDealId: seeded.draft.draft.id,
          organizationId: "org-1"
        },
        requestMetadata(actor.cookieHeader)
      );
    const plan = await services.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId: "settlement-request-indexed",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );

    assert.equal(workflows.milestones[0]?.state, "RELEASED");
    assert.equal(
      timelines.milestones[0]?.events.some(
        (event) => event.kind === "RELEASE_EXECUTED"
      ),
      true
    );
    assert.equal(settlements.settlements[0]?.status, "EXECUTED");
    assert.equal(settlements.settlements[0]?.indexedSettlement?.amount, milestone.amountMinor);
    assert.deepEqual(plan.plan.blockers, ["SETTLEMENT_ALREADY_EXECUTED"]);
    assert.equal(plan.plan.ready, false);
    assert.equal(plan.plan.indexedSettlement?.settledBlockNumber, "42");
  });
});

test("milestones service returns a settlement statement with aggregate release and refund totals", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);

  const firstSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const firstReview = await seedMilestoneReview(
    services,
    seeded,
    actor,
    firstSubmission.id,
    {
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
    }
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: firstReview.id,
    dealMilestoneSubmissionId: firstSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-statement-release",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-08T01:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: "Release milestone one."
  });

  const secondSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    statementMarkdown: "Second milestone has defects.",
    submissionNumber: 1
  });
  const secondReview = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: secondSubmission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "REJECTED",
      statementMarkdown: "Refund the remaining milestone."
    },
    requestMetadata(actor.cookieHeader)
  );
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: secondReview.review.id,
    dealMilestoneSubmissionId: secondSubmission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-statement-refund",
    kind: "REFUND",
    organizationId: "org-1",
    requestedAt: "2026-04-08T02:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: "Refund milestone two."
  });

  const draftRecord = await services.release1Repositories.draftDeals.findById(
    seeded.draft.draft.id
  );

  assert.ok(draftRecord);
  draftRecord.state = "COMPLETED";

  await services.release4Repositories.escrowAgreementMilestoneSettlements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    amount: seeded.version.version.milestones[0]!.amountMinor,
    beneficiaryAddress: "0x3333333333333333333333333333333333333333",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    kind: "RELEASE",
    milestonePosition: 1,
    settledAt: "2026-04-08T03:00:00.000Z",
    settledBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    settledBlockNumber: "41",
    settledByAddress: actor.walletAddress,
    settledLogIndex: 0,
    settledTransactionHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    updatedAt: "2026-04-08T03:00:00.000Z"
  });
  await services.release4Repositories.escrowAgreementMilestoneSettlements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    amount: seeded.version.version.milestones[1]!.amountMinor,
    beneficiaryAddress: actor.walletAddress,
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    kind: "REFUND",
    milestonePosition: 2,
    settledAt: "2026-04-08T04:00:00.000Z",
    settledBlockHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    settledBlockNumber: "42",
    settledByAddress: actor.walletAddress,
    settledLogIndex: 1,
    settledTransactionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    updatedAt: "2026-04-08T04:00:00.000Z"
  });

  const result = await services.milestonesService.getSettlementStatement(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.statement.draftState, "COMPLETED");
  assert.equal(result.statement.milestoneCount, 2);
  assert.equal(result.statement.releasedMilestoneCount, 1);
  assert.equal(result.statement.refundedMilestoneCount, 1);
  assert.equal(result.statement.pendingMilestoneCount, 0);
  assert.equal(result.statement.releasedAmountMinor, "1000000");
  assert.equal(result.statement.refundedAmountMinor, "2000000");
  assert.equal(result.statement.pendingAmountMinor, "0");
  assert.equal(result.statement.totalAmountMinor, "3000000");
  assert.equal(result.statement.latestSettledAt, "2026-04-08T04:00:00.000Z");
  assert.equal(result.milestones[0]?.state, "RELEASED");
  assert.equal(result.milestones[0]?.latestSettlementRequest?.kind, "RELEASE");
  assert.equal(result.milestones[0]?.indexedSettlement?.settledBlockNumber, "41");
  assert.equal(result.milestones[1]?.state, "REFUNDED");
  assert.equal(result.milestones[1]?.latestReview?.decision, "REJECTED");
  assert.equal(result.milestones[1]?.latestSettlementRequest?.kind, "REFUND");
  assert.equal(result.milestones[1]?.indexedSettlement?.settledBlockNumber, "42");
});

test("milestones service tracks settlement execution transactions and supersedes older pending replacements", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-tracking",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-06T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-tracking",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-tracking",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-06T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const { first, replacement } = await withManifestContractVersion(3, async () => {
    const first =
      await services.milestonesService.createMilestoneSettlementExecutionTransaction(
        {
          dealMilestoneSettlementRequestId: "settlement-request-tracking",
          dealVersionId: seeded.version.version.id,
          draftDealId: seeded.draft.draft.id,
          organizationId: "org-1"
        },
        {
          transactionHash:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        requestMetadata(actor.cookieHeader)
      );
    const replacement =
      await services.milestonesService.createMilestoneSettlementExecutionTransaction(
        {
          dealMilestoneSettlementRequestId: "settlement-request-tracking",
          dealVersionId: seeded.version.version.id,
          draftDealId: seeded.draft.draft.id,
          organizationId: "org-1"
        },
        {
          transactionHash:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        },
        requestMetadata(actor.cookieHeader)
      );

    return { first, replacement };
  });

  await services.release4Repositories.indexedTransactions.upsertMany([
    {
      blockHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      blockNumber: "21",
      chainId: 84532,
      executionStatus: "SUCCESS",
      fromAddress: actor.walletAddress,
      indexedAt: "2026-04-06T02:00:00.000Z",
      toAddress: "0x7777777777777777777777777777777777777777",
      transactionHash: replacement.executionTransaction.transactionHash,
      transactionIndex: 0
    }
  ]);

  const listed =
    await services.milestonesService.listMilestoneSettlementExecutionTransactions(
      {
        dealMilestoneSettlementRequestId: "settlement-request-tracking",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );

  assert.equal(first.executionTransaction.status, "PENDING");
  assert.equal(replacement.executionTransaction.status, "PENDING");
  assert.equal(listed.executionTransactions.length, 2);
  assert.equal(listed.executionTransactions[0]?.status, "CONFIRMED");
  assert.equal(
    listed.executionTransactions[0]?.agreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(listed.executionTransactions[0]?.matchesTrackedAgreement, true);
  assert.equal(
    listed.executionTransactions[1]?.status,
    "SUPERSEDED"
  );
  assert.equal(
    listed.executionTransactions[1]
      ?.supersededByDealMilestoneSettlementExecutionTransactionId,
    replacement.executionTransaction.id
  );
});

test("milestones service marks reverted settlement execution transactions as failed", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-failed",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-07T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-failed",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-failed",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-07T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });

  const created = await withManifestContractVersion(3, async () =>
    services.milestonesService.createMilestoneSettlementExecutionTransaction(
      {
        dealMilestoneSettlementRequestId: "settlement-request-failed",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        transactionHash:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
      },
      requestMetadata(actor.cookieHeader)
    )
  );

  await services.release4Repositories.indexedTransactions.upsertMany([
    {
      blockHash:
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      blockNumber: "22",
      chainId: 84532,
      executionStatus: "REVERTED",
      fromAddress: actor.walletAddress,
      indexedAt: "2026-04-07T02:00:00.000Z",
      toAddress: "0x7777777777777777777777777777777777777777",
      transactionHash: created.executionTransaction.transactionHash,
      transactionIndex: 0
    }
  ]);

  const listed =
    await services.milestonesService.listMilestoneSettlementExecutionTransactions(
      {
        dealMilestoneSettlementRequestId: "settlement-request-failed",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );

  assert.equal(listed.executionTransactions.length, 1);
  assert.equal(listed.executionTransactions[0]?.status, "FAILED");
  assert.equal(listed.executionTransactions[0]?.agreementAddress, null);
  assert.equal(listed.executionTransactions[0]?.indexedExecutionStatus, "REVERTED");
  assert.equal(listed.executionTransactions[0]?.indexedBlockNumber, "22");
});

test("milestones service marks approved settlement sponsorship requests as submitted", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-sponsored",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-08T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-sponsored",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-sponsored",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-08T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await services.release12Repositories.sponsoredTransactionRequests.create({
    amountMinor: seeded.version.version.milestones[0]!.amountMinor,
    approvedAt: "2026-04-08T01:30:00.000Z",
    chainId: 84532,
    createdAt: "2026-04-08T01:30:00.000Z",
    data: "0x1234",
    dealMilestoneSettlementRequestId: "settlement-request-sponsored",
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    expiresAt: "2026-04-08T02:30:00.000Z",
    gasPolicyId: "gas-policy-1",
    id: "sponsored-settlement-request-1",
    kind: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE",
    organizationId: "org-1",
    reason: null,
    requestedByUserId: actor.userId,
    rejectedAt: null,
    status: "APPROVED",
    subjectId: "settlement-request-sponsored",
    subjectType: "DEAL_MILESTONE_SETTLEMENT_REQUEST",
    submittedAt: null,
    submittedTransactionHash: null,
    toAddress: "0x7777777777777777777777777777777777777777",
    updatedAt: "2026-04-08T01:30:00.000Z",
    value: "0",
    walletAddress: actor.walletAddress,
    walletId: actor.walletId
  });

  const created = await withManifestContractVersion(3, async () =>
    services.milestonesService.createMilestoneSettlementExecutionTransaction(
      {
        dealMilestoneSettlementRequestId: "settlement-request-sponsored",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        transactionHash:
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      },
      requestMetadata(actor.cookieHeader)
    )
  );

  const sponsoredRequest =
    await services.release12Repositories.sponsoredTransactionRequests.findById(
      "sponsored-settlement-request-1"
    );

  assert.equal(sponsoredRequest?.status, "SUBMITTED");
  assert.equal(
    sponsoredRequest?.submittedTransactionHash,
    created.executionTransaction.transactionHash
  );
  assert.notEqual(sponsoredRequest?.submittedAt, null);
});

test("milestones service exposes persisted stale pending escalation metadata on settlement execution transactions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-escalated",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-07T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-escalated",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-escalated",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-07T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await services.release1Repositories.dealMilestoneSettlementExecutionTransactions.create({
    chainId: 84532,
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-escalated",
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-execution-tx-escalated",
    organizationId: "org-1",
    reconciledAgreementAddress: null,
    reconciledAt: null,
    reconciledConfirmedAt: null,
    reconciledMatchesTrackedAgreement: null,
    reconciledStatus: null,
    stalePendingEscalatedAt: "2026-04-06T12:05:00.000Z",
    submittedAt: isoFromNow(-3900),
    submittedByUserId: actor.userId,
    submittedWalletAddress: actor.walletAddress,
    submittedWalletId: actor.walletId,
    supersededAt: null,
    supersededByDealMilestoneSettlementExecutionTransactionId: null,
    transactionHash:
      "0x5151515151515151515151515151515151515151515151515151515151515151"
  });
  await upsertRelease4Cursor(services.release4Repositories, isoFromNow(-60));

  const listed =
    await services.milestonesService.listMilestoneSettlementExecutionTransactions(
      {
        dealMilestoneSettlementRequestId: "settlement-request-escalated",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );

  assert.equal(listed.executionTransactions[0]?.status, "PENDING");
  assert.equal(listed.executionTransactions[0]?.stalePending, true);
  assert.equal(
    listed.executionTransactions[0]?.stalePendingEscalatedAt,
    "2026-04-06T12:05:00.000Z"
  );
  assert.equal(listed.executionTransactions[0]?.stalePendingEvaluation, "READY");
});

test("milestones service exposes persisted worker reconciliation metadata while keeping live settlement execution status truthful", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    submissionNumber: 1
  });
  const review = await seedMilestoneReview(services, seeded, actor, submission.id, {
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id
  });
  await services.release1Repositories.dealMilestoneSettlementRequests.create({
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-request-reconciled",
    kind: "RELEASE",
    organizationId: "org-1",
    requestedAt: "2026-04-07T00:00:00.000Z",
    requestedByUserId: actor.userId,
    statementMarkdown: null
  });
  await services.release1Repositories.dealMilestoneSettlementPreparations.create({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-reconciled",
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-preparation-reconciled",
    kind: "RELEASE",
    milestoneAmountMinor: seeded.version.version.milestones[0]!.amountMinor,
    milestonePosition: seeded.version.version.milestones[0]!.position,
    organizationId: "org-1",
    preparedAt: "2026-04-07T01:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000"
  });
  await services.release1Repositories.dealMilestoneSettlementExecutionTransactions.create({
    chainId: 84532,
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: "settlement-request-reconciled",
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: seeded.version.version.id,
    dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
    draftDealId: seeded.draft.draft.id,
    id: "settlement-execution-tx-reconciled",
    organizationId: "org-1",
    reconciledAgreementAddress: "0x7777777777777777777777777777777777777777",
    reconciledAt: "2026-04-06T12:05:00.000Z",
    reconciledConfirmedAt: "2026-04-06T12:05:00.000Z",
    reconciledMatchesTrackedAgreement: true,
    reconciledStatus: "CONFIRMED",
    stalePendingEscalatedAt: null,
    submittedAt: isoFromNow(-1800),
    submittedByUserId: actor.userId,
    submittedWalletAddress: actor.walletAddress,
    submittedWalletId: actor.walletId,
    supersededAt: null,
    supersededByDealMilestoneSettlementExecutionTransactionId: null,
    transactionHash:
      "0x5252525252525252525252525252525252525252525252525252525252525252"
  });
  await upsertRelease4Cursor(services.release4Repositories, isoFromNow(-60));

  const listed =
    await services.milestonesService.listMilestoneSettlementExecutionTransactions(
      {
        dealMilestoneSettlementRequestId: "settlement-request-reconciled",
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      requestMetadata(actor.cookieHeader)
    );

  assert.equal(listed.executionTransactions[0]?.status, "PENDING");
  assert.equal(listed.executionTransactions[0]?.agreementAddress, null);
  assert.equal(listed.executionTransactions[0]?.confirmedAt, null);
  assert.equal(listed.executionTransactions[0]?.reconciledStatus, "CONFIRMED");
  assert.equal(
    listed.executionTransactions[0]?.reconciledAt,
    "2026-04-06T12:05:00.000Z"
  );
});

test("milestones service requires buyer role for milestone reviews", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedActiveAgreement(services, seeded);
  const submission = await services.milestonesService.createMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      statementMarkdown: "Seller-side evidence."
    },
    requestMetadata(actor.cookieHeader)
  );

  await expectRejectsWith(
    services.milestonesService.createMilestoneReview(
      {
        dealMilestoneSubmissionId: submission.submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        decision: "APPROVED"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ForbiddenException",
    "buyer organization party is required"
  );
});

test("milestones service requires a rejection statement for rejected reviews", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);

  await expectRejectsInstance(
    services.milestonesService.createMilestoneReview(
      {
        dealMilestoneSubmissionId: submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        decision: "REJECTED"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "BadRequestException"
  );
});

test("milestones service prevents duplicate reviews for the same submission", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);

  await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  await expectRejectsWith(
    services.milestonesService.createMilestoneReview(
      {
        dealMilestoneSubmissionId: submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        decision: "APPROVED"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "milestone submission already reviewed"
  );
});

test("milestones service only allows reviews for the latest submission on a milestone", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const firstSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    submissionNumber: 1
  });
  await seedCounterpartySellerSubmission(services, seeded, {
    statementMarkdown: "Updated evidence package.",
    submissionNumber: 2
  });

  await expectRejectsWith(
    services.milestonesService.createMilestoneReview(
      {
        dealMilestoneSubmissionId: firstSubmission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        decision: "APPROVED"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "only latest milestone submission can be reviewed"
  );
});

test("milestones service lets buyer-side organizations request release after approval", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  const result = await services.milestonesService.createMilestoneSettlementRequest(
    {
      dealMilestoneReviewId: review.review.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      kind: "RELEASE",
      statementMarkdown: "Release the approved milestone funds."
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.settlementRequest.kind, "RELEASE");
  assert.equal(result.settlementRequest.requestedByUserId, actor.userId);
  assert.equal(result.settlementRequest.executionPreparation, null);
  assert.equal(result.milestone.state, "APPROVED");
  assert.equal(
    result.milestone.submissions[0]?.review?.settlementRequest?.id,
    result.settlementRequest.id
  );
  assert.equal(
    result.milestone.submissions[0]?.review?.settlementRequest?.statementMarkdown,
    "Release the approved milestone funds."
  );

  const auditLogs = await services.auditService.listByEntity(
    {
      entityId: result.settlementRequest.id,
      entityType: "DEAL_MILESTONE_SETTLEMENT_REQUEST"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(auditLogs.auditLogs.length, 1);
  assert.equal(
    auditLogs.auditLogs[0]?.action,
    "DEAL_MILESTONE_RELEASE_REQUESTED"
  );
});

test("milestones service lets buyer-side organizations request refund after rejection", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "REJECTED",
      statementMarkdown: "Rejecting this milestone delivery."
    },
    requestMetadata(actor.cookieHeader)
  );

  const result = await services.milestonesService.createMilestoneSettlementRequest(
    {
      dealMilestoneReviewId: review.review.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      kind: "REFUND"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(result.settlementRequest.kind, "REFUND");
  assert.equal(result.milestone.state, "REJECTED");
  assert.equal(
    result.milestone.submissions[0]?.review?.settlementRequest?.kind,
    "REFUND"
  );
});

test("milestones service requires buyer role for settlement requests", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedActiveAgreement(services, seeded);
  const submission = await services.milestonesService.createMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      statementMarkdown: "Seller-side evidence."
    },
    requestMetadata(actor.cookieHeader)
  );
  const review = await seedMilestoneReview(
    services,
    seeded,
    actor,
    submission.submission.id
  );

  await expectRejectsWith(
    services.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId: review.id,
        dealMilestoneSubmissionId: submission.submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ForbiddenException",
    "buyer organization party is required"
  );
});

test("milestones service enforces settlement kind to match review decision", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  await expectRejectsWith(
    services.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId: review.review.id,
        dealMilestoneSubmissionId: submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "REFUND"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "approved milestone reviews require release requests"
  );
});

test("milestones service prevents duplicate settlement requests for the same review", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  await services.milestonesService.createMilestoneSettlementRequest(
    {
      dealMilestoneReviewId: review.review.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      kind: "RELEASE"
    },
    requestMetadata(actor.cookieHeader)
  );

  await expectRejectsWith(
    services.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId: review.review.id,
        dealMilestoneSubmissionId: submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "milestone review already has a settlement request"
  );
});

test("milestones service opens disputes and blocks direct settlement requests while unresolved", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  const arbitratorAddress = arbitratorAccount.address.toLowerCase() as `0x${string}`;

  await seedFile(services.release1Repositories, {
    createdByUserId: actor.userId,
    fileId: "dispute-file-1",
    organizationId: "org-1"
  });
  await seedActiveAgreement(
    services,
    seeded,
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
    arbitratorAddress
  );
  await seedApprovedArbitrator(services, arbitratorAddress);

  const submission = await seedCounterpartySellerSubmission(services, seeded, {
    attachmentFileIds: ["dispute-file-1"]
  });
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );

  const dispute = await services.milestonesService.createMilestoneDispute(
    {
      dealMilestoneReviewId: review.review.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      attachmentFileIds: ["dispute-file-1"],
      statementMarkdown: "Buyer disputes the milestone acceptance evidence."
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(dispute.dispute.status, "OPEN");
  assert.equal(dispute.dispute.attachmentFiles.length, 1);
  assert.equal(dispute.dispute.attachmentFiles[0]?.file.id, "dispute-file-1");
  assert.equal(dispute.milestone.state, "DISPUTED");
  assert.equal(dispute.milestone.currentDispute?.id, dispute.dispute.id);

  await expectRejectsWith(
    services.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId: review.review.id,
        dealMilestoneSubmissionId: submission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "milestone review is currently disputed"
  );

  const disputes = await services.milestonesService.listMilestoneDisputes(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(disputes.disputes.length, 1);
  assert.equal(disputes.disputes[0]?.dispute.id, dispute.dispute.id);
  assert.equal(disputes.disputes[0]?.settlementRequest, null);
});

test("milestones service assigns arbitrators and accepts signed dispute resolutions", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");
  const arbitratorAddress = arbitratorAccount.address.toLowerCase() as `0x${string}`;

  await seedActiveAgreement(
    services,
    seeded,
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
    arbitratorAddress
  );
  await seedApprovedArbitrator(services, arbitratorAddress);

  const submission = await seedCounterpartySellerSubmission(services, seeded);
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "REJECTED",
      statementMarkdown: "Buyer rejects the milestone."
    },
    requestMetadata(actor.cookieHeader)
  );
  const dispute = await services.milestonesService.createMilestoneDispute(
    {
      dealMilestoneReviewId: review.review.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      statementMarkdown: "Seller escalates the rejected milestone."
    },
    requestMetadata(actor.cookieHeader)
  );

  const assignment =
    await services.milestonesService.assignMilestoneDisputeArbitrator(
      {
        dealMilestoneDisputeId: dispute.dispute.id,
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        arbitratorAddress
      },
      requestMetadata(actor.cookieHeader)
    );
  const challenge =
    await services.milestonesService.prepareMilestoneDisputeDecision(
      {
        dealMilestoneDisputeId: dispute.dispute.id,
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE",
        statementMarkdown: "Arbitrator orders release of the disputed milestone."
      },
      requestMetadata(actor.cookieHeader)
    );
  const signature = await signMilestoneDisputeDecisionChallenge(challenge);
  const resolution =
    await services.milestonesService.createMilestoneDisputeDecision(
      {
        dealMilestoneDisputeId: dispute.dispute.id,
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE",
        signature,
        statementMarkdown: "Arbitrator orders release of the disputed milestone."
      },
      requestMetadata(actor.cookieHeader)
    );

  assert.equal(assignment.dispute.latestAssignment?.arbitratorAddress, arbitratorAddress);
  assert.equal(challenge.challenge.expectedWalletAddress, arbitratorAddress);
  assert.equal(resolution.dispute.status, "RESOLVED");
  assert.equal(resolution.dispute.latestDecision?.kind, "RELEASE");
  assert.equal(resolution.settlementRequest.source, "ARBITRATOR_DECISION");
  assert.equal(
    resolution.settlementRequest.requestedByArbitratorAddress,
    arbitratorAddress
  );
  assert.equal(resolution.settlementRequest.requestedByUserId, null);
  assert.equal(resolution.milestone.state, "APPROVED");

  const disputes = await services.milestonesService.listMilestoneDisputes(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );
  const timelines = await services.milestonesService.listMilestoneTimelines(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(disputes.disputes[0]?.settlementRequest?.id, resolution.settlementRequest.id);
  assert.deepEqual(
    timelines.milestones[0]?.events.map((event) => event.kind),
    [
      "SUBMISSION_CREATED",
      "REVIEW_REJECTED",
      "DISPUTE_OPENED",
      "DISPUTE_ARBITRATOR_ASSIGNED",
      "DISPUTE_DECISION_SUBMITTED",
      "RELEASE_REQUESTED"
    ]
  );
});

test("milestones service only allows settlement requests for the latest reviewed submission", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "BUYER");

  await seedActiveAgreement(services, seeded);
  const firstSubmission = await seedCounterpartySellerSubmission(services, seeded, {
    submissionNumber: 1
  });
  const review = await services.milestonesService.createMilestoneReview(
    {
      dealMilestoneSubmissionId: firstSubmission.id,
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      decision: "APPROVED"
    },
    requestMetadata(actor.cookieHeader)
  );
  await seedCounterpartySellerSubmission(services, seeded, {
    statementMarkdown: "Superseding evidence package.",
    submissionNumber: 2
  });

  await expectRejectsWith(
    services.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId: review.review.id,
        dealMilestoneSubmissionId: firstSubmission.id,
        dealVersionId: seeded.version.version.id,
        dealVersionMilestoneId: seeded.version.version.milestones[0]!.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        kind: "RELEASE"
      },
      requestMetadata(actor.cookieHeader)
    ),
    "ConflictException",
    "only latest reviewed milestone submission can request settlement"
  );
});

test("milestones service allows seller submissions while draft is partially released", async () => {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const seeded = await seedMilestoneScenario(services, actor, "SELLER");

  await seedActiveAgreement(services, seeded);

  const draftRecord = await services.release1Repositories.draftDeals.findById(
    seeded.draft.draft.id
  );

  assert.ok(draftRecord);
  draftRecord.state = "PARTIALLY_RELEASED";

  const response = await services.milestonesService.createMilestoneSubmission(
    {
      dealVersionId: seeded.version.version.id,
      dealVersionMilestoneId: seeded.version.version.milestones[1]!.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      statementMarkdown: "Remaining milestone delivered."
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(
    response.submission.dealVersionMilestoneId,
    seeded.version.version.milestones[1]!.id
  );
});
