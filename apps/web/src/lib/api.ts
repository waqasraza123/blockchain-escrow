import type {
  ApprovalRequestDetailResponse,
  CreateApprovalRequestResponse,
  CreateFinanceExportResponse,
  CreateCounterpartyDealVersionAcceptanceResponse,
  CreateCounterpartyDealMilestoneSubmissionResponse,
  CreateFileResponse,
  CreateStatementSnapshotResponse,
  DealVersionApprovalRequestParams,
  DraftDealDetailResponse,
  FinanceExportJobDetailResponse,
  HostedDisputeEvidenceLinkResponse,
  HostedSessionContextResponse,
  HostedSessionExchangeResponse,
  HostedSessionStatusResponse,
  GetCurrentApprovalRequestResponse,
  GetDealVersionSettlementStatementResponse,
  GetFundingPreparationResponse,
  ListApprovalPoliciesResponse,
  ListApprovalRequestsResponse,
  ListCostCentersResponse,
  ListDraftDealsResponse,
  ListFinanceExportsResponse,
  ListOrganizationMembershipsResponse,
  ListStatementSnapshotsResponse,
  MeResponse,
  OrganizationDetailResponse,
  OrganizationPartnerOverviewResponse,
  TenantPublicContextResponse,
  PrepareCounterpartyDealMilestoneSubmissionResponse,
  ReportingDashboardResponse,
  PreviewApprovalRequirementResponse
} from "@blockchain-escrow/shared";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

function getApiBaseUrl(): string {
  return process.env.WEB_API_BASE_URL?.replace(/\/+$/u, "") ?? defaultApiBaseUrl;
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((entry) => `${entry.name}=${encodeURIComponent(entry.value)}`)
    .join("; ");
}

