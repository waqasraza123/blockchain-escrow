import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  AssignDealMilestoneDisputeArbitratorResponse,
  CreateDealMilestoneDisputeDecisionResponse,
  CreateDealMilestoneDisputeResponse,
  CreateDealMilestoneSettlementExecutionTransactionResponse,
  CreateCounterpartyDealMilestoneSubmissionResponse,
  CreateDealMilestoneReviewResponse,
  CreateDealMilestoneSettlementRequestResponse,
  CreateDealMilestoneSubmissionResponse,
  GetDealVersionSettlementStatementResponse,
  GetMilestoneSettlementExecutionPlanResponse,
  ListDealVersionMilestoneDisputesResponse,
  ListDealMilestoneSettlementExecutionTransactionsResponse,
  ListDealVersionMilestoneSettlementExecutionsResponse,
  ListDealVersionMilestoneTimelinesResponse,
  ListDealVersionMilestoneWorkflowsResponse,
  PrepareDealMilestoneDisputeDecisionResponse,
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

  @Get("milestones/disputes")
  async listMilestoneDisputes(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealVersionMilestoneDisputesResponse> {
    return this.milestonesService.listMilestoneDisputes(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("milestones/settlements")
  async listMilestoneSettlements(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealVersionMilestoneSettlementExecutionsResponse> {
    return this.milestonesService.listMilestoneSettlementExecutions(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("milestones/statement")
  async getSettlementStatement(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetDealVersionSettlementStatementResponse> {
    return this.milestonesService.getSettlementStatement(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("milestones/settlements/:dealMilestoneSettlementRequestId/execution")
  async getMilestoneSettlementExecutionPlan(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneSettlementRequestId")
    dealMilestoneSettlementRequestId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetMilestoneSettlementExecutionPlanResponse> {
    return this.milestonesService.getMilestoneSettlementExecutionPlan(
      {
        dealMilestoneSettlementRequestId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      readRequestMetadata(request)
    );
  }

  @Get("milestones/settlements/:dealMilestoneSettlementRequestId/execution-transactions")
  async listMilestoneSettlementExecutionTransactions(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneSettlementRequestId")
    dealMilestoneSettlementRequestId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealMilestoneSettlementExecutionTransactionsResponse> {
    return this.milestonesService.listMilestoneSettlementExecutionTransactions(
      {
        dealMilestoneSettlementRequestId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      readRequestMetadata(request)
    );
  }

  @Post("milestones/settlements/:dealMilestoneSettlementRequestId/execution-transactions")
  async createMilestoneSettlementExecutionTransaction(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneSettlementRequestId")
    dealMilestoneSettlementRequestId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneSettlementExecutionTransactionResponse> {
    return this.milestonesService.createMilestoneSettlementExecutionTransaction(
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

  @Post(
    "milestones/:dealVersionMilestoneId/submissions/:dealMilestoneSubmissionId/reviews/:dealMilestoneReviewId/disputes"
  )
  async createMilestoneDispute(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealVersionMilestoneId") dealVersionMilestoneId: string,
    @Param("dealMilestoneSubmissionId") dealMilestoneSubmissionId: string,
    @Param("dealMilestoneReviewId") dealMilestoneReviewId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneDisputeResponse> {
    return this.milestonesService.createMilestoneDispute(
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

  @Post("milestones/disputes/:dealMilestoneDisputeId/assignments")
  async assignMilestoneDisputeArbitrator(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneDisputeId") dealMilestoneDisputeId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<AssignDealMilestoneDisputeArbitratorResponse> {
    return this.milestonesService.assignMilestoneDisputeArbitrator(
      {
        dealMilestoneDisputeId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("milestones/disputes/:dealMilestoneDisputeId/decision-challenge")
  async prepareMilestoneDisputeDecision(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneDisputeId") dealMilestoneDisputeId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<PrepareDealMilestoneDisputeDecisionResponse> {
    return this.milestonesService.prepareMilestoneDisputeDecision(
      {
        dealMilestoneDisputeId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("milestones/disputes/:dealMilestoneDisputeId/decisions")
  async createMilestoneDisputeDecision(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Param("dealMilestoneDisputeId") dealMilestoneDisputeId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealMilestoneDisputeDecisionResponse> {
    return this.milestonesService.createMilestoneDisputeDecision(
      {
        dealMilestoneDisputeId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      body,
      readRequestMetadata(request)
    );
  }
}
