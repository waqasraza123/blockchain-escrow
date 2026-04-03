import test from "node:test";
import assert from "node:assert/strict";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

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

function createDraftsService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    draftsService: new DraftsService(repositories, authenticatedSessionService),
    repositories,
    sessionTokenService
  };
}

test("drafts service creates a draft, links template/counterparty, and lists it", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    name: "Acme Procurement",
    organizationId: "org-1",
    role: "ADMIN",
    slug: "acme-procurement",
    userId: actor.userId
  });
  await repositories.counterparties.create({
    contactEmail: "vendor@example.com",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "counterparty-1",
    legalName: "Vendor Legal LLC",
    name: "Vendor One",
    normalizedName: "vendor one",
    organizationId: "org-1",
    updatedAt: now
  });
  await repositories.templates.create({
    bodyMarkdown: "# Master Template",
    createdAt: now,
    createdByUserId: actor.userId,
    defaultCounterpartyId: null,
    description: "Base template",
    id: "template-1",
    name: "Software Delivery",
    normalizedName: "software delivery",
    organizationId: "org-1",
    updatedAt: now
  });

  const created = await draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole: "BUYER",
      settlementCurrency: "USDC",
      summary: "Website rebuild with milestone escrow",
      templateId: "template-1",
      title: "Website Rebuild"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.draft.title, "Website Rebuild");
  assert.equal(created.draft.templateId, "template-1");
  assert.equal(created.parties.length, 2);
  assert.equal(created.parties[0]?.role, "BUYER");
  assert.equal(created.parties[1]?.counterpartyId, "counterparty-1");
  assert.equal(repositories.auditLogRecords[0]?.action, "DRAFT_DEAL_CREATED");

  const listed = await draftsService.listDrafts(
    { organizationId: "org-1" },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.drafts.length, 1);
  assert.equal(listed.drafts[0]?.latestVersion, null);
});

test("drafts service creates immutable version snapshots with milestones and files", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    name: "Acme Procurement",
    organizationId: "org-1",
    role: "OWNER",
    slug: "acme-procurement",
    userId: actor.userId
  });
  await repositories.counterparties.create({
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
  await repositories.templates.create({
    bodyMarkdown: "# Delivery Template",
    createdAt: now,
    createdByUserId: actor.userId,
    defaultCounterpartyId: "counterparty-1",
    description: null,
    id: "template-1",
    name: "Delivery Template",
    normalizedName: "delivery template",
    organizationId: "org-1",
    updatedAt: now
  });
  await repositories.files.create({
    byteSize: 1024,
    category: "DRAFT_ATTACHMENT",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "file-1",
    mediaType: "application/pdf",
    organizationId: "org-1",
    originalFilename: "scope.pdf",
    sha256Hex:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    storageKey: "orgs/org-1/drafts/scope.pdf",
    updatedAt: now
  });

  const createdDraft = await draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole: "BUYER",
      settlementCurrency: "USDC",
      templateId: "template-1",
      title: "Website Rebuild"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const createdVersion = await draftsService.createVersionSnapshot(
    {
      draftDealId: createdDraft.draft.id,
      organizationId: "org-1"
    },
    {
      attachmentFileIds: ["file-1"],
      bodyMarkdown: "# Final terms",
      milestoneSnapshots: [
        {
          amountMinor: "1000000",
          dueAt: "2026-05-01T00:00:00.000Z",
          title: "Design phase"
        },
        {
          amountMinor: "2000000",
          description: "Implement frontend and backend",
          title: "Build phase"
        }
      ],
      title: "Website Rebuild v1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(createdVersion.version.versionNumber, 1);
  assert.equal(createdVersion.version.files.length, 1);
  assert.equal(createdVersion.version.milestones.length, 2);
  assert.equal(createdVersion.version.parties.length, 2);
  assert.equal(repositories.auditLogRecords[1]?.action, "DEAL_VERSION_CREATED");

  const secondVersion = await draftsService.createVersionSnapshot(
    {
      draftDealId: createdDraft.draft.id,
      organizationId: "org-1"
    },
    {
      bodyMarkdown: "# Revised terms",
      milestoneSnapshots: [
        {
          amountMinor: "3000000",
          title: "Single phase"
        }
      ]
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(secondVersion.version.versionNumber, 2);

  const detail = await draftsService.getDraft(
    {
      draftDealId: createdDraft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.versions.length, 2);
  assert.equal(detail.versions[0]?.versionNumber, 1);
  assert.equal(detail.versions[1]?.versionNumber, 2);
});

test("drafts service enforces organization scoping for counterparties, templates, files, and roles", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const member = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x8888888888888888888888888888888888888888",
    walletId: "wallet-2"
  });
  const now = new Date().toISOString();

  await seedOrganizationMembership(repositories, {
    createdByUserId: owner.userId,
    organizationId: "org-1",
    role: "OWNER",
    userId: owner.userId
  });
  await seedOrganizationMembership(repositories, {
    createdByUserId: owner.userId,
    organizationId: "org-1",
    role: "MEMBER",
    userId: member.userId
  });
  await seedOrganizationMembership(repositories, {
    createdByUserId: owner.userId,
    organizationId: "org-2",
    role: "OWNER",
    userId: owner.userId
  });
  await repositories.counterparties.create({
    contactEmail: null,
    createdAt: now,
    createdByUserId: owner.userId,
    id: "counterparty-2",
    legalName: null,
    name: "External Vendor",
    normalizedName: "external vendor",
    organizationId: "org-2",
    updatedAt: now
  });
  await repositories.files.create({
    byteSize: 512,
    category: "GENERAL",
    createdAt: now,
    createdByUserId: owner.userId,
    id: "file-2",
    mediaType: "text/plain",
    organizationId: "org-2",
    originalFilename: "other.txt",
    sha256Hex:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    storageKey: "orgs/org-2/general/other.txt",
    updatedAt: now
  });

  await assert.rejects(
    draftsService.createDraft(
      "org-1",
      {
        counterpartyId: "counterparty-2",
        organizationRole: "BUYER",
        settlementCurrency: "USDC",
        title: "Invalid Draft"
      },
      {
        cookieHeader: owner.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /counterparty not found/
  );

  await assert.rejects(
    draftsService.createDraft(
      "org-1",
      {
        counterpartyId: "counterparty-2",
        organizationRole: "BUYER",
        settlementCurrency: "USDC",
        title: "Member Draft"
      },
      {
        cookieHeader: member.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization role is insufficient/
  );
});
