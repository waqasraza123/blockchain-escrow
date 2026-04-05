import { Controller, Get, Param, Req } from "@nestjs/common";
import type { GetFundingPreparationResponse } from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { FundingService } from "./funding.service";

@Controller("organizations/:organizationId/drafts/:draftDealId/versions/:dealVersionId/funding-preparation")
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Get()
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
}
