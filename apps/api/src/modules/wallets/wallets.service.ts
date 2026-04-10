import type {
  Release1Repositories,
  Release12Repositories,
  WalletProfileRecord,
  WalletRecord
} from "@blockchain-escrow/db";
import {
  upsertWalletProfileSchema,
  walletIdParamsSchema,
  type ListWalletsResponse,
  type UpsertWalletProfileResponse,
  type WalletDetailResponse,
  type WalletWithProfileSummary
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import { RELEASE12_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";

function toWalletProfileSummary(
  profile: WalletProfileRecord | null
): WalletWithProfileSummary["profile"] {
  if (!profile) {
    return null;
  }

  return profile;
}

function toWalletSummary(
  wallet: WalletRecord,
  profile: WalletProfileRecord | null
): WalletDetailResponse["wallet"] {
  return {
    address: wallet.address,
    chainId: wallet.chainId,
    createdAt: wallet.createdAt,
    id: wallet.id,
    isPrimary: wallet.isPrimary,
    profile: toWalletProfileSummary(profile),
    updatedAt: wallet.updatedAt,
    userId: wallet.userId
  };
}

@Injectable()
export class WalletsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(RELEASE12_REPOSITORIES)
    private readonly release12Repositories: Release12Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listWallets(
    requestMetadata: RequestMetadata
  ): Promise<ListWalletsResponse> {
    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const wallets = await this.repositories.wallets.listByUserId(user.id);
    const profiles = await this.release12Repositories.walletProfiles.listByWalletIds(
      wallets.map((wallet) => wallet.id)
    );
    const profilesByWalletId = new Map(
      profiles.map((profile) => [profile.walletId, profile] as const)
    );

    return {
      wallets: wallets.map((wallet) =>
        toWalletSummary(wallet, profilesByWalletId.get(wallet.id) ?? null)
      )
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
      wallet: toWalletSummary(
        wallet,
        await this.release12Repositories.walletProfiles.findByWalletId(wallet.id)
      )
    };
  }

  async upsertWalletProfile(
    walletId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpsertWalletProfileResponse> {
    const parsedParams = walletIdParamsSchema.safeParse({ walletId });
    const parsedBody = upsertWalletProfileSchema.safeParse(input);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const wallet = await this.repositories.wallets.findById(parsedParams.data.walletId);

    if (!wallet || wallet.userId !== user.id) {
      throw new NotFoundException("wallet not found");
    }

    const now = new Date().toISOString();
    const profile = await this.release12Repositories.walletProfiles.upsert({
      approvalNoteTemplate: parsedBody.data.approvalNoteTemplate ?? null,
      createdAt: now,
      defaultGasPolicyId: parsedBody.data.defaultGasPolicyId ?? null,
      defaultOrganizationId: parsedBody.data.defaultOrganizationId ?? null,
      displayName: parsedBody.data.displayName,
      reviewNoteTemplate: parsedBody.data.reviewNoteTemplate ?? null,
      sponsorTransactionsByDefault:
        parsedBody.data.sponsorTransactionsByDefault ?? false,
      updatedAt: now,
      walletId: wallet.id
    });

    return {
      profile
    };
  }
}
