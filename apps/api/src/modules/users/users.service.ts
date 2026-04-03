import type { UserRecord } from "@blockchain-escrow/db";
import type { CurrentUserResponse } from "@blockchain-escrow/shared";
import { Injectable } from "@nestjs/common";

import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";

function toUserSummary(user: UserRecord): CurrentUserResponse["user"] {
  return {
    createdAt: user.createdAt,
    id: user.id,
    updatedAt: user.updatedAt
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async getCurrentUser(
    requestMetadata: RequestMetadata
  ): Promise<CurrentUserResponse> {
    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );

    return {
      user: toUserSummary(user)
    };
  }
}
