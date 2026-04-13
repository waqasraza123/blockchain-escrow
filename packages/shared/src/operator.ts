import { z } from "zod";

import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  JsonObject,
  WalletAddress
} from "./primitives";
import type {
  FundingTransactionIndexedExecutionStatus,
  FundingTransactionReconciledStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus
} from "./funding";
import type { TreasuryMovementKind } from "./indexer";
import {
  sponsoredTransactionKindSchema,
  sponsoredTransactionStatusSchema
} from "./sponsorship";
import type {
  SponsoredTransactionKind,
  SponsoredTransactionStatus
} from "./sponsorship";

export const operatorRoleSchema = z.enum([
  "VIEWER",
  "COMPLIANCE",
  "PROTOCOL_ADMIN",
  "SUPER_ADMIN"
]);
export type OperatorRole = z.infer<typeof operatorRoleSchema>;

export const operatorAlertSeveritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);
export type OperatorAlertSeverity = z.infer<typeof operatorAlertSeveritySchema>;

export const operatorAlertStatusSchema = z.enum([
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED"
]);
export type OperatorAlertStatus = z.infer<typeof operatorAlertStatusSchema>;

export const operatorAlertKindSchema = z.enum([
  "SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW",
  "FUNDING_TRANSACTION_STALE_PENDING",
  "FUNDING_TRANSACTION_FAILED",
  "FUNDING_TRANSACTION_MISMATCHED",
  "SETTLEMENT_EXECUTION_STALE_PENDING",
  "SETTLEMENT_EXECUTION_FAILED",
  "SETTLEMENT_EXECUTION_MISMATCHED",
  "DISPUTE_UNRESOLVED",
  "SERVICE_UNHEALTHY",
  "INDEXER_CURSOR_STALE",
  "INDEXER_DRIFT_FAILURE"
]);
export type OperatorAlertKind = z.infer<typeof operatorAlertKindSchema>;

export const operatorSubjectTypeSchema = z.enum([
  "DRAFT_DEAL",
  "ESCROW_AGREEMENT",
  "DEAL_MILESTONE_DISPUTE",
  "FUNDING_TRANSACTION",
  "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
  "SYSTEM"
]);
export type OperatorSubjectType = z.infer<typeof operatorSubjectTypeSchema>;

export const complianceCheckpointKindSchema = z.enum(["SANCTIONS"]);
export type ComplianceCheckpointKind = z.infer<
  typeof complianceCheckpointKindSchema
>;

export const complianceCheckpointStatusSchema = z.enum([
  "PENDING",
  "CLEARED",
  "BLOCKED"
]);
export type ComplianceCheckpointStatus = z.infer<
  typeof complianceCheckpointStatusSchema
>;

export const complianceCaseStatusSchema = z.enum([
  "OPEN",
  "IN_REVIEW",
  "ESCALATED",
  "RESOLVED"
]);
export type ComplianceCaseStatus = z.infer<typeof complianceCaseStatusSchema>;

export const protocolProposalTargetSchema = z.enum([
  "TokenAllowlist",
  "ArbitratorRegistry",
  "ProtocolConfig"
]);
export type ProtocolProposalTarget = z.infer<
  typeof protocolProposalTargetSchema
>;

export const protocolProposalActionSchema = z.enum([
  "ALLOW_TOKEN",
  "DISALLOW_TOKEN",
  "APPROVE_ARBITRATOR",
  "REVOKE_ARBITRATOR",
  "SET_TOKEN_ALLOWLIST",
  "SET_ARBITRATOR_REGISTRY",
  "SET_FEE_VAULT",
  "SET_TREASURY",
  "SET_PROTOCOL_FEE_BPS",
  "PAUSE_CREATE_ESCROW",
  "UNPAUSE_CREATE_ESCROW",
  "PAUSE_FUNDING",
  "UNPAUSE_FUNDING"
]);
export type ProtocolProposalAction = z.infer<
  typeof protocolProposalActionSchema
>;

