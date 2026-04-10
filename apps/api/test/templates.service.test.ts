import test from "node:test";
import assert from "node:assert/strict";

import { ApprovalRuntimeService } from "../src/modules/approvals/approval-runtime.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { TemplatesService } from "../src/modules/templates/templates.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease9Repositories } from "./helpers/in-memory-release9-repositories";

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
      slug: options.organizationId,
      updatedAt: now
    });
  }

  await repositories.organizationMembers.add({
    createdAt: now,
    id: `member-${options.userId}-${options.organizationId}`,
    organizationId: options.organizationId,
    role: options.role,
    updatedAt: now,
    userId: options.userId
  });
}

function createTemplatesService() {
  const repositories = new InMemoryRelease1Repositories();
  const release9Repositories = new InMemoryRelease9Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    repositories,
    release9Repositories,
    sessionTokenService,
    templatesService: new TemplatesService(
      repositories,
      authenticatedSessionService,
      new ApprovalRuntimeService(release9Repositories)
    )
  };
}

test("templates service creates, lists, and reads organization templates", async () => {
  const { repositories, sessionTokenService, templatesService } =
    createTemplatesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "ADMIN",
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

  const created = await templatesService.createTemplate(
    "org-1",
    {
      bodyMarkdown: "## Scope\nDeliver the milestone.",
      defaultCounterpartyId: "counterparty-1",
      description: "Baseline software project template",
      name: "Software Delivery"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.template.defaultCounterpartyId, "counterparty-1");
  assert.equal(repositories.templateRecords[0]?.normalizedName, "software delivery");
  assert.equal(repositories.auditLogRecords[0]?.action, "TEMPLATE_CREATED");

  const listed = await templatesService.listTemplates(
    { organizationId: "org-1" },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.templates.length, 1);

  const detail = await templatesService.getTemplate(
    {
      organizationId: "org-1",
      templateId: created.template.id
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.template.bodyMarkdown, "## Scope\nDeliver the milestone.");
});

test("templates service rejects duplicate names within an organization", async () => {
  const { repositories, sessionTokenService, templatesService } =
    createTemplatesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "ADMIN",
    userId: actor.userId
  });

  await templatesService.createTemplate(
    "org-1",
    {
      bodyMarkdown: "Body",
      name: "Master Services"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await assert.rejects(
    templatesService.createTemplate(
      "org-1",
      {
        bodyMarkdown: "Another Body",
        name: "  master   services "
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /template name already exists/
  );
});

test("templates service requires admin creation and same-org default counterparties", async () => {
  const { repositories, sessionTokenService, templatesService } =
    createTemplatesService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const member = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x7777777777777777777777777777777777777777",
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
  await repositories.organizations.create({
    createdAt: now,
    createdByUserId: owner.userId,
    id: "org-2",
    name: "Beta Procurement",
    slug: "org-2",
    updatedAt: now
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

  await assert.rejects(
    templatesService.createTemplate(
      "org-1",
      {
        bodyMarkdown: "Body",
        name: "Member Template"
      },
      {
        cookieHeader: member.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization role is insufficient/
  );

  await assert.rejects(
    templatesService.createTemplate(
      "org-1",
      {
        bodyMarkdown: "Body",
        defaultCounterpartyId: "counterparty-2",
        name: "Invalid Counterparty"
      },
      {
        cookieHeader: owner.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /counterparty not found/
  );
});
