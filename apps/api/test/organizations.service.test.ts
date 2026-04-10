import test from "node:test";
import assert from "node:assert/strict";

import type {
  SessionTokenPayload,
  SessionTokenService
} from "@blockchain-escrow/security";

import { ApprovalRuntimeService } from "../src/modules/approvals/approval-runtime.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import type { AuthConfiguration } from "../src/modules/auth/auth.tokens";
import { OrganizationsService } from "../src/modules/organizations/organizations.service";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease9Repositories } from "./helpers/in-memory-release9-repositories";

const authConfiguration: AuthConfiguration = {
  cookie: {
    httpOnly: true,
    maxAgeSeconds: 60 * 60,
    name: "be_session",
    path: "/",
    sameSite: "lax",
    secure: false
  },
  nonceTtlSeconds: 300,
  sessionTtlSeconds: 60 * 60
};

class FakeSessionTokenService implements SessionTokenService {
  async create(payload: SessionTokenPayload): Promise<string> {
    return `token:${payload.sessionId}`;
  }

  async hash(token: string): Promise<string> {
    return `hash:${token}`;
  }
}

async function seedAuthenticatedActor(
  repositories: InMemoryRelease1Repositories,
  sessionTokenService: SessionTokenService,
  options?: {
    sessionId?: string;
    userId?: string;
    walletAddress?: `0x${string}`;
    walletId?: string;
  }
) {
  const now = new Date().toISOString();
  const userId = options?.userId ?? "user-1";
  const walletId = options?.walletId ?? "wallet-1";
  const walletAddress =
    options?.walletAddress ?? "0x2222222222222222222222222222222222222222";
  const sessionId = options?.sessionId ?? "session-1";
  const token = await sessionTokenService.create({
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    issuedAt: now,
    sessionId,
    userId,
    walletAddress,
    walletId
  });

  await repositories.users.create({
    createdAt: now,
    id: userId,
    updatedAt: now
  });
  await repositories.wallets.create({
    address: walletAddress,
    chainId: 84532,
    createdAt: now,
    id: walletId,
    isPrimary: true,
    updatedAt: now,
    userId
  });
  await repositories.sessions.create({
    createdAt: now,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    id: sessionId,
    lastSeenAt: null,
    revokedAt: null,
    status: "ACTIVE",
    tokenHash: await sessionTokenService.hash(token),
    userId,
    walletId
  });

  return {
    cookieHeader: `be_session=${encodeURIComponent(token)}`,
    sessionId,
    userId,
    walletId,
    walletAddress
  };
}

function createOrganizationsService() {
  const repositories = new InMemoryRelease1Repositories();
  const release9Repositories = new InMemoryRelease9Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    organizationsService: new OrganizationsService(
      repositories,
      authenticatedSessionService,
      new ApprovalRuntimeService(release9Repositories)
    ),
    repositories,
    release9Repositories,
    sessionTokenService
  };
}