export const operatorSearchParamsSchema = z.object({
  q: z.string().trim().min(1).max(160)
});
export type OperatorSearchParams = z.infer<typeof operatorSearchParamsSchema>;

export const listOperatorAlertsParamsSchema = z.object({
  kind: operatorAlertKindSchema.optional(),
  status: operatorAlertStatusSchema.optional()
});
export type ListOperatorAlertsParams = z.infer<
  typeof listOperatorAlertsParamsSchema
>;

export const operatorAlertActionParamsSchema = z.object({
  alertId: z.string().trim().min(1)
});
export type OperatorAlertActionParams = z.infer<
  typeof operatorAlertActionParamsSchema
>;

export const acknowledgeOperatorAlertSchema = z.object({
  note: z.string().trim().min(1).max(2000).optional()
});
export type AcknowledgeOperatorAlertInput = z.infer<
  typeof acknowledgeOperatorAlertSchema
>;

export const resolveOperatorAlertSchema = z.object({
  note: z.string().trim().min(1).max(4000)
});
export type ResolveOperatorAlertInput = z.infer<
  typeof resolveOperatorAlertSchema
>;

export const listOperatorSponsoredTransactionRequestsParamsSchema = z.object({
  kind: sponsoredTransactionKindSchema.optional(),
  status: sponsoredTransactionStatusSchema.optional()
});
export type ListOperatorSponsoredTransactionRequestsParams = z.infer<
  typeof listOperatorSponsoredTransactionRequestsParamsSchema
>;

export const operatorSponsoredTransactionRequestParamsSchema = z.object({
  sponsoredTransactionRequestId: z.string().trim().min(1)
});
export type OperatorSponsoredTransactionRequestParams = z.infer<
  typeof operatorSponsoredTransactionRequestParamsSchema
>;

export const decideSponsoredTransactionRequestSchema = z
  .object({
    note: z.string().trim().max(4000).optional(),
    status: sponsoredTransactionStatusSchema.extract(["APPROVED", "REJECTED"])
  })
  .superRefine((value, context) => {
    if (value.status === "REJECTED" && (!value.note || value.note.trim().length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "a rejection note is required",
        path: ["note"]
      });
    }
  });
export type DecideSponsoredTransactionRequestInput = z.infer<
  typeof decideSponsoredTransactionRequestSchema
>;

export const createComplianceCheckpointSchema = z.object({
  kind: complianceCheckpointKindSchema,
  note: z.string().trim().min(1).max(4000),
  subjectId: z.string().trim().min(1),
  subjectType: operatorSubjectTypeSchema
});
export type CreateComplianceCheckpointInput = z.infer<
  typeof createComplianceCheckpointSchema
>;

export const complianceCheckpointParamsSchema = z.object({
  checkpointId: z.string().trim().min(1)
});
export type ComplianceCheckpointParams = z.infer<
  typeof complianceCheckpointParamsSchema
>;

export const decideComplianceCheckpointSchema = z.object({
  note: z.string().trim().min(1).max(4000),
  status: complianceCheckpointStatusSchema.exclude(["PENDING"])
});
export type DecideComplianceCheckpointInput = z.infer<
  typeof decideComplianceCheckpointSchema
>;

export const createComplianceCaseSchema = z.object({
  alertId: z.string().trim().min(1).optional(),
  checkpointId: z.string().trim().min(1).optional(),
  severity: operatorAlertSeveritySchema,
  subjectId: z.string().trim().min(1),
  subjectType: operatorSubjectTypeSchema,
  summary: z.string().trim().min(1).max(4000),
  title: z.string().trim().min(1).max(160)
});
export type CreateComplianceCaseInput = z.infer<
  typeof createComplianceCaseSchema
>;

export const complianceCaseParamsSchema = z.object({
  caseId: z.string().trim().min(1)
});
export type ComplianceCaseParams = z.infer<typeof complianceCaseParamsSchema>;

