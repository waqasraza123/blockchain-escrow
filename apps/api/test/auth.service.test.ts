import test from "node:test";
import assert from "node:assert/strict";

import type {
  SessionTokenPayload,
  SessionTokenService,
  SiweVerificationInput,
  SiweVerifier
} from "@blockchain-escrow/security";

import { AuthService } from "../src/modules/auth/auth.service";
import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import type { AuthConfiguration } from "../src/modules/auth/auth.tokens";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

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

class FakeSiweVerifier implements SiweVerifier {
  async verify(input: SiweVerificationInput) {
    return {
      chainId: input.chainId,
      domain: "localhost:3000",
      expirationTime: null,
      issuedAt: null,
      nonce: input.nonce,
      uri: "http://localhost:3000",
      walletAddress: input.walletAddress
    };
  }
}

function createAuthService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );
  const authService = new AuthService(
    repositories,
    authConfiguration,
    sessionTokenService,
    authenticatedSessionService,
    new FakeSiweVerifier()
  );

  return {
    authService,
    repositories
  };
}

test("auth service issues a nonce, verifies a session, reads me, and logs out", async () => {
  const { authService, repositories } = createAuthService();
  const walletAddress = "0x1111111111111111111111111111111111111111";

  const nonceResponse = await authService.issueNonce(
    {
      chainId: 84532,
      walletAddress
    },
    {
      cookieHeader: null,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(typeof nonceResponse.nonce, "string");
  assert.equal(repositories.walletNonceRecords.length, 1);
  assert.equal(repositories.auditLogRecords[0]?.action, "AUTH_NONCE_ISSUED");

  const verifyResult = await authService.verifySession(
    {
      chainId: 84532,
      message: "signed-message",
      signature: "0xabc123",
      walletAddress
    },
    {
      cookieHeader: null,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(repositories.userRecords.length, 1);
  assert.equal(repositories.walletRecords.length, 1);
  assert.equal(repositories.sessionRecords.length, 1);
  assert.equal(repositories.walletNonceRecords[0]?.consumedAt !== null, true);
  assert.equal(verifyResult.response.wallets[0]?.address, walletAddress);
  assert.match(verifyResult.setCookieHeader, /^be_session=/);

  const sessionToken = decodeURIComponent(
    verifyResult.setCookieHeader.split(";")[0]?.split("=")[1] ?? ""
  );
  const meResponse = await authService.getCurrentSession({
    cookieHeader: `be_session=${encodeURIComponent(sessionToken)}`,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.equal(meResponse.user.id, verifyResult.response.user.id);
  assert.equal(meResponse.session.id, verifyResult.response.session.id);
  assert.equal(repositories.sessionRecords[0]?.lastSeenAt !== null, true);

  const logoutResult = await authService.logout({
    cookieHeader: `be_session=${encodeURIComponent(sessionToken)}`,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.deepEqual(logoutResult.response, { success: true });
  assert.match(logoutResult.setCookieHeader, /Max-Age=0/);
  assert.equal(repositories.sessionRecords[0]?.status, "REVOKED");
  assert.deepEqual(
    repositories.auditLogRecords.map((record) => record.action),
    ["AUTH_NONCE_ISSUED", "AUTH_SESSION_VERIFIED", "AUTH_LOGOUT"]
  );
});
