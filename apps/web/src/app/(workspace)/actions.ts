"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createGasPolicy,
  createActionApprovalRequest,
  createFinanceExport,
  createFundingTransaction,
  createFundingApprovalRequest,
  createMilestoneReview,
  createMilestoneSettlementExecutionTransaction,
  createMilestoneSettlementRequest,
  createSponsoredFundingRequest,
  createSponsoredSettlementExecutionRequest,
  createStatementSnapshot,
  decideApprovalStep,
  upsertWalletProfile,
  updateGasPolicy
} from "../../lib/api";

function redirectBack(returnPath: string) {
  redirect(returnPath);
}

export type TransactionRecordActionState = {
  error: string | null;
  ok: boolean;
  transactionHash: string | null;
};

export const initialTransactionRecordActionState: TransactionRecordActionState = {
  error: null,
  ok: false,
  transactionHash: null
};

function formatActionError(caught: unknown): string {
  return caught instanceof Error && caught.message.trim().length > 0
    ? caught.message
    : "Request failed.";
}

export async function requestFundingApprovalAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const returnPath = String(formData.get("returnPath"));
  const note = String(formData.get("note") ?? "").trim();

  await createFundingApprovalRequest(
    { dealVersionId, draftDealId, organizationId },
    note || undefined
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function requestStatementSnapshotApprovalAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const title = String(formData.get("title"));
  const settlementCurrency = String(formData.get("settlementCurrency"));
  const totalAmountMinor = String(formData.get("totalAmountMinor"));
  const costCenterIdValue = String(formData.get("costCenterId") ?? "").trim();
  const returnPath = String(formData.get("returnPath"));
  const note = String(formData.get("note") ?? "").trim();

  await createActionApprovalRequest(organizationId, {
    actionKind: "STATEMENT_SNAPSHOT_CREATE",
    costCenterId: costCenterIdValue || undefined,
    dealVersionId,
    draftDealId,
    settlementCurrency,
    subjectId: dealVersionId,
    subjectLabel: title,
    subjectType: "DEAL_VERSION",
    title,
    totalAmountMinor,
    ...(note ? { note } : {})
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createStatementSnapshotAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const returnPath = String(formData.get("returnPath"));
  const note = String(formData.get("note") ?? "").trim();

  await createStatementSnapshot(
    { dealVersionId, draftDealId, organizationId },
    note || undefined
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function decideApprovalStepAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const approvalRequestId = String(formData.get("approvalRequestId"));
  const approvalStepId = String(formData.get("approvalStepId"));
  const decision = String(formData.get("decision")) as "APPROVED" | "REJECTED";
  const note = String(formData.get("note") ?? "").trim();
  const returnPath = String(formData.get("returnPath"));

  await decideApprovalStep(organizationId, approvalRequestId, approvalStepId, {
    decision,
    ...(note ? { note } : {})
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createFinanceExportAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const returnPath = String(formData.get("returnPath"));
  const dateFrom = String(formData.get("dateFrom") ?? "").trim();
  const dateTo = String(formData.get("dateTo") ?? "").trim();

  await createFinanceExport(organizationId, {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function upsertWalletProfileAction(formData: FormData) {
  const walletId = String(formData.get("walletId"));
  const organizationIdValue = String(formData.get("defaultOrganizationId") ?? "").trim();
  const gasPolicyIdValue = String(formData.get("defaultGasPolicyId") ?? "").trim();
  const returnPath = String(formData.get("returnPath"));

  await upsertWalletProfile(walletId, {
    approvalNoteTemplate: String(formData.get("approvalNoteTemplate") ?? "").trim() || null,
    defaultGasPolicyId: gasPolicyIdValue || null,
    defaultOrganizationId: organizationIdValue || null,
    displayName: String(formData.get("displayName")),
    reviewNoteTemplate: String(formData.get("reviewNoteTemplate") ?? "").trim() || null,
    sponsorTransactionsByDefault:
      String(formData.get("sponsorTransactionsByDefault") ?? "") === "on"
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createGasPolicyAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const returnPath = String(formData.get("returnPath"));
  const approvalKindsValue = String(formData.get("allowedApprovalPolicyKinds") ?? "").trim();

  await createGasPolicy(organizationId, {
    active: String(formData.get("active") ?? "") === "on",
    allowedApprovalPolicyKinds: approvalKindsValue
      ? approvalKindsValue.split(",").map((value) => value.trim()).filter(Boolean)
      : [],
    allowedChainIds: [Number(String(formData.get("allowedChainId") ?? "84532"))],
    allowedTransactionKinds: String(formData.get("allowedTransactionKinds"))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    description: String(formData.get("description") ?? "").trim() || undefined,
    maxAmountMinor: String(formData.get("maxAmountMinor") ?? "").trim() || undefined,
    maxRequestsPerDay: Number(String(formData.get("maxRequestsPerDay"))),
    name: String(formData.get("name")),
    sponsorWindowMinutes: Number(String(formData.get("sponsorWindowMinutes")))
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function updateGasPolicyAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const gasPolicyId = String(formData.get("gasPolicyId"));
  const returnPath = String(formData.get("returnPath"));

  await updateGasPolicy(organizationId, gasPolicyId, {
    active: String(formData.get("active") ?? "") === "on"
  });
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createMilestoneReviewAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const dealVersionMilestoneId = String(formData.get("dealVersionMilestoneId"));
  const dealMilestoneSubmissionId = String(formData.get("dealMilestoneSubmissionId"));
  const decision = String(formData.get("decision"));
  const returnPath = String(formData.get("returnPath"));
  const statementMarkdown = String(formData.get("statementMarkdown") ?? "").trim();

  await createMilestoneReview(
    {
      dealMilestoneSubmissionId,
      dealVersionId,
      dealVersionMilestoneId,
      draftDealId,
      organizationId
    },
    {
      decision,
      ...(statementMarkdown ? { statementMarkdown } : {})
    }
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createMilestoneSettlementRequestAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const dealVersionMilestoneId = String(formData.get("dealVersionMilestoneId"));
  const dealMilestoneSubmissionId = String(formData.get("dealMilestoneSubmissionId"));
  const dealMilestoneReviewId = String(formData.get("dealMilestoneReviewId"));
  const kind = String(formData.get("kind"));
  const returnPath = String(formData.get("returnPath"));
  const statementMarkdown = String(formData.get("statementMarkdown") ?? "").trim();

  await createMilestoneSettlementRequest(
    {
      dealMilestoneReviewId,
      dealMilestoneSubmissionId,
      dealVersionId,
      dealVersionMilestoneId,
      draftDealId,
      organizationId
    },
    {
      kind,
      ...(statementMarkdown ? { statementMarkdown } : {})
    }
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createSponsoredFundingRequestAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const returnPath = String(formData.get("returnPath"));
  const gasPolicyId = String(formData.get("gasPolicyId") ?? "").trim();

  await createSponsoredFundingRequest(
    { dealVersionId, draftDealId, organizationId },
    gasPolicyId ? { gasPolicyId } : {}
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function createSponsoredSettlementExecutionRequestAction(
  formData: FormData
) {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const dealMilestoneSettlementRequestId = String(
    formData.get("dealMilestoneSettlementRequestId")
  );
  const returnPath = String(formData.get("returnPath"));
  const gasPolicyId = String(formData.get("gasPolicyId") ?? "").trim();

  await createSponsoredSettlementExecutionRequest(
    {
      dealMilestoneSettlementRequestId,
      dealVersionId,
      draftDealId,
      organizationId
    },
    gasPolicyId ? { gasPolicyId } : {}
  );
  revalidatePath(returnPath);
  redirectBack(returnPath);
}

export async function recordFundingTransactionAction(
  _previousState: TransactionRecordActionState,
  formData: FormData
): Promise<TransactionRecordActionState> {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const returnPath = String(formData.get("returnPath"));
  const transactionHash = String(formData.get("transactionHash") ?? "").trim();

  try {
    await createFundingTransaction(
      { dealVersionId, draftDealId, organizationId },
      { transactionHash }
    );
    revalidatePath(returnPath);

    return {
      error: null,
      ok: true,
      transactionHash
    };
  } catch (caught) {
    return {
      error: formatActionError(caught),
      ok: false,
      transactionHash
    };
  }
}

export async function recordSettlementExecutionTransactionAction(
  _previousState: TransactionRecordActionState,
  formData: FormData
): Promise<TransactionRecordActionState> {
  const organizationId = String(formData.get("organizationId"));
  const draftDealId = String(formData.get("draftDealId"));
  const dealVersionId = String(formData.get("dealVersionId"));
  const dealMilestoneSettlementRequestId = String(
    formData.get("dealMilestoneSettlementRequestId")
  );
  const returnPath = String(formData.get("returnPath"));
  const transactionHash = String(formData.get("transactionHash") ?? "").trim();

  try {
    await createMilestoneSettlementExecutionTransaction(
      {
        dealMilestoneSettlementRequestId,
        dealVersionId,
        draftDealId,
        organizationId
      },
      { transactionHash }
    );
    revalidatePath(returnPath);

    return {
      error: null,
      ok: true,
      transactionHash
    };
  } catch (caught) {
    return {
      error: formatActionError(caught),
      ok: false,
      transactionHash
    };
  }
}