export const listComplianceCasesParamsSchema = z.object({
  status: complianceCaseStatusSchema.optional()
});
export type ListComplianceCasesParams = z.infer<
  typeof listComplianceCasesParamsSchema
>;

export const addComplianceCaseNoteSchema = z.object({
  bodyMarkdown: z.string().trim().min(1).max(12000)
});
export type AddComplianceCaseNoteInput = z.infer<
  typeof addComplianceCaseNoteSchema
>;

export const assignComplianceCaseSchema = z.object({
  assignedOperatorAccountId: z.string().trim().min(1).nullable()
});
export type AssignComplianceCaseInput = z.infer<
  typeof assignComplianceCaseSchema
>;

export const updateComplianceCaseStatusSchema = z.object({
  status: complianceCaseStatusSchema
});
export type UpdateComplianceCaseStatusInput = z.infer<
  typeof updateComplianceCaseStatusSchema
>;

export const createProtocolProposalDraftSchema = z.object({
  action: protocolProposalActionSchema,
  chainId: z.number().int().positive(),
  description: z.string().trim().min(1).max(4000),
  input: z.record(z.string(), z.union([z.boolean(), z.number(), z.string(), z.null()])),
  target: protocolProposalTargetSchema
});
export type CreateProtocolProposalDraftInput = z.infer<
  typeof createProtocolProposalDraftSchema
>;

export const protocolProposalDraftParamsSchema = z.object({
  proposalId: z.string().trim().min(1)
});
export type ProtocolProposalDraftParams = z.infer<
  typeof protocolProposalDraftParamsSchema
>;

