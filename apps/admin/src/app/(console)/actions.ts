"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CreatePartnerWebhookSubscriptionInput } from "@blockchain-escrow/shared";

import {
  acknowledgeAlert,
  addCaseNote,
  assignCase,
  assignBillingPlan,
  createBillingFeeSchedule,
  createBillingPlan,
  createPartnerAccount,
  createPartnerApiKey,
  createPartnerOrganizationLink,
  createTenantDomain,
  createPartnerWebhookSubscription,
  createCase,
  createCheckpoint,
  createProtocolProposal,
  decideSponsoredTransactionRequest,
  decideCheckpoint,
  disableTenantDomain,
  registerPartnerBrandAsset,
  revokePartnerApiKey,
  upsertTenantSettings,
  updateBillingPlan,
  updateInvoiceStatus,
  activateTenantDomain,
  verifyTenantDomain,
  rotatePartnerWebhookSubscriptionSecret,
  resolveAlert,
  updatePartnerWebhookSubscription,
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

export async function decideSponsoredTransactionRequestAction(
  formData: FormData
): Promise<void> {
  await decideSponsoredTransactionRequest(
    requiredString(formData, "sponsoredTransactionRequestId"),
    {
      note: optionalString(formData, "note") ?? undefined,
      status: requiredString(formData, "status") as "APPROVED" | "REJECTED"
    }
  );

  revalidatePath("/sponsorship");
  redirect("/sponsorship");
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

export async function createPartnerAccountAction(formData: FormData): Promise<void> {
  const partner = await createPartnerAccount({
    metadata: optionalString(formData, "metadata")
      ? JSON.parse(requiredString(formData, "metadata")) as Record<string, unknown>
      : undefined,
    name: requiredString(formData, "name"),
    slug: requiredString(formData, "slug")
  });

  revalidatePath("/partners");
  redirect(`/partners/${partner.partnerAccount.id}`);
}

export async function createPartnerOrganizationLinkAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await createPartnerOrganizationLink(partnerAccountId, {
    actingUserId: requiredString(formData, "actingUserId"),
    actingWalletId: requiredString(formData, "actingWalletId"),
    externalReference: optionalString(formData, "externalReference") ?? undefined,
    organizationId: requiredString(formData, "organizationId")
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function createPartnerApiKeyAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await createPartnerApiKey(requiredString(formData, "partnerOrganizationLinkId"), {
    displayName: requiredString(formData, "displayName"),
    expiresAt: optionalString(formData, "expiresAt") ?? undefined
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function revokePartnerApiKeyAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await revokePartnerApiKey(
    requiredString(formData, "partnerApiKeyId"),
    optionalString(formData, "reason") ?? undefined
  );

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function createPartnerWebhookSubscriptionAction(
  formData: FormData
): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await createPartnerWebhookSubscription(requiredString(formData, "partnerOrganizationLinkId"), {
    displayName: requiredString(formData, "displayName"),
    endpointUrl: requiredString(formData, "endpointUrl"),
    eventTypes: requiredString(formData, "eventTypes")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) as CreatePartnerWebhookSubscriptionInput["eventTypes"]
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function updatePartnerWebhookSubscriptionAction(
  formData: FormData
): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await updatePartnerWebhookSubscription(
    requiredString(formData, "partnerWebhookSubscriptionId"),
    requiredString(formData, "status") as "ACTIVE" | "PAUSED" | "DISABLED"
  );

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function rotatePartnerWebhookSubscriptionSecretAction(
  formData: FormData
): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await rotatePartnerWebhookSubscriptionSecret(
    requiredString(formData, "partnerWebhookSubscriptionId")
  );

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function upsertTenantSettingsAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await upsertTenantSettings(partnerAccountId, {
    accentColorHex: requiredString(formData, "accentColorHex"),
    backgroundColorHex: requiredString(formData, "backgroundColorHex"),
    displayName: requiredString(formData, "displayName"),
    faviconAssetId: optionalString(formData, "faviconAssetId"),
    legalName: requiredString(formData, "legalName"),
    logoAssetId: optionalString(formData, "logoAssetId"),
    primaryColorHex: requiredString(formData, "primaryColorHex"),
    privacyPolicyUrl: requiredString(formData, "privacyPolicyUrl"),
    supportEmail: requiredString(formData, "supportEmail"),
    supportUrl: requiredString(formData, "supportUrl"),
    termsOfServiceUrl: requiredString(formData, "termsOfServiceUrl"),
    textColorHex: requiredString(formData, "textColorHex")
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function registerPartnerBrandAssetAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await registerPartnerBrandAsset(partnerAccountId, {
    byteSize: requiredInteger(formData, "byteSize"),
    mediaType: requiredString(formData, "mediaType"),
    originalFilename: requiredString(formData, "originalFilename"),
    role: requiredString(formData, "role") as "LOGO" | "FAVICON",
    sha256Hex: requiredString(formData, "sha256Hex"),
    storageKey: requiredString(formData, "storageKey")
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function createTenantDomainAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await createTenantDomain(partnerAccountId, {
    hostname: requiredString(formData, "hostname"),
    surface: requiredString(formData, "surface") as "ENTRYPOINT" | "HOSTED"
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function verifyTenantDomainAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await verifyTenantDomain(requiredString(formData, "domainId"));
  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function activateTenantDomainAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await activateTenantDomain(requiredString(formData, "domainId"));
  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function disableTenantDomainAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await disableTenantDomain(requiredString(formData, "domainId"));
  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function createBillingPlanAction(formData: FormData): Promise<void> {
  const plan = await createBillingPlan({
    baseMonthlyFeeMinor: requiredString(formData, "baseMonthlyFeeMinor"),
    code: requiredString(formData, "code"),
    currency: "USD",
    displayName: requiredString(formData, "displayName"),
    invoiceDueDays: requiredInteger(formData, "invoiceDueDays")
  });

  revalidatePath("/billing");
  redirect(`/billing?billingPlanId=${plan.billingPlan.id}`);
}

export async function updateBillingPlanAction(formData: FormData): Promise<void> {
  const billingPlanId = requiredString(formData, "billingPlanId");
  await updateBillingPlan(billingPlanId, {
    baseMonthlyFeeMinor: optionalString(formData, "baseMonthlyFeeMinor") ?? undefined,
    currency: "USD",
    displayName: optionalString(formData, "displayName") ?? undefined,
    invoiceDueDays: optionalString(formData, "invoiceDueDays")
      ? requiredInteger(formData, "invoiceDueDays")
      : undefined,
    status:
      (optionalString(formData, "status") as "ACTIVE" | "ARCHIVED" | null) ?? undefined
  });

  revalidatePath("/billing");
  redirect(`/billing?billingPlanId=${billingPlanId}`);
}

export async function createBillingFeeScheduleAction(formData: FormData): Promise<void> {
  const billingPlanId = requiredString(formData, "billingPlanId");
  await createBillingFeeSchedule(billingPlanId, {
    effectiveFrom: requiredString(formData, "effectiveFrom"),
    tiers: [
      {
        includedUnits: requiredString(formData, "includedUnits"),
        metric: requiredString(formData, "metric") as
          | "PARTNER_API_WRITE_REQUEST"
          | "PARTNER_WEBHOOK_DELIVERY_ATTEMPT"
          | "PARTNER_WEBHOOK_DELIVERY_SUCCESS"
          | "PARTNER_HOSTED_SESSION_CREATED"
          | "PARTNER_HOSTED_SESSION_COMPLETED",
        startsAtUnit: requiredString(formData, "startsAtUnit"),
        unitPriceMinor: requiredString(formData, "unitPriceMinor"),
        upToUnit: optionalString(formData, "upToUnit")
      }
    ]
  });

  revalidatePath("/billing");
  redirect(`/billing?billingPlanId=${billingPlanId}`);
}

export async function assignBillingPlanAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await assignBillingPlan(partnerAccountId, {
    billingFeeScheduleId: requiredString(formData, "billingFeeScheduleId"),
    billingPlanId: requiredString(formData, "billingPlanId"),
    effectiveFrom: requiredString(formData, "effectiveFrom")
  });

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}

export async function updateInvoiceStatusAction(formData: FormData): Promise<void> {
  const partnerAccountId = requiredString(formData, "partnerAccountId");
  await updateInvoiceStatus(
    requiredString(formData, "invoiceId"),
    requiredString(formData, "status") as
      | "FINALIZED"
      | "SENT"
      | "PAID"
      | "DISPUTED"
      | "VOID"
  );

  revalidatePath(`/partners/${partnerAccountId}`);
  redirect(`/partners/${partnerAccountId}`);
}
