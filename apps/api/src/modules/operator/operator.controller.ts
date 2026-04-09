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
  AcknowledgeOperatorAlertInput,
  AddComplianceCaseNoteInput,
  AssignComplianceCaseInput,
  ComplianceCaseDetailResponse,
  ComplianceCaseParams,
  ComplianceCheckpointParams,
  ComplianceCheckpointSummary,
  CreateComplianceCaseInput,
  CreateComplianceCheckpointInput,
  CreateProtocolProposalDraftInput,
  DecideComplianceCheckpointInput,
  ListComplianceCasesParams,
  ListComplianceCasesResponse,
  ListComplianceCheckpointsResponse,
  ListOperatorAlertsParams,
  ListOperatorAlertsResponse,
  ListProtocolProposalDraftsResponse,
  OperatorAlertActionParams,
  OperatorDashboardResponse,
  OperatorHealthResponse,
  OperatorReconciliationResponse,
  OperatorSearchParams,
  OperatorSearchResponse,
  OperatorSessionResponse,
  ProtocolProposalDraftDetailResponse,
  ProtocolProposalDraftParams,
  ResolveOperatorAlertInput,
  UpdateComplianceCaseStatusInput
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { OperatorService } from "./operator.service";

@Controller("operator")
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Get("session")
  async getSession(@Req() request: HttpRequestLike): Promise<OperatorSessionResponse> {
    return this.operatorService.getSession(readRequestMetadata(request));
  }

  @Get("search")
  async search(
    @Query() query: OperatorSearchParams,
    @Req() request: HttpRequestLike
  ): Promise<OperatorSearchResponse> {
    return this.operatorService.search(query, readRequestMetadata(request));
  }

  @Get("dashboard")
  async getDashboard(
    @Req() request: HttpRequestLike
  ): Promise<OperatorDashboardResponse> {
    return this.operatorService.getDashboard(readRequestMetadata(request));
  }

  @Get("health")
  async getHealth(@Req() request: HttpRequestLike): Promise<OperatorHealthResponse> {
    return this.operatorService.getHealth(readRequestMetadata(request));
  }

  @Get("reconciliation")
  async getReconciliation(
    @Req() request: HttpRequestLike
  ): Promise<OperatorReconciliationResponse> {
    return this.operatorService.getReconciliation(readRequestMetadata(request));
  }

  @Get("alerts")
  async listAlerts(
    @Query() query: ListOperatorAlertsParams,
    @Req() request: HttpRequestLike
  ): Promise<ListOperatorAlertsResponse> {
    return this.operatorService.listAlerts(query, readRequestMetadata(request));
  }

  @Post("alerts/:alertId/acknowledge")
  async acknowledgeAlert(
    @Param() params: OperatorAlertActionParams,
    @Body() body: AcknowledgeOperatorAlertInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.acknowledgeAlert(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("alerts/:alertId/resolve")
  async resolveAlert(
    @Param() params: OperatorAlertActionParams,
    @Body() body: ResolveOperatorAlertInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.resolveAlert(params, body, readRequestMetadata(request));
  }

  @Get("checkpoints")
  async listCheckpoints(
    @Req() request: HttpRequestLike
  ): Promise<ListComplianceCheckpointsResponse> {
    return this.operatorService.listCheckpoints(readRequestMetadata(request));
  }

  @Post("checkpoints")
  async createCheckpoint(
    @Body() body: CreateComplianceCheckpointInput,
    @Req() request: HttpRequestLike
  ): Promise<ComplianceCheckpointSummary> {
    return this.operatorService.createCheckpoint(body, readRequestMetadata(request));
  }

  @Post("checkpoints/:checkpointId/decision")
  async decideCheckpoint(
    @Param() params: ComplianceCheckpointParams,
    @Body() body: DecideComplianceCheckpointInput,
    @Req() request: HttpRequestLike
  ): Promise<ComplianceCheckpointSummary> {
    return this.operatorService.decideCheckpoint(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("cases")
  async listCases(
    @Query() query: ListComplianceCasesParams,
    @Req() request: HttpRequestLike
  ): Promise<ListComplianceCasesResponse> {
    return this.operatorService.listCases(query, readRequestMetadata(request));
  }

  @Post("cases")
  async createCase(
    @Body() body: CreateComplianceCaseInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.createCase(body, readRequestMetadata(request));
  }

  @Get("cases/:caseId")
  async getCase(
    @Param() params: ComplianceCaseParams,
    @Req() request: HttpRequestLike
  ): Promise<ComplianceCaseDetailResponse> {
    return this.operatorService.getCase(params, readRequestMetadata(request));
  }

  @Post("cases/:caseId/notes")
  async addCaseNote(
    @Param() params: ComplianceCaseParams,
    @Body() body: AddComplianceCaseNoteInput,
    @Req() request: HttpRequestLike
  ): Promise<ComplianceCaseDetailResponse> {
    return this.operatorService.addCaseNote(params, body, readRequestMetadata(request));
  }

  @Post("cases/:caseId/assign")
  async assignCase(
    @Param() params: ComplianceCaseParams,
    @Body() body: AssignComplianceCaseInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.assignCase(params, body, readRequestMetadata(request));
  }

  @Post("cases/:caseId/status")
  async updateCaseStatus(
    @Param() params: ComplianceCaseParams,
    @Body() body: UpdateComplianceCaseStatusInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.updateCaseStatus(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("protocol-proposals")
  async listProtocolProposals(
    @Req() request: HttpRequestLike
  ): Promise<ListProtocolProposalDraftsResponse> {
    return this.operatorService.listProtocolProposals(readRequestMetadata(request));
  }

  @Post("protocol-proposals")
  async createProtocolProposal(
    @Body() body: CreateProtocolProposalDraftInput,
    @Req() request: HttpRequestLike
  ): Promise<ProtocolProposalDraftDetailResponse> {
    return this.operatorService.createProtocolProposalDraft(
      body,
      readRequestMetadata(request)
    );
  }

  @Get("protocol-proposals/:proposalId")
  async getProtocolProposal(
    @Param() params: ProtocolProposalDraftParams,
    @Req() request: HttpRequestLike
  ): Promise<ProtocolProposalDraftDetailResponse> {
    return this.operatorService.getProtocolProposalDraft(
      params,
      readRequestMetadata(request)
    );
  }
}
