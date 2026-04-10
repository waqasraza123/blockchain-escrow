import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req
} from "@nestjs/common";
import type {
  ApprovalRequestDetailResponse,
  CreateApprovalPolicyResponse,
  CreateApprovalRequestResponse,
  CreateCostCenterResponse,
  CreateFinanceExportResponse,
  CreateStatementSnapshotResponse,
  DecideApprovalStepResponse,
  FinanceExportJobDetailResponse,
  GetCurrentApprovalRequestResponse,
  ListApprovalRequestsResponse,
  ListApprovalPoliciesResponse,
  ListCostCentersResponse,
  ListFinanceExportsResponse,
  ListStatementSnapshotsResponse,
  PreviewApprovalRequirementResponse,
  ReportingDashboardResponse,
  UpdateDraftCostCenterResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { ApprovalsService } from "./approvals.service";

@Controller("organizations/:organizationId")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get("cost-centers")
  async listCostCenters(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListCostCentersResponse> {
    return this.approvalsService.listCostCenters(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("cost-centers")
  async createCostCenter(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateCostCenterResponse> {
    return this.approvalsService.createCostCenter(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("drafts/:draftDealId/cost-center")
  async updateDraftCostCenter(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<UpdateDraftCostCenterResponse> {
    return this.approvalsService.updateDraftCostCenter(
      { draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("approval-policies")
  async listApprovalPolicies(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListApprovalPoliciesResponse> {
    return this.approvalsService.listApprovalPolicies(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("approval-policies")
  async createApprovalPolicy(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateApprovalPolicyResponse> {
    return this.approvalsService.createApprovalPolicy(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("drafts/:draftDealId/versions/:dealVersionId/approval-request")
  async getCurrentApproval(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<GetCurrentApprovalRequestResponse> {
    return this.approvalsService.getCurrentApproval(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("approval-requirements/preview")
  async previewApprovalRequirement(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<PreviewApprovalRequirementResponse> {
    return this.approvalsService.previewApprovalRequirement(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("approval-requests")
  async listApprovalRequests(
    @Param("organizationId") organizationId: string,
    @Query("actionKind") actionKind: string | undefined,
    @Query("dealVersionId") dealVersionId: string | undefined,
    @Query("draftDealId") draftDealId: string | undefined,
    @Query("status") status: string | undefined,
    @Query("subjectId") subjectId: string | undefined,
    @Query("subjectType") subjectType: string | undefined,
    @Req() request: HttpRequestLike
  ): Promise<ListApprovalRequestsResponse> {
    return this.approvalsService.listApprovalRequests(
      {
        actionKind,
        dealVersionId,
        draftDealId,
        organizationId,
        status,
        subjectId,
        subjectType
      },
      readRequestMetadata(request)
    );
  }

  @Get("approval-requests/:approvalRequestId")
  async getApprovalRequestDetail(
    @Param("organizationId") organizationId: string,
    @Param("approvalRequestId") approvalRequestId: string,
    @Req() request: HttpRequestLike
  ): Promise<ApprovalRequestDetailResponse> {
    return this.approvalsService.getApprovalRequestDetail(
      { approvalRequestId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("approval-requests")
  async createActionApprovalRequest(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateApprovalRequestResponse> {
    return this.approvalsService.createActionApprovalRequest(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("drafts/:draftDealId/versions/:dealVersionId/approval-requests")
  async createApprovalRequest(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateApprovalRequestResponse> {
    return this.approvalsService.createApprovalRequest(
      { dealVersionId, draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("approval-requests/:approvalRequestId/steps/:approvalStepId/decision")
  async decideApprovalStep(
    @Param("organizationId") organizationId: string,
    @Param("approvalRequestId") approvalRequestId: string,
    @Param("approvalStepId") approvalStepId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<DecideApprovalStepResponse> {
    return this.approvalsService.decideApprovalStep(
      { approvalRequestId, approvalStepId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("drafts/:draftDealId/versions/:dealVersionId/statement-snapshots")
  async listStatementSnapshots(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListStatementSnapshotsResponse> {
    return this.approvalsService.listStatementSnapshots(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("statement-snapshots")
  async listOrganizationStatementSnapshots(
    @Param("organizationId") organizationId: string,
    @Query("costCenterId") costCenterId: string | undefined,
    @Query("dealVersionId") dealVersionId: string | undefined,
    @Query("draftDealId") draftDealId: string | undefined,
    @Req() request: HttpRequestLike
  ): Promise<ListStatementSnapshotsResponse> {
    return this.approvalsService.listOrganizationStatementSnapshots(
      { costCenterId, dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post("drafts/:draftDealId/versions/:dealVersionId/statement-snapshots")
  async createStatementSnapshot(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateStatementSnapshotResponse> {
    return this.approvalsService.createStatementSnapshot(
      { dealVersionId, draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Get("reports/dashboard")
  async getReportingDashboard(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ReportingDashboardResponse> {
    return this.approvalsService.getReportingDashboard(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Get("finance-exports")
  async listFinanceExports(
    @Param("organizationId") organizationId: string,
    @Query("status") status: string | undefined,
    @Req() request: HttpRequestLike
  ): Promise<ListFinanceExportsResponse> {
    return this.approvalsService.listFinanceExports(
      { organizationId, status },
      readRequestMetadata(request)
    );
  }

  @Post("finance-exports")
  async createFinanceExport(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateFinanceExportResponse> {
    return this.approvalsService.createFinanceExport(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("finance-exports/:exportJobId")
  async getFinanceExport(
    @Param("organizationId") organizationId: string,
    @Param("exportJobId") exportJobId: string,
    @Req() request: HttpRequestLike
  ): Promise<FinanceExportJobDetailResponse> {
    return this.approvalsService.getFinanceExportJob(
      { exportJobId, organizationId },
      readRequestMetadata(request)
    );
  }
}
