import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type {
  ApprovalRequestDetailResponse,
  CreateApprovalRequestResponse,
  CreateDealMilestoneDisputeResponse,
  CreateDealMilestoneReviewResponse,
  CreateDealMilestoneSettlementRequestResponse,
  CreateDealVersionAcceptanceResponse,
  CreateDealVersionResponse,
  CreateDraftDealResponse,
  CreateFundingTransactionResponse,
  CreatePartnerHostedSessionResponse,
  CreateCounterpartyDealVersionAcceptanceResponse,
  CreateCounterpartyDealMilestoneSubmissionResponse,
  CreateFileResponse,
  DraftDealDetailResponse,
  GetDealVersionSettlementStatementResponse,
  GetFundingPreparationResponse,
  HostedDisputeEvidenceLinkResponse,
  HostedSessionContextResponse,
  HostedSessionExchangeResponse,
  HostedSessionStatusResponse,
  ListApprovalRequestsResponse,
  ListDraftDealsResponse,
  ListPartnerHostedSessionsResponse,
  OrganizationPartnerOverviewResponse,
  PartnerHostedSessionResponse,
  PartnerPublicAccountResponse,
  PrepareCounterpartyDealMilestoneSubmissionResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { PartnerHostedService } from "./partner-hosted.service";
import { PartnerService } from "./partner.service";

@Controller()
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get("partner/v1/account")
  async getAccount(@Req() request: HttpRequestLike): Promise<PartnerPublicAccountResponse> {
    return this.partnerService.getPartnerAccount(request.headers);
  }

  @Get("partner/v1/drafts")
  async listDrafts(@Req() request: HttpRequestLike): Promise<ListDraftDealsResponse> {
    return this.partnerService.listDrafts(request.headers);
  }

  @Post("partner/v1/drafts")
  async createDraft(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDraftDealResponse> {
    return this.partnerService.createDraft(
      request.headers,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/drafts/:draftDealId")
  async getDraft(
    @Param("draftDealId") draftDealId: string,
    @Req() request: HttpRequestLike
  ): Promise<DraftDealDetailResponse> {
    return this.partnerService.getDraft(request.headers, draftDealId);
  }

  @Post("partner/v1/drafts/:draftDealId/version-snapshots")
  async createVersionSnapshot(
    @Param("draftDealId") draftDealId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealVersionResponse> {
    return this.partnerService.createVersionSnapshot(
      request.headers,
      draftDealId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/drafts/:draftDealId/versions/:dealVersionId")
  async getVersion(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealVersionResponse> {
    return this.partnerService.getVersion(request.headers, draftDealId, dealVersionId);
  }

  @Post("partner/v1/drafts/:draftDealId/versions/:dealVersionId/acceptances")
  async createVersionAcceptance(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealVersionAcceptanceResponse> {
    return this.partnerService.createVersionAcceptance(
      request.headers,
      draftDealId,
      dealVersionId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/drafts/:draftDealId/versions/:dealVersionId/funding-preparation")
  async getFundingPreparation(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetFundingPreparationResponse> {
    return this.partnerService.getFundingPreparation(request.headers, {
      dealVersionId,
      draftDealId
    });
  }

  @Post("partner/v1/drafts/:draftDealId/versions/:dealVersionId/funding-transactions")
  async createFundingTransaction(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateFundingTransactionResponse> {
    return this.partnerService.createFundingTransaction(
      request.headers,
      {
        dealVersionId,
        draftDealId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/drafts/:draftDealId/versions/:dealVersionId/milestones/statement")
  async getSettlementStatement(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetDealVersionSettlementStatementResponse> {
    return this.partnerService.getSettlementStatement(request.headers, {
      dealVersionId,
      draftDealId
    });
  }

  @Post("partner/v1/drafts/:draftDealId/versions/:dealVersionId/milestones/:dealVersionMilestoneId/reviews")
  async createMilestoneReview(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Query("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneReviewResponse> {
    return this.partnerService.createMilestoneReview(
      request.headers,
      {
        dealMilestoneSubmissionId,
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partner/v1/drafts/:draftDealId/versions/:dealVersionId/milestones/:dealVersionMilestoneId/settlement-requests")
  async createMilestoneSettlementRequest(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Query("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Query("dealMilestoneReviewId") dealMilestoneReviewId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneSettlementRequestResponse> {
    return this.partnerService.createMilestoneSettlementRequest(
      request.headers,
      {
        dealMilestoneReviewId,
        dealMilestoneSubmissionId,
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partner/v1/drafts/:draftDealId/versions/:dealVersionId/milestones/:dealVersionMilestoneId/disputes")
  async createMilestoneDispute(
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Query("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Query("dealMilestoneReviewId") dealMilestoneReviewId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneDisputeResponse> {
    return this.partnerService.createMilestoneDispute(
      request.headers,
      {
        dealMilestoneReviewId,
        dealMilestoneSubmissionId,
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/approval-requests")
  async listApprovalRequests(
    @Query() query: unknown,
    @Req() request: HttpRequestLike
  ): Promise<ListApprovalRequestsResponse> {
    return this.partnerService.listApprovalRequests(request.headers, query);
  }

  @Post("partner/v1/approval-requests")
  async createApprovalRequest(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateApprovalRequestResponse> {
    return this.partnerService.createApprovalRequest(
      request.headers,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/approval-requests/:approvalRequestId")
  async getApprovalRequest(
    @Param("approvalRequestId") approvalRequestId: string,
    @Req() request: HttpRequestLike
  ): Promise<ApprovalRequestDetailResponse> {
    return this.partnerService.getApprovalRequestDetail(
      request.headers,
      approvalRequestId
    );
  }

  @Post("partner/v1/hosted-sessions")
  async createHostedSession(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreatePartnerHostedSessionResponse> {
    return this.partnerService.createHostedSession(
      request.headers,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partner/v1/hosted-sessions")
  async listHostedSessions(
    @Req() request: HttpRequestLike
  ): Promise<ListPartnerHostedSessionsResponse> {
    return this.partnerService.listHostedSessions(request.headers);
  }

  @Get("partner/v1/hosted-sessions/:hostedSessionId")
  async getHostedSession(
    @Param("hostedSessionId") hostedSessionId: string,
    @Req() request: HttpRequestLike
  ): Promise<PartnerHostedSessionResponse> {
    return this.partnerService.getHostedSession(request.headers, hostedSessionId);
  }

  @Get("partner/v1/webhooks/subscriptions")
  async listWebhookSubscriptions(@Req() request: HttpRequestLike) {
    return this.partnerService.listWebhookSubscriptions(request.headers);
  }

  @Get("partner/v1/webhooks/deliveries")
  async listWebhookDeliveries(@Req() request: HttpRequestLike) {
    return this.partnerService.listWebhookDeliveries(request.headers);
  }

  @Get("partner/v1/webhooks/deliveries/:deliveryId")
  async getWebhookDelivery(
    @Param("deliveryId") deliveryId: string,
    @Req() request: HttpRequestLike
  ) {
    return this.partnerService.getWebhookDelivery(request.headers, deliveryId);
  }

  @Get("organizations/:organizationId/integrations/partners")
  async getOrganizationOverview(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<OrganizationPartnerOverviewResponse> {
    return this.partnerService.getOrganizationOverview(
      organizationId,
      readRequestMetadata(request)
    );
  }
}

@Controller()
export class PartnerHostedController {
  constructor(private readonly partnerHostedService: PartnerHostedService) {}

  @Get("hosted/sessions/:launchToken")
  async getLaunchSession(@Param("launchToken") launchToken: string) {
    const hostedSession = await this.partnerHostedService.getLaunchSession(launchToken);

    if (!hostedSession) {
      return { hostedSession: null };
    }

    return { hostedSession };
  }

  @Post("hosted/sessions/:launchToken/exchange")
  async exchangeLaunchSession(
    @Param("launchToken") launchToken: string,
    @Req() request: HttpRequestLike
  ): Promise<HostedSessionExchangeResponse> {
    return this.partnerHostedService.exchange(
      launchToken,
      readRequestMetadata(request)
    );
  }

  @Get("hosted/api/session")
  async getHostedSession(
    @Req() request: HttpRequestLike
  ): Promise<HostedSessionStatusResponse> {
    return this.partnerHostedService.getSession(readRequestMetadata(request));
  }

  @Get("hosted/api/context")
  async getHostedContext(
    @Req() request: HttpRequestLike
  ): Promise<HostedSessionContextResponse> {
    return this.partnerHostedService.getContext(readRequestMetadata(request));
  }

  @Post("hosted/api/version-acceptance")
  async createVersionAcceptance(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateCounterpartyDealVersionAcceptanceResponse> {
    return this.partnerHostedService.createVersionAcceptance(
      body,
      readRequestMetadata(request)
    );
  }

  @Post("hosted/api/milestone-submissions/prepare")
  async prepareMilestoneSubmission(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<PrepareCounterpartyDealMilestoneSubmissionResponse> {
    return this.partnerHostedService.prepareMilestoneSubmission(
      body,
      readRequestMetadata(request)
    );
  }

  @Post("hosted/api/milestone-submissions")
  async createMilestoneSubmission(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateCounterpartyDealMilestoneSubmissionResponse> {
    return this.partnerHostedService.createMilestoneSubmission(
      body,
      readRequestMetadata(request)
    );
  }

  @Post("hosted/api/files")
  async createFile(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateFileResponse> {
    return this.partnerHostedService.createFile(body, readRequestMetadata(request));
  }

  @Post("hosted/api/dispute-evidence-links")
  async linkDisputeEvidence(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<HostedDisputeEvidenceLinkResponse> {
    return this.partnerHostedService.linkDisputeEvidence(
      body,
      readRequestMetadata(request)
    );
  }
}
