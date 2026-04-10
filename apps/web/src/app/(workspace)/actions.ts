"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createActionApprovalRequest,
  createFinanceExport,
  createFundingApprovalRequest,
  createStatementSnapshot,
  decideApprovalStep
} from "../../lib/api";

function redirectBack(returnPath: string) {
  redirect(returnPath);
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
