import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CreateDealMilestoneSubmissionResponse,
  ListDealVersionMilestoneWorkflowsResponse
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
}
