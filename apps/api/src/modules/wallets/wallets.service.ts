import type { Release1Repositories, WalletRecord } from "@blockchain-escrow/db";
import {
  walletIdParamsSchema,
  type ListWalletsResponse,
  type WalletDetailResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";

function toWalletSummary(wallet: WalletRecord): WalletDetailResponse["wallet"] {
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
export class WalletsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listWallets(
    requestMetadata: RequestMetadata
  ): Promise<ListWalletsResponse> {
    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const wallets = await this.repositories.wallets.listByUserId(user.id);

    return {
      wallets: wallets.map(toWalletSummary)
    };
  }

  async getWallet(
    walletId: string,
    requestMetadata: RequestMetadata
  ): Promise<WalletDetailResponse> {
    const parsed = walletIdParamsSchema.safeParse({ walletId });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const wallet = await this.repositories.wallets.findById(parsed.data.walletId);

    if (!wallet || wallet.userId !== user.id) {
      throw new NotFoundException("wallet not found");
    }

    return {
      wallet: toWalletSummary(wallet)
    };
  }
}
