import test from "node:test";
import assert from "node:assert/strict";

import { ConflictException } from "@nestjs/common";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { WalletsService } from "../src/modules/wallets/wallets.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { createRelease12RepositoriesStub } from "./helpers/release12-test-stub";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

function createWalletsService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );
  const { gasPolicyStore, release12Repositories, walletProfileStore } =
    createRelease12RepositoriesStub();

  return {
    gasPolicyStore,
    repositories,
    release12Repositories,
    sessionTokenService,
    walletProfileStore,
    walletsService: new WalletsService(
      repositories,
      release12Repositories,
      authenticatedSessionService
    )
  };
}

test("wallets service lists and returns only the authenticated user's wallets", async () => {
  const { repositories, sessionTokenService, walletsService } =
    createWalletsService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);
  const now = new Date().toISOString();

  await repositories.wallets.create({
    address: "0x3333333333333333333333333333333333333333",
    chainId: 8453,
    createdAt: new Date(Date.now() + 1000).toISOString(),
    id: "wallet-2",
    isPrimary: false,
    updatedAt: now,
    userId: actor.userId
  });
  await repositories.users.create({
    createdAt: now,
    id: "user-2",
    updatedAt: now
  });
  await repositories.wallets.create({
    address: "0x4444444444444444444444444444444444444444",
    chainId: 84532,
    createdAt: now,
    id: "wallet-3",
    isPrimary: true,
    updatedAt: now,
    userId: "user-2"
  });

  const listed = await walletsService.listWallets({
    cookieHeader: actor.cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.deepEqual(
    listed.wallets.map((wallet) => wallet.id),
    ["wallet-1", "wallet-2"]
  );

  const detail = await walletsService.getWallet("wallet-2", {
    cookieHeader: actor.cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.equal(detail.wallet.address, "0x3333333333333333333333333333333333333333");

  await assert.rejects(
    walletsService.getWallet("wallet-3", {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }),
    /wallet not found/
  );
});

test("wallets service validates default organization and gas policy ownership before upserting a profile", async () => {
  const { gasPolicyStore, repositories, sessionTokenService, walletsService } =
    createWalletsService();
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
  await repositories.organizations.create({
    createdAt: now,
    createdByUserId: actor.userId,
    id: "org-2",
    name: "Other",
    slug: "other",
    updatedAt: now
  });
  gasPolicyStore.set("gas-policy-1", {
    active: true,
    allowedApprovalPolicyKinds: [],
    allowedChainIds: [84532],
    allowedTransactionKinds: ["FUNDING_TRANSACTION_CREATE"],
    createdAt: now,
    createdByUserId: actor.userId,
    description: null,
    id: "gas-policy-1",
    maxAmountMinor: null,
    maxRequestsPerDay: 5,
    name: "Main policy",
    organizationId: "org-1",
    sponsorWindowMinutes: 30,
    updatedAt: now
  });
  gasPolicyStore.set("gas-policy-2", {
    active: false,
    allowedApprovalPolicyKinds: [],
    allowedChainIds: [84532],
    allowedTransactionKinds: ["FUNDING_TRANSACTION_CREATE"],
    createdAt: now,
    createdByUserId: actor.userId,
    description: null,
    id: "gas-policy-2",
    maxAmountMinor: null,
    maxRequestsPerDay: 5,
    name: "Inactive policy",
    organizationId: "org-1",
    sponsorWindowMinutes: 30,
    updatedAt: now
  });

  await assert.rejects(
    walletsService.upsertWalletProfile(
      actor.walletId,
      {
        defaultOrganizationId: "org-2",
        displayName: "Actor wallet"
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /default organization not found/
  );

  await assert.rejects(
    walletsService.upsertWalletProfile(
      actor.walletId,
      {
        defaultGasPolicyId: "gas-policy-2",
        defaultOrganizationId: "org-1",
        displayName: "Actor wallet"
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    ConflictException
  );

  await assert.rejects(
    walletsService.upsertWalletProfile(
      actor.walletId,
      {
        defaultGasPolicyId: "gas-policy-1",
        defaultOrganizationId: "org-2",
        displayName: "Actor wallet"
      },
      {
        cookieHeader: actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    ),
    /default organization not found/
  );
});

test("wallets service upserts wallet profiles and appends wallet audit logs", async () => {
  const { gasPolicyStore, repositories, sessionTokenService, walletProfileStore, walletsService } =
    createWalletsService();
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
  gasPolicyStore.set("gas-policy-1", {
    active: true,
    allowedApprovalPolicyKinds: [],
    allowedChainIds: [84532],
    allowedTransactionKinds: ["FUNDING_TRANSACTION_CREATE"],
    createdAt: now,
    createdByUserId: actor.userId,
    description: null,
    id: "gas-policy-1",
    maxAmountMinor: null,
    maxRequestsPerDay: 5,
    name: "Main policy",
    organizationId: "org-1",
    sponsorWindowMinutes: 30,
    updatedAt: now
  });
  walletProfileStore.set(actor.walletId, {
    approvalNoteTemplate: null,
    createdAt: now,
    defaultGasPolicyId: null,
    defaultOrganizationId: null,
    displayName: "Old name",
    reviewNoteTemplate: null,
    sponsorTransactionsByDefault: false,
    updatedAt: now,
    walletId: actor.walletId
  });

  const response = await walletsService.upsertWalletProfile(
    actor.walletId,
    {
      approvalNoteTemplate: "Approve quickly",
      defaultGasPolicyId: "gas-policy-1",
      defaultOrganizationId: "org-1",
      displayName: "Treasury wallet",
      reviewNoteTemplate: "Review carefully",
      sponsorTransactionsByDefault: true
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(response.profile.displayName, "Treasury wallet");
  assert.equal(response.profile.defaultGasPolicyId, "gas-policy-1");
  assert.equal(response.profile.defaultOrganizationId, "org-1");
  assert.equal(response.profile.sponsorTransactionsByDefault, true);
  assert.equal(repositories.auditLogRecords.length, 1);
  assert.equal(repositories.auditLogRecords[0]?.action, "WALLET_PROFILE_UPDATED");
  assert.equal(repositories.auditLogRecords[0]?.entityId, actor.walletId);
  assert.equal(repositories.auditLogRecords[0]?.entityType, "WALLET");
  assert.deepEqual(repositories.auditLogRecords[0]?.metadata, {
    nextProfile: {
      approvalNoteTemplate: "Approve quickly",
      defaultGasPolicyId: "gas-policy-1",
      defaultOrganizationId: "org-1",
      displayName: "Treasury wallet",
      reviewNoteTemplate: "Review carefully",
      sponsorTransactionsByDefault: true
    },
    previousProfile: {
      approvalNoteTemplate: null,
      defaultGasPolicyId: null,
      defaultOrganizationId: null,
      displayName: "Old name",
      reviewNoteTemplate: null,
      sponsorTransactionsByDefault: false
    }
  });
});
