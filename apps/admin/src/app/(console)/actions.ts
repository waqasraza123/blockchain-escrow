"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  acknowledgeAlert,
  addCaseNote,
  assignCase,
  createCase,
  createCheckpoint,
  createProtocolProposal,
  decideCheckpoint,
  resolveAlert,
  updateCaseStatus
} from "../../lib/operator-api";

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
}

function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function requiredInteger(formData: FormData, key: string): number {
  const value = Number.parseInt(requiredString(formData, key), 10);

  if (!Number.isInteger(value)) {
    throw new Error(`Invalid integer field: ${key}`);
  }

  return value;
}

export async function acknowledgeAlertAction(formData: FormData): Promise<void> {
  await acknowledgeAlert(requiredString(formData, "alertId"), optionalString(formData, "note"));
  revalidatePath("/alerts");
  redirect("/alerts");
}

export async function resolveAlertAction(formData: FormData): Promise<void> {
  await resolveAlert(requiredString(formData, "alertId"), requiredString(formData, "note"));
  revalidatePath("/alerts");
  redirect("/alerts");
}

export async function createCheckpointAction(formData: FormData): Promise<void> {
  const checkpoint = await createCheckpoint({
    kind: "SANCTIONS",
    note: requiredString(formData, "note"),
    subjectId: requiredString(formData, "subjectId"),
    subjectType: requiredString(formData, "subjectType") as
      | "DRAFT_DEAL"
      | "ESCROW_AGREEMENT"
      | "DEAL_MILESTONE_DISPUTE"
      | "FUNDING_TRANSACTION"
      | "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
      | "SYSTEM"
  });

  revalidatePath("/checkpoints");
  redirect(`/checkpoints/${checkpoint.id}`);
}

export async function decideCheckpointAction(formData: FormData): Promise<void> {
  const checkpointId = requiredString(formData, "checkpointId");

  await decideCheckpoint(checkpointId, {
    note: requiredString(formData, "note"),
    status: requiredString(formData, "status") as "CLEARED" | "BLOCKED"
  });

  revalidatePath("/checkpoints");
  redirect(`/checkpoints/${checkpointId}`);
}

export async function createCaseAction(formData: FormData): Promise<void> {
  const complianceCase = await createCase({
    alertId: optionalString(formData, "alertId") ?? undefined,
    checkpointId: optionalString(formData, "checkpointId") ?? undefined,
    severity: requiredString(formData, "severity") as
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL",
    subjectId: requiredString(formData, "subjectId"),
    subjectType: requiredString(formData, "subjectType") as
      | "DRAFT_DEAL"
      | "ESCROW_AGREEMENT"
      | "DEAL_MILESTONE_DISPUTE"
      | "FUNDING_TRANSACTION"
      | "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
      | "SYSTEM",
    summary: requiredString(formData, "summary"),
    title: requiredString(formData, "title")
  });

  revalidatePath("/cases");
  redirect(`/cases/${complianceCase.id}`);
}

export async function addCaseNoteAction(formData: FormData): Promise<void> {
  const caseId = requiredString(formData, "caseId");
  await addCaseNote(caseId, requiredString(formData, "bodyMarkdown"));
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}`);
}

export async function assignCaseAction(formData: FormData): Promise<void> {
  const caseId = requiredString(formData, "caseId");
  await assignCase(caseId, optionalString(formData, "assignedOperatorAccountId"));
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}`);
}

export async function updateCaseStatusAction(formData: FormData): Promise<void> {
  const caseId = requiredString(formData, "caseId");
  await updateCaseStatus(
    caseId,
    requiredString(formData, "status") as
      | "OPEN"
      | "IN_REVIEW"
      | "ESCALATED"
      | "RESOLVED"
  );
  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}`);
}

export async function createProtocolProposalAction(formData: FormData): Promise<void> {
  const rawInput = requiredString(formData, "input");
  const parsedInput = JSON.parse(rawInput) as Record<
    string,
    boolean | number | string | null
  >;
  const proposal = await createProtocolProposal({
    action: requiredString(formData, "action") as
      | "ALLOW_TOKEN"
      | "DISALLOW_TOKEN"
      | "APPROVE_ARBITRATOR"
      | "REVOKE_ARBITRATOR"
      | "SET_TOKEN_ALLOWLIST"
      | "SET_ARBITRATOR_REGISTRY"
      | "SET_FEE_VAULT"
      | "SET_TREASURY"
      | "SET_PROTOCOL_FEE_BPS"
      | "PAUSE_CREATE_ESCROW"
      | "UNPAUSE_CREATE_ESCROW"
      | "PAUSE_FUNDING"
      | "UNPAUSE_FUNDING",
    chainId: requiredInteger(formData, "chainId"),
    description: requiredString(formData, "description"),
    input: parsedInput,
    target: requiredString(formData, "target") as
      | "TokenAllowlist"
      | "ArbitratorRegistry"
      | "ProtocolConfig"
  });

  revalidatePath("/protocol-proposals");
  redirect(`/protocol-proposals/${proposal.proposal.id}`);
}
