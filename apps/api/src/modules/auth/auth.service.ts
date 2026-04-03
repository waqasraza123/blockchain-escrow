import { randomBytes, randomUUID } from "node:crypto";

import type {
  Release1Repositories,
  SessionRecord,
  UserRecord,
  WalletRecord
} from "@blockchain-escrow/db";
import type { SessionTokenService, SiweVerifier } from "@blockchain-escrow/security";
import {
  authNonceRequestSchema,
  authVerifyRequestSchema,
  type AuthNonceResponse,
  type AuthVerifyResponse,
  type LogoutResponse,
  type MeResponse,
  type WalletAddress
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import {
  readCookie,
  serializeClearedCookie,
  serializeCookie
} from "./auth.cookies";
import type { RequestMetadata } from "./auth.http";
import { AuthenticatedSessionService } from "./authenticated-session.service";
import {
  AUTH_CONFIGURATION,
  SESSION_TOKEN_SERVICE,
  SIWE_VERIFIER,
  type AuthConfiguration
} from "./auth.tokens";

const signaturePattern = /^0x[a-fA-F0-9]+$/;

interface AuthCookieResult {
  response: AuthVerifyResponse;
  setCookieHeader: string;
}

function normalizeWalletAddress(address: string): WalletAddress {
  return address.toLowerCase() as WalletAddress;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function toSessionSummary(session: SessionRecord): AuthVerifyResponse["session"] {
  return {
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    id: session.id,
    lastSeenAt: session.lastSeenAt,
    status: session.status,
    userId: session.userId,
    walletId: session.walletId
  };
}

function toUserSummary(user: UserRecord): AuthVerifyResponse["user"] {
  return {
    createdAt: user.createdAt,
    id: user.id,
    updatedAt: user.updatedAt
  };
}

function toWalletSummary(wallet: WalletRecord): AuthVerifyResponse["wallets"][number] {
  return {
    address: wallet.address,
    chainId: wallet.chainId,
    createdAt: wallet.createdAt,
    id: wallet.id,
    isPrimary: wallet.isPrimary,
    updatedAt: wallet.updatedAt,
    userId: wallet.userId
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(AUTH_CONFIGURATION)
    private readonly authConfiguration: AuthConfiguration,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokenService: SessionTokenService,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    @Inject(SIWE_VERIFIER)
    private readonly siweVerifier: SiweVerifier
  ) {}

  async issueNonce(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<AuthNonceResponse> {
    const parsed = authNonceRequestSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const walletAddress = normalizeWalletAddress(parsed.data.walletAddress);
    const now = new Date();
    const expiresAt = addSeconds(now, this.authConfiguration.nonceTtlSeconds);
    const nonceId = randomUUID();
    const nonce = randomBytes(16).toString("hex");

    await this.repositories.walletNonces.create({
      chainId: parsed.data.chainId,
      consumedAt: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      id: nonceId,
      nonce,
      walletAddress
    });

    await this.repositories.auditLogs.append({
      action: "AUTH_NONCE_ISSUED",
      actorUserId: null,
      entityId: walletAddress,
      entityType: "WALLET",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        chainId: parsed.data.chainId,
        walletNonceId: nonceId
      },
      occurredAt: now.toISOString(),
      organizationId: null,
      userAgent: requestMetadata.userAgent
    });

    return {
      expiresAt: expiresAt.toISOString(),
      nonce
    };
  }

  async verifySession(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<AuthCookieResult> {
    const parsed = authVerifyRequestSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (!signaturePattern.test(parsed.data.signature)) {
      throw new BadRequestException("signature must be a hex string");
    }

    const walletAddress = normalizeWalletAddress(parsed.data.walletAddress);
    const activeNonce =
      await this.repositories.walletNonces.findActiveByWalletAddressAndChainId(
        walletAddress,
        parsed.data.chainId
      );

    if (!activeNonce) {
      throw new UnauthorizedException("active nonce not found for wallet and chain");
    }

    await this.siweVerifier.verify({
      chainId: parsed.data.chainId,
      message: parsed.data.message,
      nonce: activeNonce.nonce,
      signature: parsed.data.signature,
      walletAddress
    });

    const consumedNonce = await this.repositories.walletNonces.consume(activeNonce.id);

    if (!consumedNonce?.consumedAt) {
      throw new UnauthorizedException("nonce could not be consumed");
    }

    const now = new Date();
    const sessionExpiresAt = addSeconds(now, this.authConfiguration.sessionTtlSeconds);
    const { user, wallet } = await this.ensureUserWallet(
      walletAddress,
      parsed.data.chainId,
      now
    );
    const sessionId = randomUUID();
    const sessionToken = await this.sessionTokenService.create({
      expiresAt: sessionExpiresAt.toISOString(),
      issuedAt: now.toISOString(),
      sessionId,
      userId: user.id,
      walletAddress,
      walletId: wallet.id
    });
    const tokenHash = await this.sessionTokenService.hash(sessionToken);
    const session = await this.repositories.sessions.create({
      createdAt: now.toISOString(),
      expiresAt: sessionExpiresAt.toISOString(),
      id: sessionId,
      lastSeenAt: null,
      revokedAt: null,
      status: "ACTIVE",
      tokenHash,
      userId: user.id,
      walletId: wallet.id
    });
    const wallets = await this.repositories.wallets.listByUserId(user.id);

    await this.repositories.auditLogs.append({
      action: "AUTH_SESSION_VERIFIED",
      actorUserId: user.id,
      entityId: session.id,
      entityType: "SESSION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        chainId: parsed.data.chainId,
        walletAddress,
        walletNonceId: activeNonce.id
      },
      occurredAt: now.toISOString(),
      organizationId: null,
      userAgent: requestMetadata.userAgent
    });

    return {
      response: {
        session: toSessionSummary(session),
        user: toUserSummary(user),
        wallets: wallets.map(toWalletSummary)
      },
      setCookieHeader: serializeCookie(
        this.authConfiguration.cookie.name,
        sessionToken,
        this.authConfiguration.cookie
      )
    };
  }

  async getCurrentSession(requestMetadata: RequestMetadata): Promise<MeResponse> {
    const { session, user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );

    const [wallets, memberships] = await Promise.all([
      this.repositories.wallets.listByUserId(user.id),
      this.repositories.organizationMembers.listByUserId(user.id)
    ]);

    return {
      organizations: memberships.map((membership) => ({
        joinedAt: membership.createdAt,
        organizationId: membership.organizationId,
        role: membership.role,
        userId: membership.userId
      })),
      session: toSessionSummary(session),
      user: toUserSummary(user),
      wallets: wallets.map(toWalletSummary)
    };
  }

  async logout(requestMetadata: RequestMetadata): Promise<{
    response: LogoutResponse;
    setCookieHeader: string;
  }> {
    const sessionToken = readCookie(
      requestMetadata.cookieHeader,
      this.authConfiguration.cookie.name
    );

    if (!sessionToken) {
      return {
        response: { success: true },
        setCookieHeader: serializeClearedCookie(this.authConfiguration.cookie)
      };
    }

    const tokenHash = await this.sessionTokenService.hash(sessionToken);
    const session = await this.repositories.sessions.findByTokenHash(tokenHash);

    if (session) {
      const revokedSession = await this.repositories.sessions.revoke(session.id);

      await this.repositories.auditLogs.append({
        action: "AUTH_LOGOUT",
        actorUserId: session.userId,
        entityId: session.id,
        entityType: "SESSION",
        id: randomUUID(),
        ipAddress: requestMetadata.ipAddress,
        metadata: {
          revoked: Boolean(revokedSession)
        },
        occurredAt: new Date().toISOString(),
        organizationId: null,
        userAgent: requestMetadata.userAgent
      });
    }

    return {
      response: { success: true },
      setCookieHeader: serializeClearedCookie(this.authConfiguration.cookie)
    };
  }

  private async ensureUserWallet(
    walletAddress: WalletAddress,
    chainId: number,
    now: Date
  ): Promise<{ user: UserRecord; wallet: WalletRecord }> {
    const existingWallet = await this.repositories.wallets.findByAddress(walletAddress);

    if (existingWallet) {
      const user = await this.repositories.users.findById(existingWallet.userId);

      if (!user) {
        throw new InternalServerErrorException("wallet user could not be loaded");
      }

      return { user, wallet: existingWallet };
    }

    const createdAt = now.toISOString();
    const user = await this.repositories.users.create({
      createdAt,
      id: randomUUID(),
      updatedAt: createdAt
    });
    const wallet = await this.repositories.wallets.create({
      address: walletAddress,
      chainId,
      createdAt,
      id: randomUUID(),
      isPrimary: true,
      updatedAt: createdAt,
      userId: user.id
    });

    return { user, wallet };
  }
}
