import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CreateFundingTransactionResponse,
  GetFundingPreparationResponse,
  ListFundingTransactionsResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { FundingService } from "./funding.service";

@Controller("organizations/:organizationId/drafts/:draftDealId/versions/:dealVersionId")
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Get("funding-preparation")
  async getFundingPreparation(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetFundingPreparationResponse> {
    return this.fundingService.getFundingPreparation(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("funding-transactions")
  async listFundingTransactions(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListFundingTransactionsResponse> {
    return this.fundingService.listFundingTransactions(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("funding-transactions")
  async createFundingTransaction(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateFundingTransactionResponse> {
    return this.fundingService.createFundingTransaction(
      { dealVersionId, draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }
}
