import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import { UnauthorizedException } from "@nestjs/common";
import { privateKeyToAccount } from "viem/accounts";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { buildCanonicalDealId } from "../src/modules/drafts/deal-identity";
import { DraftsService } from "../src/modules/drafts/drafts.service";
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
  const release4Repositories = new InMemoryRelease4Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    draftsService: new DraftsService(
      repositories,
      release4Repositories,
      authenticatedSessionService
    ),
    repositories,
    release4Repositories,
    sessionTokenService
  };
}

async function seedDraftVersionScenario(
  draftsService: DraftsService,
  repositories: InMemoryRelease1Repositories,
  actor: {
    cookieHeader: string;
    userId: string;
  }
) {
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

  const draft = await draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole: "BUYER",
      settlementCurrency: "USDC",
      title: "Website Rebuild"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
  const version = await draftsService.createVersionSnapshot(
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
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  return {
    draft,
    version
  };
}

async function createOrganizationAcceptance(
  draftsService: DraftsService,
  seeded: Awaited<ReturnType<typeof seedDraftVersionScenario>>,
  actor: {
    cookieHeader: string;
  }
) {
  return draftsService.createVersionAcceptance(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      scheme: "EIP712",
      signature: "0xabcdef1234567890",
      typedData: {
        domain: {
          chainId: 84532,
          name: "Blockchain Escrow",
          version: "1"
        },
        message: {
          dealVersionId: seeded.version.version.id,
          intent: "ACCEPT_DEAL_VERSION"
        },
        primaryType: "DealVersionAcceptance",
        types: {
          DealVersionAcceptance: [
            { name: "dealVersionId", type: "string" },
            { name: "intent", type: "string" }
          ]
        }
      }
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
}

async function getCounterpartyChallenge(
  draftsService: DraftsService,
  seeded: Awaited<ReturnType<typeof seedDraftVersionScenario>>
) {
  return draftsService.getCounterpartyAcceptance({
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    organizationId: "org-1"
  });
}

async function signCounterpartyChallenge(
  challenge: Awaited<ReturnType<typeof getCounterpartyChallenge>>,
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

async function createCounterpartyAcceptance(
  draftsService: DraftsService,
  seeded: Awaited<ReturnType<typeof seedDraftVersionScenario>>,
  actor: {
    cookieHeader: string;
  },
  signer = counterpartyAccount
) {
  await draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const challenge = await getCounterpartyChallenge(draftsService, seeded);
  const signature = await signCounterpartyChallenge(challenge, signer);

  return draftsService.createCounterpartyAcceptance(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    { signature }
  );
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
  assert.equal(created.draft.escrow, null);
  assert.equal(created.draft.funding.trackedTransactionCount, 0);
  assert.equal(created.draft.funding.latestStatus, null);
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
  assert.equal(listed.drafts[0]?.draft.escrow, null);
  assert.equal(listed.drafts[0]?.draft.funding.trackedTransactionCount, 0);
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

test("drafts service creates and lists immutable typed acceptances for the organization-side party", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  const created = await createOrganizationAcceptance(draftsService, seeded, actor);

  assert.equal(created.acceptance.party.subjectType, "ORGANIZATION");
  assert.equal(created.acceptance.party.role, "BUYER");
  assert.equal(created.acceptance.signerWalletId, actor.walletId);
  assert.equal(
    repositories.auditLogRecords[2]?.action,
    "DEAL_VERSION_ACCEPTANCE_CREATED"
  );

  const listed = await draftsService.listVersionAcceptances(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.acceptances.length, 1);
  assert.equal(listed.acceptances[0]?.id, created.acceptance.id);
});

test("drafts service exposes a counterparty acceptance challenge and stores a verified signature", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  const challenge = await createCounterpartyAcceptance(draftsService, seeded, actor);

  assert.equal(challenge.acceptance.party.subjectType, "COUNTERPARTY");
  assert.equal(challenge.acceptance.party.role, "SELLER");
  assert.equal(
    challenge.acceptance.signerWalletAddress,
    counterpartyAccount.address.toLowerCase()
  );
  assert.equal(
    repositories.auditLogRecords.at(-1)?.action,
    "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE_CREATED"
  );

  const stored = await getCounterpartyChallenge(draftsService, seeded);

  assert.equal(
    stored.challenge.expectedWalletAddress,
    counterpartyAccount.address.toLowerCase()
  );
  assert.equal(stored.acceptance?.id, challenge.acceptance.id);
});

test("drafts service rejects an invalid counterparty acceptance signature", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const challenge = await getCounterpartyChallenge(draftsService, seeded);
  const invalidSignature = await signCounterpartyChallenge(
    challenge,
    alternateCounterpartyAccount
  );

  await assert.rejects(
    draftsService.createCounterpartyAcceptance(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      { signature: invalidSignature }
    ),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      error.message === "invalid counterparty acceptance signature"
  );
});

test("drafts service advances to awaiting funding after both acceptances and resets on a new version", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await createOrganizationAcceptance(draftsService, seeded, actor);
  await createCounterpartyAcceptance(draftsService, seeded, actor);

  const acceptedDraft = await draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(acceptedDraft.draft.state, "AWAITING_FUNDING");

  await draftsService.createVersionSnapshot(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      bodyMarkdown: "# Revised terms",
      milestoneSnapshots: [
        {
          amountMinor: "1500000",
          title: "Replacement phase"
        }
      ]
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const revisedDraft = await draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(revisedDraft.draft.state, "DRAFT");
  assert.equal(revisedDraft.versions.at(-1)?.versionNumber, 2);
});

test("drafts service updates the draft counterparty wallet", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  const updated = await draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(
    updated.party.walletAddress,
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  assert.equal(
    repositories.auditLogRecords.at(-1)?.action,
    "DRAFT_DEAL_COUNTERPARTY_WALLET_UPDATED"
  );

  const draft = await draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const counterpartyParty = draft.parties.find(
    (party) => party.subjectType === "COUNTERPARTY"
  );
  assert.equal(
    counterpartyParty?.walletAddress,
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
});

test("drafts service prevents duplicate acceptances for the same organization-side party", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const secondActor = await seedAuthenticatedActor(
    repositories,
    sessionTokenService,
    {
      sessionId: "session-2",
      userId: "user-2",
      walletAddress: "0x9999999999999999999999999999999999999999",
      walletId: "wallet-2"
    }
  );
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "MEMBER",
    userId: secondActor.userId
  });

  await draftsService.createVersionAcceptance(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      scheme: "EIP712",
      signature: "0x1111",
      typedData: {
        message: {
          dealVersionId: seeded.version.version.id
        }
      }
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await assert.rejects(
    draftsService.createVersionAcceptance(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        scheme: "EIP712",
        signature: "0x2222",
        typedData: {
          message: {
            dealVersionId: seeded.version.version.id
          }
        }
      },
      {
        cookieHeader: secondActor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /deal version acceptance already exists/
  );
});

test("drafts service enforces organization scoping for version acceptances", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const outsider = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    walletId: "wallet-2"
  });
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await seedOrganizationMembership(repositories, {
    createdByUserId: outsider.userId,
    organizationId: "org-2",
    role: "OWNER",
    userId: outsider.userId
  });

  await assert.rejects(
    draftsService.createVersionAcceptance(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        scheme: "EIP712",
        signature: "0x3333",
        typedData: {
          message: {
            dealVersionId: seeded.version.version.id
          }
        }
      },
      {
        cookieHeader: outsider.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization access is required/
  );
});

