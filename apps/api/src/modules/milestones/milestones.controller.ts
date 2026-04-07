import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CreateCounterpartyDealMilestoneSubmissionResponse,
  CreateDealMilestoneReviewResponse,
  CreateDealMilestoneSettlementRequestResponse,
  CreateDealMilestoneSubmissionResponse,
  ListDealVersionMilestoneTimelinesResponse,
  ListDealVersionMilestoneWorkflowsResponse,
  PrepareCounterpartyDealMilestoneSubmissionResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { MilestonesService } from "./milestones.service";

@Controller("organizations/:organizationId/drafts/:draftDealId/versions/:dealVersionId")
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get("milestones")
  async listMilestones(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealVersionMilestoneWorkflowsResponse> {
    return this.milestonesService.listMilestoneWorkflows(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("milestones/timeline")
  async listMilestoneTimeline(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealVersionMilestoneTimelinesResponse> {
    return this.milestonesService.listMilestoneTimelines(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("milestones/:dealVersionMilestoneId/submissions")
  async createMilestoneSubmission(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneSubmissionResponse> {
    return this.milestonesService.createMilestoneSubmission(
      {
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("milestones/:dealVersionMilestoneId/counterparty-submission-challenge")
  async prepareCounterpartyMilestoneSubmission(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Body() body: unknown
  ): Promise<PrepareCounterpartyDealMilestoneSubmissionResponse> {
    return this.milestonesService.prepareCounterpartyMilestoneSubmission(
      {
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId,
        organizationId
      },
      body
    );
  }

  @Post("milestones/:dealVersionMilestoneId/counterparty-submissions")
  async createCounterpartyMilestoneSubmission(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Body() body: unknown
  ): Promise<CreateCounterpartyDealMilestoneSubmissionResponse> {
    return this.milestonesService.createCounterpartyMilestoneSubmission(
      {
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId,
        organizationId
      },
      body
    );
  }

  @Post("milestones/:dealVersionMilestoneId/submissions/:dealMilestoneSubmissionId/reviews")
  async createMilestoneReview(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Param("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneReviewResponse> {
    return this.milestonesService.createMilestoneReview(
      {
        dealMilestoneSubmissionId,
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post(
    "milestones/:dealVersionMilestoneId/submissions/:dealMilestoneSubmissionId/reviews/:dealMilestoneReviewId/settlement-requests"
  )
  async createMilestoneSettlementRequest(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Param("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Param("dealMilestoneReviewId") dealMilestoneReviewId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneSettlementRequestResponse> {
    return this.milestonesService.createMilestoneSettlementRequest(
      {
        dealMilestoneReviewId,
        dealMilestoneSubmissionId,
        dealVersionId,
        dealVersionMilestoneId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }
}
