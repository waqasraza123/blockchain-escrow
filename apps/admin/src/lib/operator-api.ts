import type {
  ComplianceCaseDetailResponse,
  ComplianceCaseSummary,
  ComplianceCheckpointSummary,
  CreateComplianceCaseInput,
  CreateComplianceCheckpointInput,
  CreateProtocolProposalDraftInput,
  ListComplianceCasesResponse,
  ListComplianceCheckpointsResponse,
  ListOperatorAlertsResponse,
  ListProtocolProposalDraftsResponse,
  OperatorDashboardResponse,
  OperatorHealthResponse,
  OperatorReconciliationResponse,
  OperatorSearchResponse,
  OperatorSessionResponse,
  ProtocolProposalDraftDetailResponse
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

export function getHealth(): Promise<OperatorHealthResponse> {
  return apiRequest("/operator/health");
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
