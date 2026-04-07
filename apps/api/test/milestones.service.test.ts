import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import { privateKeyToAccount } from "viem/accounts";

import { AuditService } from "../src/modules/audit/audit.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash
} from "../src/modules/drafts/deal-identity";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { MilestonesService } from "../src/modules/milestones/milestones.service";
import type { MilestoneReviewConfiguration } from "../src/modules/milestones/milestones.tokens";
import type { RequestMetadata } from "../src/modules/auth/auth.http";
import type { FundingReconciliationConfiguration } from "../src/modules/funding/funding.tokens";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";

const counterpartyAccount = privateKeyToAccount(
  "0x8b3a350cf5c34c9194ca7a545d6a76fc4d6f8d4894d3e9d2046df1d5c8d14d14"
);
const alternateCounterpartyAccount = privateKeyToAccount(
  "0x0dbbe8d4c1fdb23f4d4cf8f3668a5985bce4a35d7473f2c452ecf72edb5d2d57"
);
const fundingReconciliationConfiguration: FundingReconciliationConfiguration = {
  indexerFreshnessTtlSeconds: 300,
  pendingStaleAfterSeconds: 3600,
  release4CursorKeyOverride: "release4:base-sepolia"
};
const milestoneReviewConfiguration: MilestoneReviewConfiguration = {
  reviewDeadlineSeconds: 7 * 24 * 60 * 60
};

function requestMetadata(cookieHeader: string): RequestMetadata {
  return {
    cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  };
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

function createServices() {
  const repositories = new InMemoryRelease1Repositories();
  const release4Repositories = new InMemoryRelease4Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    auditService: new AuditService(repositories, authenticatedSessionService),
    draftsService: new DraftsService(
      repositories,
      release4Repositories,
      authenticatedSessionService,
      fundingReconciliationConfiguration
    ),
    milestonesService: new MilestonesService(
      repositories,
      release4Repositories,
      authenticatedSessionService,
      milestoneReviewConfiguration
    ),
    release1Repositories: repositories,
    release4Repositories,
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
  buyerAddress: `0x${string}` = "0x4444444444444444444444444444444444444444"
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
    arbitratorAddress: null,
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
