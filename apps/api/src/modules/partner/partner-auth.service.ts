import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type {
  PartnerAccountRecord,
  PartnerApiKeyRecord,
  PartnerHostedSessionRecord,
  PartnerOrganizationLinkRecord,
  Release1Repositories,
  Release10Repositories
} from "@blockchain-escrow/db";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import {
  RELEASE1_REPOSITORIES,
  RELEASE10_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  PARTNER_CONFIGURATION,
  type PartnerConfiguration
} from "./partner.tokens";

export interface PartnerApiContext {
  account: PartnerAccountRecord;
  actor: AuthenticatedSessionContext;
  apiKey: PartnerApiKeyRecord;
  link: PartnerOrganizationLinkRecord;
}

export interface HostedSessionContext {
  actor: AuthenticatedSessionContext;
  hostedSession: PartnerHostedSessionRecord;
  link: PartnerOrganizationLinkRecord;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | null {
  const value = headers[name];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const entry of cookies) {
    const [rawName, ...rawValue] = entry.trim().split("=");

    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePartnerApiKey(
  rawValue: string,
  prefix: string
): { keyPrefix: string; keySecret: string } {
  const marker = `${prefix}_`;

  if (!rawValue.startsWith(marker)) {
    throw new UnauthorizedException("partner api key format is invalid");
  }

  const suffix = rawValue.slice(marker.length);
  const separatorIndex = suffix.indexOf("_");

  if (separatorIndex <= 0 || separatorIndex >= suffix.length - 1) {
    throw new UnauthorizedException("partner api key format is invalid");
  }

  const keyId = suffix.slice(0, separatorIndex);
  const keySecret = suffix.slice(separatorIndex + 1);

  return {
    keyPrefix: `${marker}${keyId}`,
    keySecret
  };
}

function parseHostedSessionToken(
  token: string,
  secret: string
): { expiresAt: string; sessionId: string } {
  const [sessionId, expiresAt, signature] = token.split(".");

  if (!sessionId || !expiresAt || !signature) {
    throw new UnauthorizedException("hosted session token is invalid");
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${sessionId}.${expiresAt}`)
    .digest("hex");

  if (!safeEqual(expectedSignature, signature)) {
    throw new UnauthorizedException("hosted session token is invalid");
  }

  if (new Date(expiresAt).getTime() <= Date.now()) {
    throw new UnauthorizedException("hosted session token has expired");
  }

  return {
    expiresAt,
    sessionId
  };
}

@Injectable()
export class PartnerAuthService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE10_REPOSITORIES)
    private readonly release10Repositories: Release10Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    @Inject(PARTNER_CONFIGURATION)
    private readonly configuration: PartnerConfiguration
  ) {}

  buildHostedSessionToken(hostedSession: PartnerHostedSessionRecord): string {
    const expiresAt = new Date(
      Date.now() + this.configuration.hostedSessionTtlSeconds * 1000
    ).toISOString();
    const signature = createHmac("sha256", this.configuration.hostedSessionSecret)
      .update(`${hostedSession.id}.${expiresAt}`)
      .digest("hex");

    return `${hostedSession.id}.${expiresAt}.${signature}`;
  }

  hashLaunchToken(launchToken: string): string {
    return hashSecret(launchToken);
  }

  async requirePartnerContext(
    headers: Record<string, string | string[] | undefined>
  ): Promise<PartnerApiContext> {
    const authorizationHeader = readHeader(headers, "authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("partner api key is required");
    }

    const parsed = parsePartnerApiKey(
      authorizationHeader.slice("Bearer ".length).trim(),
      this.configuration.apiKeyPrefix
    );
    const apiKey =
      await this.release10Repositories.partnerApiKeys.findActiveByKeyPrefix(
        parsed.keyPrefix
      );

    if (!apiKey || !safeEqual(apiKey.secretHash, hashSecret(parsed.keySecret))) {
      throw new UnauthorizedException("partner api key is invalid");
    }

    if (apiKey.revokedAt || apiKey.status !== "ACTIVE") {
      throw new UnauthorizedException("partner api key is not active");
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException("partner api key has expired");
    }

    const [link, account] = await Promise.all([
      this.release10Repositories.partnerOrganizationLinks.findById(
        apiKey.partnerOrganizationLinkId
      ),
      this.loadPartnerAccountByApiKey(apiKey)
    ]);

    if (!link || link.status !== "ACTIVE" || !account || account.status !== "ACTIVE") {
      throw new UnauthorizedException("partner link is not active");
    }

    const actor = await this.authenticatedSessionService.loadSyntheticContext({
      sessionId: `partner:${apiKey.id}`,
      userId: link.actingUserId,
      walletId: link.actingWalletId
    });

    await this.release10Repositories.partnerApiKeys.update(apiKey.id, {
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      account,
      actor,
      apiKey,
      link
    };
  }

  async requireHostedSessionContext(
    requestMetadata: RequestMetadata
  ): Promise<HostedSessionContext> {
    const token = readCookie(
      requestMetadata.cookieHeader,
      this.configuration.hostedCookieName
    );

    if (!token) {
      throw new UnauthorizedException("hosted session cookie is missing");
    }

    const parsed = parseHostedSessionToken(token, this.configuration.hostedSessionSecret);
    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.findById(parsed.sessionId);

    if (!hostedSession) {
      throw new UnauthorizedException("hosted session not found");
    }

    if (new Date(hostedSession.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException("hosted session has expired");
    }

    if (
      hostedSession.status !== "ACTIVE" &&
      hostedSession.status !== "PENDING"
    ) {
      throw new UnauthorizedException("hosted session is not active");
    }

    const link =
      await this.release10Repositories.partnerOrganizationLinks.findById(
        hostedSession.partnerOrganizationLinkId
      );

    if (!link || link.status !== "ACTIVE") {
      throw new UnauthorizedException("hosted session partner link is invalid");
    }

    const actor = await this.authenticatedSessionService.loadSyntheticContext({
      sessionId: `hosted:${hostedSession.id}`,
      userId: link.actingUserId,
      walletId: link.actingWalletId
    });

    return {
      actor,
      hostedSession,
      link
    };
  }

  private async loadPartnerAccountByApiKey(
    apiKey: PartnerApiKeyRecord
  ): Promise<PartnerAccountRecord | null> {
    const link =
      await this.release10Repositories.partnerOrganizationLinks.findById(
        apiKey.partnerOrganizationLinkId
      );

    if (!link) {
      return null;
    }

    return this.release10Repositories.partnerAccounts.findById(link.partnerAccountId);
  }
}
