import type {
  SessionTokenPayload,
  SessionTokenService
} from "@blockchain-escrow/security";

import type { AuthConfiguration } from "../../src/modules/auth/auth.tokens";
import { InMemoryRelease1Repositories } from "./in-memory-release1-repositories";

export const authConfiguration: AuthConfiguration = {
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

export class FakeSessionTokenService implements SessionTokenService {
  async create(payload: SessionTokenPayload): Promise<string> {
    return `token:${payload.sessionId}`;
  }

  async hash(token: string): Promise<string> {
    return `hash:${token}`;
  }
}

export async function seedAuthenticatedActor(
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
    walletAddress,
    walletId
  };
}
