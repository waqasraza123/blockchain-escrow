import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";

import { AuditService } from "../src/modules/audit/audit.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash
} from "../src/modules/drafts/deal-identity";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { MilestonesService } from "../src/modules/milestones/milestones.service";
import type { RequestMetadata } from "../src/modules/auth/auth.http";
import type { FundingReconciliationConfiguration } from "../src/modules/funding/funding.tokens";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";

const fundingReconciliationConfiguration: FundingReconciliationConfiguration = {
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
      authenticatedSessionService
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

async function expectRejectsWith<T extends Error>(
  action: Promise<unknown>,
  expectedClass: Function & { prototype: T },
  expectedMessage: string
) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof expectedClass);
    assert.equal((error as T).message, expectedMessage);
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
  assert.equal(secondSubmission.submission.submissionNumber, 2);
  assert.equal(secondSubmission.submission.attachmentFiles[0]?.id, "file-2");
  assert.equal(secondSubmission.milestone.state, "SUBMITTED");
  assert.equal(secondSubmission.milestone.submissions.length, 2);

  const listedAfter = await services.milestonesService.listMilestoneWorkflows(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    requestMetadata(actor.cookieHeader)
  );

  assert.equal(listedAfter.milestones[0]?.state, "SUBMITTED");
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
    ForbiddenException,
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
    ConflictException,
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
    NotFoundException,
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
    BadRequestException,
    "attachment file ids must be unique"
  );
});
