import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type {
  CreateGasPolicyResponse,
  CreateSponsoredTransactionRequestResponse,
  ListGasPoliciesResponse,
  ListSponsoredTransactionRequestsResponse,
  UpdateGasPolicyResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { SponsorshipService } from "./sponsorship.service";

@Controller("organizations/:organizationId")
export class SponsorshipController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  @Get("gas-policies")
  async listGasPolicies(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListGasPoliciesResponse> {
    return this.sponsorshipService.listGasPolicies(
      organizationId,
      readRequestMetadata(request)
    );
  }

  @Post("gas-policies")
  async createGasPolicy(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateGasPolicyResponse> {
    return this.sponsorshipService.createGasPolicy(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Patch("gas-policies/:gasPolicyId")
  async updateGasPolicy(
    @Param("organizationId") organizationId: string,
    @Param("gasPolicyId") gasPolicyId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<UpdateGasPolicyResponse> {
    return this.sponsorshipService.updateGasPolicy(
      { gasPolicyId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("sponsored-transaction-requests")
  async listSponsoredTransactionRequests(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListSponsoredTransactionRequestsResponse> {
    return this.sponsorshipService.listSponsoredTransactionRequests(
      organizationId,
      readRequestMetadata(request)
    );
  }

  @Post("drafts/:draftDealId/versions/:dealVersionId/funding-sponsorship-requests")
  async createSponsoredFundingRequest(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateSponsoredTransactionRequestResponse> {
    return this.sponsorshipService.createSponsoredFundingRequest(
      { dealVersionId, draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Post(
    "drafts/:draftDealId/versions/:dealVersionId/milestones/settlements/:dealMilestoneSettlementRequestId/execution-sponsorship-requests"
  )
  async createSponsoredSettlementExecutionRequest(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneSettlementRequestId")
    dealMilestoneSettlementRequestId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateSponsoredTransactionRequestResponse> {
    return this.sponsorshipService.createSponsoredSettlementExecutionRequest(
      {
        dealMilestoneSettlementRequestId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }
}