async function getTenantHostHeader(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("host");
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit & { allowUnauthorized?: boolean }
): Promise<T> {
  const tenantHost = await getTenantHostHeader();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
      cookie: await getCookieHeader(),
      ...(tenantHost ? { "x-tenant-host": tenantHost } : {})
    }
  });

  if ((response.status === 401 || response.status === 403) && !init?.allowUnauthorized) {
    redirect("/unauthorized");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Web API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSession(allowUnauthorized = false): Promise<MeResponse | null> {
  if (allowUnauthorized) {
    try {
      return await apiRequest<MeResponse>("/auth/me", { allowUnauthorized: true });
    } catch {
      return null;
    }
  }

  return apiRequest<MeResponse>("/auth/me");
}

export function listMemberships(): Promise<ListOrganizationMembershipsResponse> {
  return apiRequest("/organizations");
}

export function getOrganizationDetail(
  organizationId: string
): Promise<OrganizationDetailResponse> {
  return apiRequest(`/organizations/${organizationId}`);
}

export function listDrafts(organizationId: string): Promise<ListDraftDealsResponse> {
  return apiRequest(`/organizations/${organizationId}/drafts`);
}

export function getDraft(
  organizationId: string,
  draftDealId: string
): Promise<DraftDealDetailResponse> {
  return apiRequest(`/organizations/${organizationId}/drafts/${draftDealId}`);
}

export function getFundingPreparation(
  params: DealVersionApprovalRequestParams
): Promise<GetFundingPreparationResponse> {
  return apiRequest(
    `/organizations/${params.organizationId}/drafts/${params.draftDealId}/versions/${params.dealVersionId}/funding-preparation`
  );
}

export function getSettlementStatement(
  params: DealVersionApprovalRequestParams
): Promise<GetDealVersionSettlementStatementResponse> {
  return apiRequest(
    `/organizations/${params.organizationId}/drafts/${params.draftDealId}/versions/${params.dealVersionId}/milestones/statement`
  );
}

export function getCurrentApproval(
  params: DealVersionApprovalRequestParams
): Promise<GetCurrentApprovalRequestResponse> {
  return apiRequest(
    `/organizations/${params.organizationId}/drafts/${params.draftDealId}/versions/${params.dealVersionId}/approval-request`
  );
}

export function previewApprovalRequirement(
  organizationId: string,
  body: Record<string, unknown>
): Promise<PreviewApprovalRequirementResponse> {
  return apiRequest(`/organizations/${organizationId}/approval-requirements/preview`, {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function createFundingApprovalRequest(
  params: DealVersionApprovalRequestParams,
  note?: string
): Promise<CreateApprovalRequestResponse> {
  return apiRequest(
    `/organizations/${params.organizationId}/drafts/${params.draftDealId}/versions/${params.dealVersionId}/approval-requests`,
    {
      body: JSON.stringify({
        kind: "FUNDING_TRANSACTION_CREATE",
        ...(note ? { note } : {})
      }),
      method: "POST"
    }
  );
}

export function createActionApprovalRequest(
  organizationId: string,
  body: Record<string, unknown>
): Promise<CreateApprovalRequestResponse> {
  return apiRequest(`/organizations/${organizationId}/approval-requests`, {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function listApprovalRequests(
  organizationId: string
): Promise<ListApprovalRequestsResponse> {
  return apiRequest(`/organizations/${organizationId}/approval-requests`);
}

export function getApprovalRequest(
  organizationId: string,
  approvalRequestId: string
): Promise<ApprovalRequestDetailResponse> {
  return apiRequest(`/organizations/${organizationId}/approval-requests/${approvalRequestId}`);
}

export async function decideApprovalStep(
  organizationId: string,
  approvalRequestId: string,
  approvalStepId: string,
  body: { decision: "APPROVED" | "REJECTED"; note?: string }
): Promise<void> {
  await apiRequest(
    `/organizations/${organizationId}/approval-requests/${approvalRequestId}/steps/${approvalStepId}/decision`,
    {
      body: JSON.stringify(body),
      method: "POST"
    }
  );
}

export function listCostCenters(
  organizationId: string
): Promise<ListCostCentersResponse> {
  return apiRequest(`/organizations/${organizationId}/cost-centers`);
}

export function listApprovalPolicies(
  organizationId: string
): Promise<ListApprovalPoliciesResponse> {
  return apiRequest(`/organizations/${organizationId}/approval-policies`);
}

export function listStatementSnapshots(
  organizationId: string
): Promise<ListStatementSnapshotsResponse> {
  return apiRequest(`/organizations/${organizationId}/statement-snapshots`);
}

export function createStatementSnapshot(
  params: DealVersionApprovalRequestParams,
  note?: string
): Promise<CreateStatementSnapshotResponse> {
  return apiRequest(
    `/organizations/${params.organizationId}/drafts/${params.draftDealId}/versions/${params.dealVersionId}/statement-snapshots`,
    {
      body: JSON.stringify({
        kind: "DEAL_VERSION_SETTLEMENT",
        ...(note ? { note } : {})
      }),
      method: "POST"
    }
  );
}

export function getReportingDashboard(
  organizationId: string
): Promise<ReportingDashboardResponse> {
  return apiRequest(`/organizations/${organizationId}/reports/dashboard`);
}

export function listFinanceExports(
  organizationId: string
): Promise<ListFinanceExportsResponse> {
  return apiRequest(`/organizations/${organizationId}/finance-exports`);
}

export function createFinanceExport(
  organizationId: string,
  body: Record<string, unknown>
): Promise<CreateFinanceExportResponse> {
  return apiRequest(`/organizations/${organizationId}/finance-exports`, {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function getFinanceExportJob(
  organizationId: string,
  exportJobId: string
): Promise<FinanceExportJobDetailResponse> {
  return apiRequest(`/organizations/${organizationId}/finance-exports/${exportJobId}`);
}

export function getOrganizationPartnerOverview(
  organizationId: string
): Promise<OrganizationPartnerOverviewResponse> {
  return apiRequest(`/organizations/${organizationId}/integrations/partners`);
}

export function getTenantPublicContext(
  slug?: string
): Promise<TenantPublicContextResponse> {
  const suffix = slug ? `?slug=${encodeURIComponent(slug)}` : "";
  return apiRequest(`/public/tenant-context${suffix}`, {
    allowUnauthorized: true
  });
}

export function getHostedLaunchSession(
  launchToken: string
): Promise<{ hostedSession: unknown | null }> {
  return apiRequest(`/hosted/sessions/${launchToken}`, { allowUnauthorized: true });
}

export function exchangeHostedLaunchSession(
  launchToken: string
): Promise<HostedSessionExchangeResponse> {
  return apiRequest(`/hosted/sessions/${launchToken}/exchange`, { method: "POST" });
}

export function getHostedSession(): Promise<HostedSessionStatusResponse> {
  return apiRequest("/hosted/api/session");
}

export function getHostedContext(): Promise<HostedSessionContextResponse> {
  return apiRequest("/hosted/api/context");
}

export function createHostedVersionAcceptance(
  body: Record<string, unknown>
): Promise<CreateCounterpartyDealVersionAcceptanceResponse> {
  return apiRequest("/hosted/api/version-acceptance", {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function prepareHostedMilestoneSubmission(
  body: Record<string, unknown>
): Promise<PrepareCounterpartyDealMilestoneSubmissionResponse> {
  return apiRequest("/hosted/api/milestone-submissions/prepare", {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function createHostedMilestoneSubmission(
  body: Record<string, unknown>
): Promise<CreateCounterpartyDealMilestoneSubmissionResponse> {
  return apiRequest("/hosted/api/milestone-submissions", {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function createHostedFile(
  body: Record<string, unknown>
): Promise<CreateFileResponse> {
  return apiRequest("/hosted/api/files", {
    body: JSON.stringify(body),
    method: "POST"
  });
}

export function linkHostedDisputeEvidence(
  body: Record<string, unknown>
): Promise<HostedDisputeEvidenceLinkResponse> {
  return apiRequest("/hosted/api/dispute-evidence-links", {
    body: JSON.stringify(body),
    method: "POST"
  });
}
