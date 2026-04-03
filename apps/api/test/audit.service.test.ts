import test from "node:test";
import assert from "node:assert/strict";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { AuditService } from "../src/modules/audit/audit.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

function createAuditService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    auditService: new AuditService(repositories, authenticatedSessionService),
    repositories,
    sessionTokenService
  };
}

test("audit service lists wallet logs for the authenticated user across address and id records", async () => {
  const { auditService, repositories, sessionTokenService } = createAuditService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = Date.now();

  await repositories.auditLogs.append({
    action: "AUTH_NONCE_ISSUED",
    actorUserId: null,
    entityId: actor.walletAddress,
    entityType: "WALLET",
    id: "audit-1",
    ipAddress: "127.0.0.1",
    metadata: null,
    occurredAt: new Date(now).toISOString(),
    organizationId: null,
    userAgent: "test-agent"
  });
  await repositories.auditLogs.append({
    action: "AUTH_SESSION_VERIFIED",
    actorUserId: actor.userId,
    entityId: actor.walletId,
    entityType: "WALLET",
    id: "audit-2",
    ipAddress: "127.0.0.1",
    metadata: null,
    occurredAt: new Date(now + 1000).toISOString(),
    organizationId: null,
    userAgent: "test-agent"
  });

  const response = await auditService.listByEntity(
    {
      entityId: actor.walletId,
      entityType: "WALLET"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.deepEqual(
    response.auditLogs.map((record) => record.id),
    ["audit-1", "audit-2"]
  );
});

test("audit service enforces audit access to a user's own sessions only", async () => {
  const { auditService, repositories, sessionTokenService } = createAuditService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x5555555555555555555555555555555555555555",
    walletId: "wallet-2"
  });

  await assert.rejects(
    auditService.listByEntity(
      {
        entityId: "session-2",
        entityType: "SESSION"
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /session audit access is required/
  );
});

test("audit service lists organization invite logs for organization members", async () => {
  const { auditService, repositories, sessionTokenService } = createAuditService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await repositories.organizations.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "org-1",
    name: "Acme",
    slug: "acme",
    updatedAt: now
  });
  await repositories.organizationMembers.add({
    createdAt: now,
    id: "member-1",
    organizationId: "org-1",
    role: "OWNER",
    updatedAt: now,
    userId: actor.userId
  });
  await repositories.organizationInvites.create({
    acceptedAt: null,
    createdAt: now,
    email: "invitee@example.com",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    id: "invite-1",
    invitedByUserId: actor.userId,
    organizationId: "org-1",
    role: "MEMBER",
    status: "PENDING",
    tokenHash: "token-hash",
    updatedAt: now
  });
  await repositories.auditLogs.append({
    action: "ORGANIZATION_INVITE_CREATED",
    actorUserId: actor.userId,
    entityId: "invite-1",
    entityType: "ORGANIZATION_INVITE",
    id: "audit-3",
    ipAddress: "127.0.0.1",
    metadata: {
      email: "invitee@example.com"
    },
    occurredAt: now,
    organizationId: "org-1",
    userAgent: "test-agent"
  });

  const response = await auditService.listByEntity(
    {
      entityId: "invite-1",
      entityType: "ORGANIZATION_INVITE"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(response.auditLogs.length, 1);
  assert.equal(response.auditLogs[0]?.action, "ORGANIZATION_INVITE_CREATED");
});

test("audit service lists counterparty logs for organization members", async () => {
  const { auditService, repositories, sessionTokenService } = createAuditService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await repositories.organizations.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "org-1",
    name: "Acme",
    slug: "acme",
    updatedAt: now
  });
  await repositories.organizationMembers.add({
    createdAt: now,
    id: "member-1",
    organizationId: "org-1",
    role: "OWNER",
    updatedAt: now,
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
  await repositories.auditLogs.append({
    action: "COUNTERPARTY_CREATED",
    actorUserId: actor.userId,
    entityId: "counterparty-1",
    entityType: "COUNTERPARTY",
    id: "audit-4",
    ipAddress: "127.0.0.1",
    metadata: {
      name: "Vendor One"
    },
    occurredAt: now,
    organizationId: "org-1",
    userAgent: "test-agent"
  });

  const response = await auditService.listByEntity(
    {
      entityId: "counterparty-1",
      entityType: "COUNTERPARTY"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(response.auditLogs.length, 1);
  assert.equal(response.auditLogs[0]?.action, "COUNTERPARTY_CREATED");
});

test("audit service lists file logs for organization members", async () => {
  const { auditService, repositories, sessionTokenService } = createAuditService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await repositories.organizations.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "org-1",
    name: "Acme",
    slug: "acme",
    updatedAt: now
  });
  await repositories.organizationMembers.add({
    createdAt: now,
    id: "member-1",
    organizationId: "org-1",
    role: "OWNER",
    updatedAt: now,
    userId: actor.userId
  });
  await repositories.files.create({
    byteSize: 512,
    category: "GENERAL",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "file-1",
    mediaType: "text/plain",
    organizationId: "org-1",
    originalFilename: "notes.txt",
    sha256Hex:
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    storageKey: "orgs/org-1/general/notes.txt",
    updatedAt: now
  });
  await repositories.auditLogs.append({
    action: "FILE_CREATED",
    actorUserId: actor.userId,
    entityId: "file-1",
    entityType: "FILE",
    id: "audit-5",
    ipAddress: "127.0.0.1",
    metadata: {
      originalFilename: "notes.txt"
    },
    occurredAt: now,
    organizationId: "org-1",
    userAgent: "test-agent"
  });

  const response = await auditService.listByEntity(
    {
      entityId: "file-1",
      entityType: "FILE"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(response.auditLogs.length, 1);
  assert.equal(response.auditLogs[0]?.action, "FILE_CREATED");
});
