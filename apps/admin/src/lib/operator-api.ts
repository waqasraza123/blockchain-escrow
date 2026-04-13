import type {
  AssignTenantBillingPlanInput,
  AssignTenantBillingPlanResponse,
  ComplianceCaseDetailResponse,
  ComplianceCaseSummary,
  ComplianceCheckpointSummary,
  CreateBillingFeeScheduleInput,
  CreateBillingFeeScheduleResponse,
  CreateBillingPlanInput,
  CreateBillingPlanResponse,
  CreateComplianceCaseInput,
  CreateComplianceCheckpointInput,
  CreatePartnerAccountInput,
  CreatePartnerAccountResponse,
  CreatePartnerApiKeyInput,
  CreatePartnerApiKeyResponse,
  CreatePartnerOrganizationLinkInput,
  CreatePartnerOrganizationLinkResponse,
  CreatePartnerWebhookSubscriptionInput,
  CreatePartnerWebhookSubscriptionResponse,
  CreateProtocolProposalDraftInput,
  CreateTenantDomainInput,
  CreateTenantDomainResponse,
  DecideSponsoredTransactionRequestInput,
  InvoiceDetailResponse,
  ListBillingPlansResponse,
  ListBillingFeeSchedulesResponse,
  ListInvoicesResponse,
  ListComplianceCasesResponse,
  ListComplianceCheckpointsResponse,
  ListOperatorDeploymentsResponse,
  ListOperatorFundingTransactionsResponse,
  ListOperatorTreasuryMovementsResponse,
  ListOperatorAlertsResponse,
  ListOperatorSponsoredTransactionRequestsResponse,
  ListPartnerAccountsResponse,
  ListProtocolProposalDraftsResponse,
  OperatorDashboardResponse,
  OperatorHealthResponse,
  OperatorReconciliationResponse,
  OperatorSearchResponse,
  OperatorSessionResponse,
  PartnerAccountDetailResponse,
  RegisterPartnerBrandAssetInput,
  RegisterPartnerBrandAssetResponse,
  ProtocolProposalDraftDetailResponse,
  RevokePartnerApiKeyResponse,
  RotatePartnerApiKeyResponse,
  RotatePartnerWebhookSubscriptionSecretResponse,
  TenantBillingOverviewResponse,
  TenantSettingsInput,
  UpdateBillingPlanInput,
  UpdateBillingPlanResponse,
  UpdateInvoiceStatusResponse,
  UpdatePartnerWebhookSubscriptionResponse
} from "@blockchain-escrow/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

