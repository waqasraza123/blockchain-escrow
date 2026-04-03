import test from "node:test";
import assert from "node:assert/strict";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { FilesService } from "../src/modules/files/files.service";
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

function createFilesService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    filesService: new FilesService(repositories, authenticatedSessionService),
    repositories,
    sessionTokenService
  };
}

test("files service creates, lists, and reads organization file metadata", async () => {
  const { filesService, repositories, sessionTokenService } = createFilesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "MEMBER",
    userId: actor.userId
  });

  const created = await filesService.createFile(
    "org-1",
    {
      byteSize: 1024,
      category: "DRAFT_ATTACHMENT",
      mediaType: "application/pdf",
      originalFilename: "scope-of-work.pdf",
      sha256Hex:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      storageKey: "orgs/org-1/drafts/scope-of-work.pdf"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.file.organizationId, "org-1");
  assert.equal(created.file.category, "DRAFT_ATTACHMENT");
  assert.equal(repositories.auditLogRecords[0]?.action, "FILE_CREATED");

  const listed = await filesService.listFiles(
    { organizationId: "org-1" },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.files.length, 1);

  const detail = await filesService.getFile(
    {
      fileId: created.file.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(detail.file.originalFilename, "scope-of-work.pdf");
});

test("files service rejects duplicate storage keys within an organization", async () => {
  const { filesService, repositories, sessionTokenService } = createFilesService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  await seedOrganizationMembership(repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "MEMBER",
    userId: actor.userId
  });

  const payload = {
    byteSize: 1024,
    category: "GENERAL" as const,
    mediaType: "text/plain",
    originalFilename: "notes.txt",
    sha256Hex:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    storageKey: "orgs/org-1/general/notes.txt"
  };

  await filesService.createFile("org-1", payload, {
    cookieHeader: actor.cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  await assert.rejects(
    filesService.createFile("org-1", payload, {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }),
    /file storage key already exists/
  );
});

test("files service enforces organization membership and org scoping", async () => {
  const { filesService, repositories, sessionTokenService } = createFilesService();
  const owner = await seedAuthenticatedActor(repositories, sessionTokenService);
  const outsider = await seedAuthenticatedActor(repositories, sessionTokenService, {
    sessionId: "session-2",
    userId: "user-2",
    walletAddress: "0x6666666666666666666666666666666666666666",
    walletId: "wallet-2"
  });

  await seedOrganizationMembership(repositories, {
    createdByUserId: owner.userId,
    organizationId: "org-1",
    role: "OWNER",
    userId: owner.userId
  });

  const created = await filesService.createFile(
    "org-1",
    {
      byteSize: 2048,
      category: "EVIDENCE",
      mediaType: "image/png",
      originalFilename: "screenshot.png",
      sha256Hex:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      storageKey: "orgs/org-1/evidence/screenshot.png"
    },
    {
      cookieHeader: owner.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await assert.rejects(
    filesService.listFiles(
      { organizationId: "org-1" },
      {
        cookieHeader: outsider.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization access is required/
  );

  await assert.rejects(
    filesService.getFile(
      {
        fileId: created.file.id,
        organizationId: "org-2"
      },
      {
        cookieHeader: owner.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /organization not found/
  );
});
