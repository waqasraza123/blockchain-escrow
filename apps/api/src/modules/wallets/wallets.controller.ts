import { Controller, Get, Param, Req } from "@nestjs/common";
import type {
  ListWalletsResponse,
  WalletDetailResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  async listWallets(
    @Req() request: HttpRequestLike
  ): Promise<ListWalletsResponse> {
    return this.walletsService.listWallets(readRequestMetadata(request));
  }

  @Get(":walletId")
  async getWallet(
    @Param("walletId") walletId: string,
    @Req() request: HttpRequestLike
  ): Promise<WalletDetailResponse> {
    return this.walletsService.getWallet(walletId, readRequestMetadata(request));
  }
}