test("organizations service creates an organization and lists memberships", async () => {
  const { organizationsService, repositories, sessionTokenService } =
    createOrganizationsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  const created = await organizationsService.createOrganization(
    {
      name: "Acme Procurement",
      slug: "acme-procurement"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.organization.slug, "acme-procurement");
  assert.equal(created.currentMembership.role, "OWNER");
  assert.equal(created.members.length, 1);
  assert.equal(repositories.auditLogRecords[0]?.action, "ORGANIZATION_CREATED");

  const memberships = await organizationsService.listMemberships({
    cookieHeader: actor.cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.equal(memberships.organizations.length, 1);
  assert.equal(memberships.organizations[0]?.organization.id, created.organization.id);
});

test("organizations service creates and revokes an invite", async () => {
  const { organizationsService, repositories, sessionTokenService } =
    createOrganizationsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const created = await organizationsService.createOrganization(
    {
      name: "Acme Procurement",
      slug: "acme-procurement"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const invite = await organizationsService.createInvite(
    created.organization.id,
    {
      email: "member@example.com",
      role: "MEMBER"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(invite.invite.status, "PENDING");
  assert.equal(typeof invite.inviteToken, "string");
  assert.equal(repositories.auditLogRecords[1]?.action, "ORGANIZATION_INVITE_CREATED");

  const detail = await organizationsService.getOrganizationDetail(
    created.organization.id,
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.pendingInvites.length, 1);

  const revoked = await organizationsService.revokeInvite(
    created.organization.id,
    invite.invite.id,
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(revoked.invite.status, "REVOKED");
  assert.deepEqual(
    repositories.auditLogRecords.map((record) => record.action),
    [
      "ORGANIZATION_CREATED",
      "ORGANIZATION_INVITE_CREATED",
      "ORGANIZATION_INVITE_REVOKED"
    ]
  );
});

test("organizations service accepts an invite into a membership", async () => {
  const { organizationsService, repositories, sessionTokenService } =
    createOrganizationsService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const created = await organizationsService.createOrganization(
    {
      name: "Acme Procurement",
      slug: "acme-procurement"
    },
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
  const invite = await organizationsService.createInvite(
    created.organization.id,
    {
      email: "member@example.com",
      role: "MEMBER"
    },
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
  const invitedActor = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x3333333333333333333333333333333333333333",
    walletId: "wallet-2"
  });

  const accepted = await organizationsService.acceptInvite(
    {
      inviteToken: invite.inviteToken
    },
    {
      cookieHeader: invitedActor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(accepted.currentMembership.userId, "user-2");
  assert.equal(accepted.currentMembership.role, "MEMBER");
  assert.equal(accepted.pendingInvites.length, 0);
  assert.deepEqual(
    repositories.auditLogRecords.map((record) => record.action),
    [
      "ORGANIZATION_CREATED",
      "ORGANIZATION_INVITE_CREATED",
      "ORGANIZATION_INVITE_ACCEPTED"
    ]
  );
});

test("organizations service updates a member role and protects the last owner", async () => {
  const { organizationsService, repositories, sessionTokenService } =
    createOrganizationsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const created = await organizationsService.createOrganization(
    {
      name: "Acme Procurement",
      slug: "acme-procurement"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
  const now = new Date().toISOString();

  await repositories.users.create({
    createdAt: now,
    id: "user-2",
    updatedAt: now
  });
  await repositories.organizationMembers.add({
    createdAt: now,
    id: "member-2",
    organizationId: created.organization.id,
    role: "MEMBER",
    updatedAt: now,
    userId: "user-2"
  });

  const updated = await organizationsService.updateMemberRole(
    created.organization.id,
    "member-2",
    {
      role: "ADMIN"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(updated.member.role, "ADMIN");
  assert.equal(
    repositories.auditLogRecords[1]?.action,
    "ORGANIZATION_MEMBER_ROLE_UPDATED"
  );

  await assert.rejects(
    organizationsService.updateMemberRole(
      created.organization.id,
      created.members[0]?.memberId ?? "",
      {
        role: "ADMIN"
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /cannot demote the last owner/
  );
});

test("organizations service removes a member and protects the last owner", async () => {
  const { organizationsService, repositories, sessionTokenService } =
    createOrganizationsService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const created = await organizationsService.createOrganization(
    {
      name: "Acme Procurement",
      slug: "acme-procurement"
    },
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );
  const now = new Date().toISOString();

  await repositories.users.create({
    createdAt: now,
    id: "user-2",
    updatedAt: now
  });
  await repositories.organizationMembers.add({
    createdAt: now,
    id: "member-2",
    organizationId: created.organization.id,
    role: "MEMBER",
    updatedAt: now,
    userId: "user-2"
  });

  const removed = await organizationsService.removeMember(
    created.organization.id,
    "member-2",
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(removed.member.userId, "user-2");
  assert.equal(
    repositories.auditLogRecords[1]?.action,
    "ORGANIZATION_MEMBER_REMOVED"
  );

  await assert.rejects(
    organizationsService.removeMember(created.organization.id, created.members[0]?.memberId ?? "", {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }),
    /cannot remove the last owner/
  );
});