function getApiBaseUrl(): string {
  return (
    process.env.ADMIN_API_BASE_URL?.replace(/\/+$/u, "") ?? defaultApiBaseUrl
  );
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((entry) => `${entry.name}=${encodeURIComponent(entry.value)}`)
    .join("; ");
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit & { allowUnauthorized?: boolean }
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
      cookie: await getCookieHeader()
    }
  });

  if ((response.status === 401 || response.status === 403) && !init?.allowUnauthorized) {
    redirect("/unauthorized");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Operator API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getOperatorSession(
  allowUnauthorized = false
): Promise<OperatorSessionResponse | null> {
  if (allowUnauthorized) {
    try {
      return await apiRequest<OperatorSessionResponse>("/operator/session", {
        allowUnauthorized: true
      });
    } catch {
      return null;
    }
  }

  return apiRequest<OperatorSessionResponse>("/operator/session");
}

export function getDashboard(): Promise<OperatorDashboardResponse> {
  return apiRequest("/operator/dashboard");
}

export function listPartners(): Promise<ListPartnerAccountsResponse> {
  return apiRequest("/operator/partners");
}

export function getPartnerAccount(
  partnerAccountId: string
): Promise<PartnerAccountDetailResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}`);
}

export function createPartnerAccount(
  input: CreatePartnerAccountInput
): Promise<CreatePartnerAccountResponse> {
  return apiRequest("/operator/partners", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function createPartnerOrganizationLink(
  partnerAccountId: string,
  input: CreatePartnerOrganizationLinkInput
): Promise<CreatePartnerOrganizationLinkResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/links`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function createPartnerApiKey(
  partnerOrganizationLinkId: string,
  input: CreatePartnerApiKeyInput
): Promise<CreatePartnerApiKeyResponse> {
  return apiRequest(`/operator/partners/links/${partnerOrganizationLinkId}/api-keys`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function revokePartnerApiKey(
  partnerApiKeyId: string,
  reason?: string
): Promise<RevokePartnerApiKeyResponse> {
  return apiRequest(`/operator/partners/api-keys/${partnerApiKeyId}/revoke`, {
    body: JSON.stringify({ ...(reason ? { reason } : {}) }),
    method: "POST"
  });
}

export function rotatePartnerApiKey(
  partnerApiKeyId: string,
  input: CreatePartnerApiKeyInput & { revokeReason?: string }
): Promise<RotatePartnerApiKeyResponse> {
  return apiRequest(`/operator/partners/api-keys/${partnerApiKeyId}/rotate`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function createPartnerWebhookSubscription(
  partnerOrganizationLinkId: string,
  input: CreatePartnerWebhookSubscriptionInput
): Promise<CreatePartnerWebhookSubscriptionResponse> {
  return apiRequest(
    `/operator/partners/links/${partnerOrganizationLinkId}/webhook-subscriptions`,
    {
      body: JSON.stringify(input),
      method: "POST"
    }
  );
}

export function updatePartnerWebhookSubscription(
  partnerWebhookSubscriptionId: string,
  status: "ACTIVE" | "PAUSED" | "DISABLED"
): Promise<UpdatePartnerWebhookSubscriptionResponse> {
  return apiRequest(
    `/operator/partners/webhook-subscriptions/${partnerWebhookSubscriptionId}`,
    {
      body: JSON.stringify({ status }),
      method: "POST"
    }
  );
}

export function rotatePartnerWebhookSubscriptionSecret(
  partnerWebhookSubscriptionId: string
): Promise<RotatePartnerWebhookSubscriptionSecretResponse> {
  return apiRequest(
    `/operator/partners/webhook-subscriptions/${partnerWebhookSubscriptionId}/rotate-secret`,
    { method: "POST" }
  );
}

export function upsertTenantSettings(
  partnerAccountId: string,
  input: TenantSettingsInput
) {
  return apiRequest(`/operator/partners/${partnerAccountId}/settings`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function registerPartnerBrandAsset(
  partnerAccountId: string,
  input: RegisterPartnerBrandAssetInput
): Promise<RegisterPartnerBrandAssetResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/brand-assets`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function createTenantDomain(
  partnerAccountId: string,
  input: CreateTenantDomainInput
): Promise<CreateTenantDomainResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/domains`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function verifyTenantDomain(domainId: string): Promise<CreateTenantDomainResponse> {
  return apiRequest(`/operator/partners/domains/${domainId}/verify`, {
    method: "POST"
  });
}

export function activateTenantDomain(domainId: string): Promise<CreateTenantDomainResponse> {
  return apiRequest(`/operator/partners/domains/${domainId}/activate`, {
    method: "POST"
  });
}

export function disableTenantDomain(domainId: string): Promise<CreateTenantDomainResponse> {
  return apiRequest(`/operator/partners/domains/${domainId}/disable`, {
    method: "POST"
  });
}

export function listBillingPlans(): Promise<ListBillingPlansResponse> {
  return apiRequest("/operator/billing-plans");
}

export function listBillingFeeSchedules(
  billingPlanId: string
): Promise<ListBillingFeeSchedulesResponse> {
  return apiRequest(`/operator/billing-plans/${billingPlanId}/fee-schedules`);
}

export function createBillingPlan(
  input: CreateBillingPlanInput
): Promise<CreateBillingPlanResponse> {
  return apiRequest("/operator/billing-plans", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateBillingPlan(
  billingPlanId: string,
  input: UpdateBillingPlanInput
): Promise<UpdateBillingPlanResponse> {
  return apiRequest(`/operator/billing-plans/${billingPlanId}`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function createBillingFeeSchedule(
  billingPlanId: string,
  input: CreateBillingFeeScheduleInput
): Promise<CreateBillingFeeScheduleResponse> {
  return apiRequest(`/operator/billing-plans/${billingPlanId}/fee-schedules`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function assignBillingPlan(
  partnerAccountId: string,
  input: AssignTenantBillingPlanInput
): Promise<AssignTenantBillingPlanResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/billing/assignments`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function getPartnerBillingOverview(
  partnerAccountId: string
): Promise<TenantBillingOverviewResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/billing`);
}

export function listPartnerInvoices(
  partnerAccountId: string
): Promise<ListInvoicesResponse> {
  return apiRequest(`/operator/partners/${partnerAccountId}/billing/invoices`);
}

export function listAllInvoices(): Promise<ListInvoicesResponse> {
  return apiRequest("/operator/billing/invoices");
}

export function getInvoice(invoiceId: string): Promise<InvoiceDetailResponse> {
  return apiRequest(`/operator/billing/invoices/${invoiceId}`);
}

export function updateInvoiceStatus(
  invoiceId: string,
  status: "FINALIZED" | "SENT" | "PAID" | "DISPUTED" | "VOID"
): Promise<UpdateInvoiceStatusResponse> {
  return apiRequest(`/operator/billing/invoices/${invoiceId}/status`, {
    body: JSON.stringify({ status }),
    method: "POST"
  });
}

export function getHealth(): Promise<OperatorHealthResponse> {
  return apiRequest("/operator/health");
}

export function getDeployments(): Promise<ListOperatorDeploymentsResponse> {
  return apiRequest("/operator/deployments");
}

export function getTreasuryMovements(): Promise<ListOperatorTreasuryMovementsResponse> {
  return apiRequest("/operator/treasury-movements");
}

export function getFundingTransactions(): Promise<ListOperatorFundingTransactionsResponse> {
  return apiRequest("/operator/funding-transactions");
}

export function getReconciliation(): Promise<OperatorReconciliationResponse> {
  return apiRequest("/operator/reconciliation");
}

export function searchOperator(query: string): Promise<OperatorSearchResponse> {
  return apiRequest(`/operator/search?q=${encodeURIComponent(query)}`);
}

export function listAlerts(params?: {
  kind?: string;
  status?: string;
}): Promise<ListOperatorAlertsResponse> {
  const query = new URLSearchParams();

  if (params?.kind) {
    query.set("kind", params.kind);
  }

  if (params?.status) {
    query.set("status", params.status);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest(`/operator/alerts${suffix}`);
}

export function listSponsoredTransactionRequests(params?: {
  kind?: string;
  status?: string;
}): Promise<ListOperatorSponsoredTransactionRequestsResponse> {
  const query = new URLSearchParams();

  if (params?.kind) {
    query.set("kind", params.kind);
  }

  if (params?.status) {
    query.set("status", params.status);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest(`/operator/sponsored-transaction-requests${suffix}`);
}

export async function acknowledgeAlert(
  alertId: string,
  note: string | null
): Promise<void> {
  await apiRequest(`/operator/alerts/${alertId}/acknowledge`, {
    body: JSON.stringify({ note: note || undefined }),
    method: "POST"
  });
}

export async function resolveAlert(alertId: string, note: string): Promise<void> {
  await apiRequest(`/operator/alerts/${alertId}/resolve`, {
    body: JSON.stringify({ note }),
    method: "POST"
  });
}

export async function decideSponsoredTransactionRequest(
  sponsoredTransactionRequestId: string,
  input: DecideSponsoredTransactionRequestInput
): Promise<void> {
  await apiRequest(
    `/operator/sponsored-transaction-requests/${sponsoredTransactionRequestId}/decision`,
    {
      body: JSON.stringify(input),
      method: "POST"
    }
  );
}

export function listCheckpoints(): Promise<ListComplianceCheckpointsResponse> {
  return apiRequest("/operator/checkpoints");
}

export function createCheckpoint(
  input: CreateComplianceCheckpointInput
): Promise<ComplianceCheckpointSummary> {
  return apiRequest("/operator/checkpoints", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function decideCheckpoint(
  checkpointId: string,
  input: { note: string; status: "CLEARED" | "BLOCKED" }
): Promise<ComplianceCheckpointSummary> {
  return apiRequest(`/operator/checkpoints/${checkpointId}/decision`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function listCases(params?: {
  status?: string;
}): Promise<ListComplianceCasesResponse> {
  const query = new URLSearchParams();

  if (params?.status) {
    query.set("status", params.status);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest(`/operator/cases${suffix}`);
}

export function createCase(
  input: CreateComplianceCaseInput
): Promise<ComplianceCaseSummary> {
  return apiRequest("/operator/cases", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function getCase(caseId: string): Promise<ComplianceCaseDetailResponse> {
  return apiRequest(`/operator/cases/${caseId}`);
}

export function addCaseNote(
  caseId: string,
  bodyMarkdown: string
): Promise<ComplianceCaseDetailResponse> {
  return apiRequest(`/operator/cases/${caseId}/notes`, {
    body: JSON.stringify({ bodyMarkdown }),
    method: "POST"
  });
}

export function assignCase(
  caseId: string,
  assignedOperatorAccountId: string | null
): Promise<ComplianceCaseSummary> {
  return apiRequest(`/operator/cases/${caseId}/assign`, {
    body: JSON.stringify({ assignedOperatorAccountId }),
    method: "POST"
  });
}

export function updateCaseStatus(
  caseId: string,
  status: "OPEN" | "IN_REVIEW" | "ESCALATED" | "RESOLVED"
): Promise<ComplianceCaseSummary> {
  return apiRequest(`/operator/cases/${caseId}/status`, {
    body: JSON.stringify({ status }),
    method: "POST"
  });
}

export function listProtocolProposals(): Promise<ListProtocolProposalDraftsResponse> {
  return apiRequest("/operator/protocol-proposals");
}

export function getProtocolProposal(
  proposalId: string
): Promise<ProtocolProposalDraftDetailResponse> {
  return apiRequest(`/operator/protocol-proposals/${proposalId}`);
}

export function createProtocolProposal(
  input: CreateProtocolProposalDraftInput
): Promise<ProtocolProposalDraftDetailResponse> {
  return apiRequest("/operator/protocol-proposals", {
    body: JSON.stringify(input),
    method: "POST"
  });
}
