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
  AssignTenantBillingPlanInput,
  AssignTenantBillingPlanResponse,
  AssignComplianceCaseInput,
  ComplianceCaseDetailResponse,
  ComplianceCaseParams,
  ComplianceCheckpointParams,
  ComplianceCheckpointSummary,
  CreateBillingFeeScheduleInput,
  CreateBillingFeeScheduleResponse,
  CreateBillingPlanInput,
  CreateBillingPlanResponse,
  CreateComplianceCaseInput,
  CreateComplianceCheckpointInput,
  CreatePartnerAccountInput,
  CreatePartnerApiKeyInput,
  CreatePartnerOrganizationLinkInput,
  CreatePartnerWebhookSubscriptionInput,
  CreateProtocolProposalDraftInput,
  CreateTenantDomainInput,
  CreateTenantDomainResponse,
  DecideSponsoredTransactionRequestInput,
  DecideComplianceCheckpointInput,
  InvoiceActionInput,
  InvoiceDetailResponse,
  InvoiceParams,
  ListBillingPlansResponse,
  ListBillingFeeSchedulesResponse,
  ListComplianceCasesParams,
  ListComplianceCasesResponse,
  ListComplianceCheckpointsResponse,
  ListInvoicesResponse,
  ListOperatorAlertsParams,
  ListOperatorAlertsResponse,
  ListOperatorSponsoredTransactionRequestsParams,
  ListOperatorSponsoredTransactionRequestsResponse,
  ListPartnerAccountsResponse,
  ListProtocolProposalDraftsResponse,
  ListTenantDomainsResponse,
  OperatorAlertActionParams,
  OperatorDashboardResponse,
  OperatorHealthResponse,
  OperatorReconciliationResponse,
  OperatorSponsoredTransactionRequestParams,
  OperatorSearchParams,
  OperatorSearchResponse,
  OperatorSessionResponse,
  PartnerAccountDetailResponse,
  PartnerAccountParams,
  PartnerApiKeyParams,
  PartnerOrganizationLinkParams,
  PartnerWebhookSubscriptionParams,
  ProtocolProposalDraftDetailResponse,
  ProtocolProposalDraftParams,
  ResolveOperatorAlertInput,
  RevokePartnerApiKeyInput,
  RevokePartnerApiKeyResponse,
  RotatePartnerApiKeyInput,
  RotatePartnerApiKeyResponse,
  RotatePartnerWebhookSubscriptionSecretResponse,
  CreatePartnerAccountResponse,
  CreatePartnerApiKeyResponse,
  CreatePartnerOrganizationLinkResponse,
  CreatePartnerWebhookSubscriptionResponse,
  RegisterPartnerBrandAssetInput,
  RegisterPartnerBrandAssetResponse,
  TenantBillingOverviewResponse,
  TenantDomainParams,
  TenantSettingsInput,
  UpdateBillingPlanInput,
  UpdateBillingPlanResponse,
  UpdatePartnerWebhookSubscriptionInput,
  UpdatePartnerWebhookSubscriptionResponse,
  UpdateComplianceCaseStatusInput,
  UpdateInvoiceStatusResponse
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

  @Get("partners")
  async listPartners(@Req() request: HttpRequestLike): Promise<ListPartnerAccountsResponse> {
    return this.operatorService.listPartners(readRequestMetadata(request));
  }

  @Post("partners")
  async createPartner(
    @Body() body: CreatePartnerAccountInput,
    @Req() request: HttpRequestLike
  ): Promise<CreatePartnerAccountResponse> {
    return this.operatorService.createPartnerAccount(body, readRequestMetadata(request));
  }

  @Get("partners/:partnerAccountId")
  async getPartner(
    @Param() params: PartnerAccountParams,
    @Req() request: HttpRequestLike
  ): Promise<PartnerAccountDetailResponse> {
    return this.operatorService.getPartnerAccount(params, readRequestMetadata(request));
  }

  @Post("partners/:partnerAccountId/links")
  async createPartnerLink(
    @Param() params: PartnerAccountParams,
    @Body() body: CreatePartnerOrganizationLinkInput,
    @Req() request: HttpRequestLike
  ): Promise<CreatePartnerOrganizationLinkResponse> {
    return this.operatorService.createPartnerOrganizationLink(
      params.partnerAccountId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/links/:partnerOrganizationLinkId/api-keys")
  async createPartnerApiKey(
    @Param() params: PartnerOrganizationLinkParams,
    @Body() body: CreatePartnerApiKeyInput,
    @Req() request: HttpRequestLike
  ): Promise<CreatePartnerApiKeyResponse> {
    return this.operatorService.createPartnerApiKey(
      params.partnerOrganizationLinkId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/api-keys/:partnerApiKeyId/revoke")
  async revokePartnerApiKey(
    @Param() params: PartnerApiKeyParams,
    @Body() body: RevokePartnerApiKeyInput,
    @Req() request: HttpRequestLike
  ): Promise<RevokePartnerApiKeyResponse> {
    return this.operatorService.revokePartnerApiKey(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/api-keys/:partnerApiKeyId/rotate")
  async rotatePartnerApiKey(
    @Param() params: PartnerApiKeyParams,
    @Body() body: RotatePartnerApiKeyInput,
    @Req() request: HttpRequestLike
  ): Promise<RotatePartnerApiKeyResponse> {
    return this.operatorService.rotatePartnerApiKey(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/links/:partnerOrganizationLinkId/webhook-subscriptions")
  async createPartnerWebhookSubscription(
    @Param() params: PartnerOrganizationLinkParams,
    @Body() body: CreatePartnerWebhookSubscriptionInput,
    @Req() request: HttpRequestLike
  ): Promise<CreatePartnerWebhookSubscriptionResponse> {
    return this.operatorService.createPartnerWebhookSubscription(
      params.partnerOrganizationLinkId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/webhook-subscriptions/:partnerWebhookSubscriptionId")
  async updatePartnerWebhookSubscription(
    @Param() params: PartnerWebhookSubscriptionParams,
    @Body() body: UpdatePartnerWebhookSubscriptionInput,
    @Req() request: HttpRequestLike
  ): Promise<UpdatePartnerWebhookSubscriptionResponse> {
    return this.operatorService.updatePartnerWebhookSubscription(
      params,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/webhook-subscriptions/:partnerWebhookSubscriptionId/rotate-secret")
  async rotatePartnerWebhookSubscriptionSecret(
    @Param() params: PartnerWebhookSubscriptionParams,
    @Req() request: HttpRequestLike
  ): Promise<RotatePartnerWebhookSubscriptionSecretResponse> {
    return this.operatorService.rotatePartnerWebhookSubscriptionSecret(
      params,
      readRequestMetadata(request)
    );
  }

  @Post("partners/:partnerAccountId/settings")
  async upsertTenantSettings(
    @Param() params: PartnerAccountParams,
    @Body() body: TenantSettingsInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.upsertTenantSettings(
      params.partnerAccountId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/:partnerAccountId/brand-assets")
  async registerPartnerBrandAsset(
    @Param() params: PartnerAccountParams,
    @Body() body: RegisterPartnerBrandAssetInput,
    @Req() request: HttpRequestLike
  ): Promise<RegisterPartnerBrandAssetResponse> {
    return this.operatorService.registerPartnerBrandAsset(
      params.partnerAccountId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partners/:partnerAccountId/domains")
  async listTenantDomains(
    @Param() params: PartnerAccountParams,
    @Req() request: HttpRequestLike
  ): Promise<ListTenantDomainsResponse> {
    return this.operatorService.listTenantDomains(
      params.partnerAccountId,
      readRequestMetadata(request)
    );
  }

  @Post("partners/:partnerAccountId/domains")
  async createTenantDomain(
    @Param() params: PartnerAccountParams,
    @Body() body: CreateTenantDomainInput,
    @Req() request: HttpRequestLike
  ): Promise<CreateTenantDomainResponse> {
    return this.operatorService.createTenantDomain(
      params.partnerAccountId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/domains/:domainId/verify")
  async verifyTenantDomain(
    @Param() params: TenantDomainParams,
    @Req() request: HttpRequestLike
  ): Promise<CreateTenantDomainResponse> {
    return this.operatorService.verifyTenantDomain(params, readRequestMetadata(request));
  }

  @Post("partners/domains/:domainId/activate")
  async activateTenantDomain(
    @Param() params: TenantDomainParams,
    @Req() request: HttpRequestLike
  ): Promise<CreateTenantDomainResponse> {
    return this.operatorService.activateTenantDomain(params, readRequestMetadata(request));
  }

  @Post("partners/domains/:domainId/disable")
  async disableTenantDomain(
    @Param() params: TenantDomainParams,
    @Req() request: HttpRequestLike
  ): Promise<CreateTenantDomainResponse> {
    return this.operatorService.disableTenantDomain(params, readRequestMetadata(request));
  }

  @Get("billing-plans")
  async listBillingPlans(
    @Req() request: HttpRequestLike
  ): Promise<ListBillingPlansResponse> {
    return this.operatorService.listBillingPlans(readRequestMetadata(request));
  }

  @Get("billing-plans/:billingPlanId/fee-schedules")
  async listBillingFeeSchedules(
    @Param("billingPlanId") billingPlanId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListBillingFeeSchedulesResponse> {
    return this.operatorService.listBillingFeeSchedules(
      { billingPlanId },
      readRequestMetadata(request)
    );
  }

  @Post("billing-plans")
  async createBillingPlan(
    @Body() body: CreateBillingPlanInput,
    @Req() request: HttpRequestLike
  ): Promise<CreateBillingPlanResponse> {
    return this.operatorService.createBillingPlan(body, readRequestMetadata(request));
  }

  @Post("billing-plans/:billingPlanId")
  async updateBillingPlan(
    @Param("billingPlanId") billingPlanId: string,
    @Body() body: UpdateBillingPlanInput,
    @Req() request: HttpRequestLike
  ): Promise<UpdateBillingPlanResponse> {
    return this.operatorService.updateBillingPlan(
      { billingPlanId },
      body,
      readRequestMetadata(request)
    );
  }

  @Post("billing-plans/:billingPlanId/fee-schedules")
  async createBillingFeeSchedule(
    @Param("billingPlanId") billingPlanId: string,
    @Body() body: CreateBillingFeeScheduleInput,
    @Req() request: HttpRequestLike
  ): Promise<CreateBillingFeeScheduleResponse> {
    return this.operatorService.createBillingFeeSchedule(
      billingPlanId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("partners/:partnerAccountId/billing/assignments")
  async assignBillingPlan(
    @Param() params: PartnerAccountParams,
    @Body() body: AssignTenantBillingPlanInput,
    @Req() request: HttpRequestLike
  ): Promise<AssignTenantBillingPlanResponse> {
    return this.operatorService.assignBillingPlan(
      params.partnerAccountId,
      body,
      readRequestMetadata(request)
    );
  }

  @Get("partners/:partnerAccountId/billing")
  async getPartnerBillingOverview(
    @Param() params: PartnerAccountParams,
    @Req() request: HttpRequestLike
  ): Promise<TenantBillingOverviewResponse> {
    return this.operatorService.getPartnerBillingOverview(
      params.partnerAccountId,
      readRequestMetadata(request)
    );
  }

  @Get("partners/:partnerAccountId/billing/invoices")
  async listPartnerInvoices(
    @Param() params: PartnerAccountParams,
    @Req() request: HttpRequestLike
  ): Promise<ListInvoicesResponse> {
    return this.operatorService.listPartnerInvoices(
      params.partnerAccountId,
      readRequestMetadata(request)
    );
  }

  @Get("billing/invoices")
  async listAllInvoices(
    @Req() request: HttpRequestLike
  ): Promise<ListInvoicesResponse> {
    return this.operatorService.listAllInvoices(readRequestMetadata(request));
  }

  @Get("billing/invoices/:invoiceId")
  async getInvoice(
    @Param() params: InvoiceParams,
    @Req() request: HttpRequestLike
  ): Promise<InvoiceDetailResponse> {
    return this.operatorService.getInvoice(params, readRequestMetadata(request));
  }

  @Post("billing/invoices/:invoiceId/status")
  async updateInvoiceStatus(
    @Param() params: InvoiceParams,
    @Body() body: InvoiceActionInput,
    @Req() request: HttpRequestLike
  ): Promise<UpdateInvoiceStatusResponse> {
    return this.operatorService.updateInvoiceStatus(
      params,
      body,
      readRequestMetadata(request)
    );
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

  @Get("sponsored-transaction-requests")
  async listSponsoredTransactionRequests(
    @Query() query: ListOperatorSponsoredTransactionRequestsParams,
    @Req() request: HttpRequestLike
  ): Promise<ListOperatorSponsoredTransactionRequestsResponse> {
    return this.operatorService.listSponsoredTransactionRequests(
      query,
      readRequestMetadata(request)
    );
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

  @Post("sponsored-transaction-requests/:sponsoredTransactionRequestId/decision")
  async decideSponsoredTransactionRequest(
    @Param() params: OperatorSponsoredTransactionRequestParams,
    @Body() body: DecideSponsoredTransactionRequestInput,
    @Req() request: HttpRequestLike
  ) {
    return this.operatorService.decideSponsoredTransactionRequest(
      params,
      body,
      readRequestMetadata(request)
    );
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
