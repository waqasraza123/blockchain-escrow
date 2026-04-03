import type { EntityId, IsoTimestamp, WalletAddress } from "@blockchain-escrow/shared";

export type SessionCookieSameSite = "lax" | "none" | "strict";

export interface SessionCookieOptions {
  domain?: string;
  httpOnly: boolean;
  maxAgeSeconds: number;
  name: string;
  path: string;
  sameSite: SessionCookieSameSite;
  secure: boolean;
}

export interface SessionTokenPayload {
  expiresAt: IsoTimestamp;
  issuedAt: IsoTimestamp;
  sessionId: EntityId;
  userId: EntityId;
  walletAddress: WalletAddress;
  walletId: EntityId;
}

export interface SessionTokenService {
  create(payload: SessionTokenPayload): Promise<string>;
  hash(token: string): Promise<string>;
}
