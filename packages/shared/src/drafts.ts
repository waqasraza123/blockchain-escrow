import { z } from "zod";

import type { CounterpartySummary } from "./counterparties";
import type { FileSummary } from "./files";
import type { EntityId, IsoTimestamp, WalletAddress } from "./primitives";

export const dealStateSchema = z.enum([
  "DRAFT",
  "AWAITING_SELLER_ACCEPTANCE",
  "AWAITING_FUNDING",
  "ACTIVE",
  "UNDER_REVIEW",
  "DISPUTED",
  "PARTIALLY_RELEASED",
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
  "EXPIRED"
]);
export type DealState = z.infer<typeof dealStateSchema>;

export const dealPartyRoleSchema = z.enum(["BUYER", "SELLER"]);
export type DealPartyRole = z.infer<typeof dealPartyRoleSchema>;

export const dealPartySubjectTypeSchema = z.enum([
  "ORGANIZATION",
  "COUNTERPARTY"
]);
export type DealPartySubjectType = z.infer<typeof dealPartySubjectTypeSchema>;

export const settlementCurrencySchema = z.enum(["USDC"]);
export type SettlementCurrency = z.infer<typeof settlementCurrencySchema>;

export const createDraftDealSchema = z.object({
  counterpartyId: z.string().trim().min(1),
  organizationRole: dealPartyRoleSchema,
  settlementCurrency: settlementCurrencySchema,
  summary: z.string().trim().min(1).max(2000).optional(),
  templateId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200)
});
export type CreateDraftDealInput = z.infer<typeof createDraftDealSchema>;

export const updateDraftCounterpartyWalletSchema = z.object({
  walletAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/)
});
export type UpdateDraftCounterpartyWalletInput = z.infer<
  typeof updateDraftCounterpartyWalletSchema
>;

export const draftDealParamsSchema = z.object({
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DraftDealParams = z.infer<typeof draftDealParamsSchema>;

export const organizationDraftDealsParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationDraftDealsParams = z.infer<
  typeof organizationDraftDealsParamsSchema
>;

export const draftDealMilestoneInputSchema = z.object({
  amountMinor: z.string().trim().regex(/^[0-9]+$/),
  description: z.string().trim().min(1).max(2000).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().trim().min(1).max(200)
});
export type DraftDealMilestoneInput = z.infer<typeof draftDealMilestoneInputSchema>;

export const createDealVersionSchema = z.object({
  attachmentFileIds: z.array(z.string().trim().min(1)).max(50).optional(),
  bodyMarkdown: z.string().trim().min(1).max(50000),
  milestoneSnapshots: z.array(draftDealMilestoneInputSchema).min(1).max(100),
  summary: z.string().trim().min(1).max(2000).optional(),
  templateId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200).optional()
});
export type CreateDealVersionInput = z.infer<typeof createDealVersionSchema>;

export interface DraftDealSummary {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  state: DealState;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  updatedAt: IsoTimestamp;
}

export interface DraftDealPartySummary {
  counterpartyId: CounterpartySummary["id"] | null;
  createdAt: IsoTimestamp;
  displayName: string;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
  updatedAt: IsoTimestamp;
  walletAddress: WalletAddress | null;
}

export interface DealVersionSummary {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  versionNumber: number;
}

export interface DealVersionPartySnapshot {
  counterpartyId: CounterpartySummary["id"] | null;
  createdAt: IsoTimestamp;
  displayName: string;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
}

export interface DealVersionMilestoneSnapshot {
  amountMinor: string;
  description: string | null;
  dueAt: IsoTimestamp | null;
  id: EntityId;
  position: number;
  title: string;
}

export interface DealVersionDetail extends DealVersionSummary {
  bodyMarkdown: string;
  files: FileSummary[];
  milestones: DealVersionMilestoneSnapshot[];
  parties: DealVersionPartySnapshot[];
}

export interface DraftDealListItem {
  draft: DraftDealSummary;
  latestVersion: DealVersionSummary | null;
  parties: DraftDealPartySummary[];
}

export interface ListDraftDealsResponse {
  drafts: DraftDealListItem[];
}

export interface DraftDealDetailResponse {
  draft: DraftDealSummary;
  parties: DraftDealPartySummary[];
  versions: DealVersionDetail[];
}

export type CreateDraftDealResponse = DraftDealDetailResponse;

export interface CreateDealVersionResponse {
  version: DealVersionDetail;
}

export interface UpdateDraftCounterpartyWalletResponse {
  party: DraftDealPartySummary;
}
