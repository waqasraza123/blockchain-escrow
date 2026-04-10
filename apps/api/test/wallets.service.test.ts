import test from "node:test";
import assert from "node:assert/strict";

import type { Release12Repositories, WalletProfileRecord } from "@blockchain-escrow/db";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { WalletsService } from "../src/modules/wallets/wallets.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

function createWalletsService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const walletProfiles: WalletProfileRecord[] = [];
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );
  const release12Repositories = {
    walletProfiles: {
      findByWalletId: async (walletId: string) =>
        walletProfiles.find((profile) => profile.walletId === walletId) ?? null,
      listByWalletIds: async (walletIds: string[]) =>
        walletProfiles.filter((profile) => walletIds.includes(profile.walletId)),
      upsert: async (record: WalletProfileRecord) => {
        const existingIndex = walletProfiles.findIndex(
          (profile) => profile.walletId === record.walletId
        );

        if (existingIndex >= 0) {
          walletProfiles[existingIndex] = record;
        } else {
          walletProfiles.push(record);
        }

        return record;
      }
    }
  } as Pick<Release12Repositories, "walletProfiles"> as Release12Repositories;

  return {
    repositories,
    sessionTokenService,
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
