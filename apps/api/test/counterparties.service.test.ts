import test from "node:test";
import assert from "node:assert/strict";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { CounterpartiesService } from "../src/modules/counterparties/counterparties.service";
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

  await repositories.organizationMembers.add({
    createdAt: now,
    id: `member-${options.userId}-${options.organizationId}`,
    organizationId: options.organizationId,
    role: options.role,
    updatedAt: now,
    userId: options.userId
  });
}

function createCounterpartiesService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    counterpartiesService: new CounterpartiesService(
      repositories,
      authenticatedSessionService
    ),
    repositories,
    sessionTokenService
  };
}

test("counterparties service creates, lists, and reads organization-scoped counterparties", async () => {
  const { counterpartiesService, repositories, sessionTokenService } =
    createCounterpartiesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "ADMIN",
    userId: actor.userId
  });

  const created = await counterpartiesService.createCounterparty(
    "org-1",
    {
      contactEmail: "Vendor@Example.com",
      legalName: "Vendor Legal LLC",
      name: "Vendor One"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.counterparty.organizationId, "org-1");
  assert.equal(created.counterparty.contactEmail, "vendor@example.com");
  assert.equal(repositories.counterpartyRecords[0]?.normalizedName, "vendor one");
  assert.equal(repositories.auditLogRecords[0]?.action, "COUNTERPARTY_CREATED");

  const listed = await counterpartiesService.listCounterparties(
    { organizationId: "org-1" },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.counterparties.length, 1);

  const detail = await counterpartiesService.getCounterparty(
    {
      counterpartyId: created.counterparty.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.counterparty.legalName, "Vendor Legal LLC");
});

test("counterparties service rejects duplicate names within the same organization", async () => {
  const { counterpartiesService, repositories, sessionTokenService } =
    createCounterpartiesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "ADMIN",
    userId: actor.userId
  });

  await counterpartiesService.createCounterparty(
    "org-1",
    {
      name: "Vendor One"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await assert.rejects(
    counterpartiesService.createCounterparty(
      "org-1",
      {
        name: "  vendor   one  "
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /counterparty name already exists/
  );
});

test("counterparties service requires admin role for creation and membership for reads", async () => {
  const { counterpartiesService, repositories, sessionTokenService } =
    createCounterpartiesService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const member = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x3333333333333333333333333333333333333333",
    walletId: "wallet-2"
  });

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

  const created = await counterpartiesService.createCounterparty(
    "org-1",
    {
      name: "Vendor One"
    },
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await assert.rejects(
    counterpartiesService.createCounterparty(
      "org-1",
      {
        name: "Vendor Two"
      },
      {
        cookieHeader: member.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization role is insufficient/
  );

  const detail = await counterpartiesService.getCounterparty(
    {
      counterpartyId: created.counterparty.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: member.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.counterparty.name, "Vendor One");
});
