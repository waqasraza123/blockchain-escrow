import type {
  Release1Repositories,
  SessionRecord,
  UserRecord,
  WalletRecord
} from "@blockchain-escrow/db";
import type { SessionActor, SessionTokenService } from "@blockchain-escrow/security";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import { readCookie } from "./auth.cookies";
import {
  AUTH_CONFIGURATION,
  SESSION_TOKEN_SERVICE,
  type AuthConfiguration
} from "./auth.tokens";

export interface AuthenticatedSessionContext {
  actor: SessionActor;
  session: SessionRecord;
  user: UserRecord;
  wallet: WalletRecord;
}

function parseIsoTimestamp(value: string): Date {
  return new Date(value);
}

@Injectable()
export class AuthenticatedSessionService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(AUTH_CONFIGURATION)
    private readonly authConfiguration: AuthConfiguration,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokenService: SessionTokenService
  ) {}

  async requireContext(
    cookieHeader: string | null
  ): Promise<AuthenticatedSessionContext> {
    const sessionToken = readCookie(cookieHeader, this.authConfiguration.cookie.name);

    if (!sessionToken) {
      throw new UnauthorizedException("session cookie is missing");
    }

    const tokenHash = await this.sessionTokenService.hash(sessionToken);
    const session = await this.repositories.sessions.findByTokenHash(tokenHash);

    if (!session || session.status !== "ACTIVE") {
      throw new UnauthorizedException("session is invalid");
    }

    if (parseIsoTimestamp(session.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException("session has expired");
    }

    const touchedSession =
      (await this.repositories.sessions.touch(session.id)) ?? session;
    const [user, wallet] = await Promise.all([
      this.repositories.users.findById(touchedSession.userId),
      this.repositories.wallets.findById(touchedSession.walletId)
    ]);

    if (!user) {
      throw new InternalServerErrorException("session user could not be loaded");
    }

    if (!wallet) {
      throw new InternalServerErrorException("session wallet could not be loaded");
    }

    return {
      actor: {
        authenticatedAt: touchedSession.createdAt,
        sessionId: touchedSession.id,
        userId: touchedSession.userId,
        walletAddress: wallet.address,
        walletId: touchedSession.walletId
      },
      session: touchedSession,
      user,
      wallet
    };
  }
}