export interface OperatorProfile {
  id: EntityId;
  role: OperatorRole;
  userId: EntityId;
  walletAddress: WalletAddress;
  walletId: EntityId;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface OperatorPermissionSet {
  canManageCases: boolean;
  canManageCheckpoints: boolean;
  canManageProtocolProposals: boolean;
  canManageSponsoredTransactions: boolean;
  canResolveAlerts: boolean;
  canViewOperatorConsole: boolean;
}

export interface OperatorSessionResponse {
  operator: OperatorProfile;
  permissions: OperatorPermissionSet;
}

export interface OperatorSubjectSummary {
  agreementAddress: WalletAddress | null;
  dealVersionId: EntityId | null;
  draftDealId: EntityId | null;
  label: string | null;
  organizationId: EntityId | null;
  subjectId: EntityId;
  subjectType: OperatorSubjectType;
}

export interface OperatorSearchHit {
  entityType:
    | "DRAFT_DEAL"
    | "DEAL_VERSION"
    | "ESCROW_AGREEMENT"
    | "DEAL_MILESTONE_DISPUTE"
    | "FUNDING_TRANSACTION"
    | "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION";
  id: EntityId;
  organizationId: EntityId | null;
  primaryIdentifier: string;
  route: string;
  status: string | null;
  subtitle: string | null;
  title: string;
}

export interface OperatorSearchResponse {
  hits: OperatorSearchHit[];
}

export interface RemoteServiceHealth {
  details: JsonObject | null;
  ready: boolean;
  service: "api" | "worker" | "indexer";
  status: "HEALTHY" | "UNHEALTHY" | "UNREACHABLE";
}

export interface OperatorHealthResponse {
  cursorFresh: boolean;
  cursorUpdatedAt: IsoTimestamp | null;
  indexer: RemoteServiceHealth;
  manifest: {
    chainId: ChainId;
    contractVersion: number;
    deploymentStartBlock: string | null;
    network: string;
  } | null;
  worker: RemoteServiceHealth;
  api: RemoteServiceHealth;
}

export interface OperatorDeploymentProtocolConfigSummary {
  address: WalletAddress | null;
  createEscrowPaused: boolean | null;
  feeVaultAddress: WalletAddress | null;
  fundingPaused: boolean | null;
  indexed: boolean;
  owner: WalletAddress | null;
  pendingOwner: WalletAddress | null;
  protocolFeeBps: number | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp | null;
}

export interface OperatorDeploymentFeeVaultSummary {
  address: WalletAddress | null;
  indexed: boolean;
  owner: WalletAddress | null;
  pendingOwner: WalletAddress | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp | null;
}

export interface OperatorDeploymentSummary {
  agreementCount: number;
  chainId: ChainId;
  contractVersion: number;
  cursorFresh: boolean;
  cursorKey: string;
  cursorUpdatedAt: IsoTimestamp | null;
  deploymentStartBlock: string | null;
  explorerUrl: string;
  feeVault: OperatorDeploymentFeeVaultSummary;
  manifestOwner: WalletAddress | null;
  manifestPendingOwner: WalletAddress | null;
  manifestProtocolFeeBps: number;
  manifestTreasuryAddress: WalletAddress | null;
  network: string;
  protocolConfig: OperatorDeploymentProtocolConfigSummary;
  settlementTokenAddress: WalletAddress | null;
  treasury: {
    feeVaultAddress: WalletAddress | null;
    manifestAddress: WalletAddress | null;
    protocolConfigAddress: WalletAddress | null;
    status: "CONSISTENT" | "MISMATCHED" | "PARTIAL" | "UNINDEXED";
  };
}

export interface ListOperatorDeploymentsResponse {
  deployments: OperatorDeploymentSummary[];
}

export interface OperatorTreasuryMovementSummary {
  amount: string;
  chainId: ChainId;
  contractVersion: number;
  explorerUrl: string;
  feeVaultAddress: WalletAddress;
  kind: TreasuryMovementKind;
  network: string;
  occurredAt: IsoTimestamp;
  occurredBlockNumber: string;
  occurredLogIndex: number;
  tokenAddress: WalletAddress | null;
  transactionHash: HexString;
  treasuryAddress: WalletAddress;
}

export interface ListOperatorTreasuryMovementsResponse {
  movements: OperatorTreasuryMovementSummary[];
}

export interface OperatorFundingTransactionSummary {
  agreementAddress: WalletAddress | null;
  chainId: ChainId;
  confirmedAt: IsoTimestamp | null;
  contractVersion: number;
  dealVersionId: EntityId;
  dealVersionTitle: string | null;
  draftDealId: EntityId;
  draftDealTitle: string | null;
  explorerUrl: string;
  id: EntityId;
  indexedAt: IsoTimestamp | null;
  indexedBlockNumber: string | null;
  indexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
  matchesTrackedVersion: boolean | null;
  network: string;
  organizationId: EntityId;
  organizationName: string | null;
  reconciledAt: IsoTimestamp | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
  stalePending: boolean | null;
  stalePendingAt: IsoTimestamp | null;
  stalePendingEscalatedAt: IsoTimestamp | null;
  stalePendingEvaluation: FundingTransactionStalePendingEvaluation | null;
  status: FundingTransactionStatus;
  submittedAt: IsoTimestamp;
  submittedByUserId: EntityId;
  submittedWalletAddress: WalletAddress;
  supersededAt: IsoTimestamp | null;
  supersededByFundingTransactionId: EntityId | null;
  supersededByTransactionHash: HexString | null;
  transactionHash: HexString;
}

export interface ListOperatorFundingTransactionsResponse {
  fundingTransactions: OperatorFundingTransactionSummary[];
}

export interface ReconciliationQueueSummaryRow {
  agreementAddress: WalletAddress | null;
  chainId: ChainId | null;
  entityId: EntityId;
  kind: string;
  organizationId: EntityId | null;
  status: string;
  subject: OperatorSubjectSummary;
  updatedAt: IsoTimestamp;
}

export interface OperatorReconciliationResponse {
  failedFundingCount: number;
  failedSettlementExecutionCount: number;
  mismatchedFundingCount: number;
  mismatchedSettlementExecutionCount: number;
  openDisputeCount: number;
  queue: ReconciliationQueueSummaryRow[];
  staleFundingCount: number;
  staleSettlementExecutionCount: number;
  unresolvedOperatorReviewCount: number;
}

export interface OperatorAlertSummary {
  acknowledgedAt: IsoTimestamp | null;
  acknowledgedByOperatorAccountId: EntityId | null;
  assignedOperatorAccountId: EntityId | null;
  description: string;
  firstDetectedAt: IsoTimestamp;
  id: EntityId;
  kind: OperatorAlertKind;
  lastDetectedAt: IsoTimestamp;
  metadata: JsonObject | null;
  resolvedAt: IsoTimestamp | null;
  resolvedByOperatorAccountId: EntityId | null;
  severity: OperatorAlertSeverity;
  status: OperatorAlertStatus;
  subject: OperatorSubjectSummary;
}

export interface ListOperatorAlertsResponse {
  alerts: OperatorAlertSummary[];
}

export interface OperatorSponsoredTransactionRequestSummary {
  amountMinor: string;
  approvedAt: IsoTimestamp | null;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  decidedByOperatorAccountId: EntityId | null;
  expiresAt: IsoTimestamp;
  gasPolicyId: EntityId | null;
  id: EntityId;
  kind: SponsoredTransactionKind;
  organizationId: EntityId;
  reason: string | null;
  rejectedAt: IsoTimestamp | null;
  requestedByUserId: EntityId;
  status: SponsoredTransactionStatus;
  subject: OperatorSubjectSummary;
  submittedAt: IsoTimestamp | null;
  submittedTransactionHash: HexString | null;
  walletAddress: WalletAddress;
}

export interface ListOperatorSponsoredTransactionRequestsResponse {
  sponsoredTransactionRequests: OperatorSponsoredTransactionRequestSummary[];
}

export interface ComplianceCheckpointSummary {
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  decisionNote: string | null;
  decidedAt: IsoTimestamp | null;
  decidedByOperatorAccountId: EntityId | null;
  id: EntityId;
  kind: ComplianceCheckpointKind;
  linkedComplianceCaseId: EntityId | null;
  note: string;
  status: ComplianceCheckpointStatus;
  subject: OperatorSubjectSummary;
}

export interface ListComplianceCheckpointsResponse {
  checkpoints: ComplianceCheckpointSummary[];
}

export interface ComplianceCaseSummary {
  assignedOperatorAccountId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  id: EntityId;
  lastNoteAt: IsoTimestamp | null;
  linkedAlertId: EntityId | null;
  linkedCheckpointId: EntityId | null;
  severity: OperatorAlertSeverity;
  status: ComplianceCaseStatus;
  subject: OperatorSubjectSummary;
  summary: string;
  title: string;
}

export interface ComplianceCaseNoteSummary {
  authorOperatorAccountId: EntityId;
  bodyMarkdown: string;
  createdAt: IsoTimestamp;
  id: EntityId;
}

export interface ListComplianceCasesResponse {
  cases: ComplianceCaseSummary[];
}

export interface ComplianceCaseDetailResponse {
  case: ComplianceCaseSummary;
  notes: ComplianceCaseNoteSummary[];
}

export interface ProtocolProposalDraftSummary {
  action: ProtocolProposalAction;
  calldata: HexString;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  description: string;
  id: EntityId;
  input: JsonObject;
  target: ProtocolProposalTarget;
  targetAddress: WalletAddress;
  value: string;
}

export interface ListProtocolProposalDraftsResponse {
  proposals: ProtocolProposalDraftSummary[];
}

export interface ProtocolProposalDraftDetailResponse {
  proposal: ProtocolProposalDraftSummary;
}

export interface OperatorDashboardCard {
  key:
    | "open_alerts"
    | "open_cases"
    | "pending_sponsorship_requests"
    | "pending_checkpoints"
    | "stale_funding"
    | "stale_settlement"
    | "open_disputes";
  value: number;
}

export interface OperatorDashboardResponse {
  cards: OperatorDashboardCard[];
  health: OperatorHealthResponse;
  recentAlerts: OperatorAlertSummary[];
  reconciliation: OperatorReconciliationResponse;
}