test("drafts service marks a draft active after a linked agreement is indexed", async () => {
  const { draftsService, release4Repositories, repositories, sessionTokenService } =
    createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);
  const manifest = getDeploymentManifestByChainId(84532);

  assert.ok(manifest, "missing base sepolia manifest");

  await release4Repositories.escrowAgreements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: actor.walletAddress,
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    factoryAddress: manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    initializedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: new Date().toISOString(),
    initializedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    milestoneCount: 1,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    sellerAddress: counterpartyAccount.address.toLowerCase() as `0x${string}`,
    settlementTokenAddress: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount: "1000000",
    updatedAt: new Date().toISOString()
  });

  const detail = await draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.draft.state, "ACTIVE");
  assert.equal(
    detail.draft.escrow?.agreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(detail.draft.escrow?.chainId, 84532);
});

test("drafts service blocks new version snapshots after funding starts", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    id: "funding-tx-1",
    organizationId: "org-1",
    submittedAt: new Date().toISOString(),
    submittedByUserId: actor.userId,
    submittedWalletAddress: actor.walletAddress,
    submittedWalletId: actor.walletId,
    transactionHash:
      "0x9999999999999999999999999999999999999999999999999999999999999999"
  });

  await assert.rejects(
    () =>
      draftsService.createVersionSnapshot(
        {
          draftDealId: seeded.draft.draft.id,
          organizationId: "org-1"
        },
        {
          bodyMarkdown: "# Revised terms",
          milestoneSnapshots: [
            {
              amountMinor: "1000000",
              title: "Updated phase"
            }
          ]
        },
        {
          cookieHeader: actor.cookieHeader,
          ipAddress: "127.0.0.1",
          userAgent: "test-agent"
        }
    ),
    /funding is already in progress/
  );
});

test("drafts service exposes tracked funding progress on detail responses", async () => {
  const { draftsService, repositories, sessionTokenService } = createDraftsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const seeded = await seedDraftVersionScenario(draftsService, repositories, actor);

  await repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    id: "funding-tx-2",
    organizationId: "org-1",
    submittedAt: "2026-04-06T12:00:00.000Z",
    submittedByUserId: actor.userId,
    submittedWalletAddress: actor.walletAddress,
    submittedWalletId: actor.walletId,
    transactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212"
  });

  const detail = await draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.draft.funding.trackedTransactionCount, 1);
  assert.equal(detail.draft.funding.latestStatus, "PENDING");
  assert.equal(detail.draft.funding.latestSubmittedAt, "2026-04-06T12:00:00.000Z");
  assert.equal(detail.versions[0]?.fundingTransactions.length, 1);
  assert.equal(detail.versions[0]?.fundingTransactions[0]?.status, "PENDING");
  assert.equal(
    detail.versions[0]?.fundingTransactions[0]?.transactionHash,
    "0x1212121212121212121212121212121212121212121212121212121212121212"
  );
});
