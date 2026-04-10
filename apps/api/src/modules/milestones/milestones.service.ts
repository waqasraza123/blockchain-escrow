import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  deploymentSupportsMilestoneSettlementExecution,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  DealMilestoneDisputeAssignmentRecord,
  DealMilestoneDisputeDecisionRecord,
  DealMilestoneDisputeEvidenceRecord,
  DealMilestoneDisputeRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealMilestoneReviewDeadlineExpiryRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementPreparationRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  FileRecord,
  IndexedTransactionRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  assignMilestoneDisputeArbitratorSchema,
  buildSettlementExecutionTransactionObservation,
  createMilestoneDisputeDecisionSchema,
  createMilestoneDisputeSchema,
  createCounterpartyMilestoneSubmissionSchema,
  createMilestoneReviewSchema,
  createMilestoneSettlementRequestSchema,
  createMilestoneSettlementExecutionTransactionSchema,
  createMilestoneSubmissionSchema,
  dealVersionMilestoneDisputeParamsSchema,
  dealVersionMilestoneWorkflowParamsSchema,
  isCustodyTrackedDealState,
  isMilestoneWorkflowOpenDealState,
  milestoneDisputeParamsSchema,
  milestoneSettlementExecutionTransactionParamsSchema,
  milestoneReviewParamsSchema,
  milestoneSettlementRequestParamsSchema,
  milestoneSubmissionParamsSchema,
  prepareMilestoneDisputeDecisionSchema,
  prepareCounterpartyMilestoneSubmissionSchema,
  resolveSettlementExecutionTransactionStalePendingState,
  resolveSettlementExecutionTransactionState,
  type JsonObject,
  type CounterpartyDealMilestoneSubmissionChallenge,
  type CreateDealMilestoneDisputeDecisionResponse,
  type CreateDealMilestoneDisputeResponse,
  type CreateDealMilestoneSettlementExecutionTransactionResponse,
  type CreateCounterpartyDealMilestoneSubmissionResponse,
  type AssignDealMilestoneDisputeArbitratorResponse,
  type CreateDealMilestoneReviewResponse,
  type CreateDealMilestoneSettlementRequestResponse,
  type CreateDealMilestoneSubmissionResponse,
  type DealMilestoneDisputeAssignmentSummary,
  type DealMilestoneDisputeDecisionChallenge,
  type DealMilestoneDisputeDecisionSummary,
  type DealMilestoneDisputeEvidenceSummary,
  type DealMilestoneDisputePacket,
  type DealMilestoneDisputeSummary,
  type DealVersionMilestoneStatement,
  type DealMilestoneIndexedSettlementSummary,
  type DealMilestoneSettlementExecutionTransactionSummary,
  type DealVersionSettlementStatementSummary,
  type GetDealVersionSettlementStatementResponse,
  type GetMilestoneSettlementExecutionPlanResponse,
  type DealMilestoneTimelineEvent,
  type DealMilestoneReviewSummary,
  type MilestoneSettlementExecutionPlanSummary,
  type DealMilestoneSettlementPreparationSummary,
  type DealMilestoneSettlementRequestSummary,
  type DealMilestoneSettlementExecutionSummary,
  type DealMilestoneSubmissionSummary,
  type DealVersionMilestoneTimeline,
  type DealVersionMilestoneSnapshot,
  type DealVersionMilestoneWorkflow,
  type ListDealVersionMilestoneDisputesResponse,
  type ListDealMilestoneSettlementExecutionTransactionsResponse,
  type ListDealVersionMilestoneSettlementExecutionsResponse,
  type ListDealVersionMilestoneTimelinesResponse,
  type ListDealVersionMilestoneWorkflowsResponse,
  type MilestoneSettlementExecutionBlocker,
  type MilestoneReviewDeadlineSummary,
  type MilestoneWorkflowState,
  milestoneSettlementExecutionPlanParamsSchema,
  type PrepareCounterpartyDealMilestoneSubmissionResponse,
  type PrepareDealMilestoneDisputeDecisionResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { getAddress, verifyTypedData } from "viem";

import {
  RELEASE1_REPOSITORIES,
  RELEASE4_REPOSITORIES
} from "../../infrastructure/tokens";
import { ApprovalRuntimeService } from "../approvals/approval-runtime.service";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash,
  buildCounterpartyMilestoneSubmissionTypedData,
  buildMilestoneDisputeDecisionTypedData,
  counterpartyMilestoneSubmissionPrimaryType,
  counterpartyMilestoneSubmissionTypes,
  milestoneDisputeDecisionPrimaryType,
  milestoneDisputeDecisionTypes,
  normalizeApiChainId
} from "../drafts/deal-identity";
import {
  MILESTONE_REVIEW_CONFIGURATION,
  MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION,
  resolveMilestoneSettlementExecutionReconciliationCursorKey,
  type MilestoneReviewConfiguration,
  type MilestoneSettlementExecutionReconciliationConfiguration
} from "./milestones.tokens";

interface MilestoneWorkflowAccessContext {
  actor: AuthenticatedSessionContext;
  draft: DraftDealRecord;
  membership: OrganizationMemberRecord;
  organization: OrganizationRecord;
  organizationParty: DealVersionPartyRecord;
  sellerParty: DealVersionPartyRecord;
  version: DealVersionRecord;
}

interface MilestoneAccessContext extends MilestoneWorkflowAccessContext {
  linkedAgreement: EscrowAgreementRecord | null;
  milestone: DealVersionMilestoneRecord;
}

interface MilestoneReviewAccessContext extends MilestoneAccessContext {
  latestSubmission: DealMilestoneSubmissionRecord;
  review: DealMilestoneReviewRecord | null;
  submission: DealMilestoneSubmissionRecord;
}

interface MilestoneSettlementRequestAccessContext
  extends MilestoneReviewAccessContext {
  dispute: DealMilestoneDisputeRecord | null;
  settlementRequest: DealMilestoneSettlementRequestRecord | null;
}

type MilestoneDisputeAccessContext = MilestoneSettlementRequestAccessContext;

interface ExistingMilestoneDisputeAccessContext extends MilestoneAccessContext {
  dispute: DealMilestoneDisputeRecord;
  linkedAgreement: EscrowAgreementRecord;
  review: DealMilestoneReviewRecord;
  settlementRequest: DealMilestoneSettlementRequestRecord | null;
  submission: DealMilestoneSubmissionRecord;
}

interface LoadedMilestoneDisputeRecords {
  disputes: DealMilestoneDisputeRecord[];
  disputesById: ReadonlyMap<string, DealMilestoneDisputeRecord>;
  disputesByReviewId: ReadonlyMap<string, DealMilestoneDisputeRecord>;
  disputeEvidenceByDisputeId: ReadonlyMap<
    string,
    DealMilestoneDisputeEvidenceRecord[]
  >;
  latestDisputeAssignmentsByDisputeId: ReadonlyMap<
    string,
    DealMilestoneDisputeAssignmentRecord
  >;
  disputeDecisionsByDisputeId: ReadonlyMap<
    string,
    DealMilestoneDisputeDecisionRecord
  >;
  disputeDecisionsBySettlementRequestId: ReadonlyMap<
    string,
    DealMilestoneDisputeDecisionRecord
  >;
}

interface CounterpartyMilestoneSubmissionContext {
  counterpartyParty: DraftDealPartyRecord;
  draft: DraftDealRecord;
  linkedAgreement: EscrowAgreementRecord | null;
  milestone: DealVersionMilestoneRecord;
  submissionNumber: number;
  typedData: CounterpartyDealMilestoneSubmissionChallenge["typedData"];
  version: DealVersionRecord;
  versionSellerParty: DealVersionPartyRecord;
}

interface LoadedMilestoneVersionRecords {
  disputeRecords: LoadedMilestoneDisputeRecords;
  deadlineExpiriesBySubmissionId: ReadonlyMap<
    string,
    DealMilestoneReviewDeadlineExpiryRecord
  >;
  evaluatedAt: string;
  milestones: DealVersionMilestoneRecord[];
  reviewsById: ReadonlyMap<string, DealMilestoneReviewRecord>;
  reviewsBySubmissionId: ReadonlyMap<string, DealMilestoneReviewRecord>;
  settlementRequests: DealMilestoneSettlementRequestRecord[];
  settlementRequestsById: ReadonlyMap<string, DealMilestoneSettlementRequestRecord>;
  settlementRequestsByReviewId: ReadonlyMap<
    string,
    DealMilestoneSettlementRequestRecord
  >;
  settlementPreparationsByRequestId: ReadonlyMap<
    string,
    DealMilestoneSettlementPreparationRecord
  >;
  submissionsById: ReadonlyMap<string, DealMilestoneSubmissionRecord>;
  submissionsByMilestoneId: ReadonlyMap<string, DealMilestoneSubmissionRecord[]>;
}

function toMilestoneSnapshot(
  milestone: DealVersionMilestoneRecord
): DealVersionMilestoneSnapshot {
  return {
    amountMinor: milestone.amountMinor,
    description: milestone.description,
    dueAt: milestone.dueAt,
    id: milestone.id,
    position: milestone.position,
    title: milestone.title
  };
}

function resolveMilestoneWorkflowState(
  latestSubmission: DealMilestoneSubmissionSummary | null,
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null,
  currentDispute: DealMilestoneDisputeSummary | null
): MilestoneWorkflowState {
  if (indexedSettlement) {
    return indexedSettlement.kind === "RELEASE" ? "RELEASED" : "REFUNDED";
  }

  if (currentDispute?.status === "OPEN") {
    return "DISPUTED";
  }

  if (!latestSubmission) {
    return "PENDING";
  }

  if (
    latestSubmission.review?.settlementRequest?.source === "ARBITRATOR_DECISION"
  ) {
    return latestSubmission.review.settlementRequest.kind === "RELEASE"
      ? "APPROVED"
      : "REJECTED";
  }

  if (!latestSubmission.review) {
    return "SUBMITTED";
  }

  return latestSubmission.review.decision;
}

function addSecondsToIsoTimestamp(timestamp: string, seconds: number): string {
  return new Date(new Date(timestamp).getTime() + seconds * 1000).toISOString();
}

function isIsoTimestampAtOrAfter(left: string, right: string): boolean {
  return new Date(left).getTime() >= new Date(right).getTime();
}

function isIsoTimestampAfter(left: string, right: string): boolean {
  return new Date(left).getTime() > new Date(right).getTime();
}

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function compareTimelineEvents(
  left: DealMilestoneTimelineEvent,
  right: DealMilestoneTimelineEvent
): number {
  const priority: Record<DealMilestoneTimelineEvent["kind"], number> = {
    DISPUTE_ARBITRATOR_ASSIGNED: 3,
    DISPUTE_DECISION_SUBMITTED: 4,
    DISPUTE_OPENED: 2,
    REFUND_EXECUTED: 7,
    REFUND_REQUESTED: 5,
    RELEASE_EXECUTED: 7,
    RELEASE_REQUESTED: 5,
    REVIEW_APPROVED: 1,
    REVIEW_DEADLINE_EXPIRED: 2,
    REVIEW_REJECTED: 1,
    SETTLEMENT_PREPARED: 6,
    SUBMISSION_CREATED: 0
  };

  return (
    compareIsoTimestamps(left.occurredAt, right.occurredAt) ||
    priority[left.kind] - priority[right.kind] ||
    left.id.localeCompare(right.id)
  );
}

function createEmptyLoadedMilestoneDisputeRecords(): LoadedMilestoneDisputeRecords {
  return {
    disputeDecisionsByDisputeId: new Map(),
    disputeDecisionsBySettlementRequestId: new Map(),
    disputeEvidenceByDisputeId: new Map(),
    disputes: [],
    disputesById: new Map(),
    disputesByReviewId: new Map(),
    latestDisputeAssignmentsByDisputeId: new Map()
  };
}

@Injectable()
export class MilestonesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    private readonly approvalRuntimeService: ApprovalRuntimeService,
    @Inject(MILESTONE_REVIEW_CONFIGURATION)
    private readonly milestoneReviewConfiguration: MilestoneReviewConfiguration,
    @Inject(MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION)
    private readonly milestoneSettlementExecutionReconciliationConfiguration: MilestoneSettlementExecutionReconciliationConfiguration
  ) {}

  async listMilestoneWorkflows(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealVersionMilestoneWorkflowsResponse> {
    const parsed = dealVersionMilestoneWorkflowParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );

    return {
      milestones: await this.buildMilestoneWorkflows(
        access.version.id,
        await this.findLinkedAgreementForDraft(access.draft)
      )
    };
  }

  async listMilestoneTimelines(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealVersionMilestoneTimelinesResponse> {
    const parsed = dealVersionMilestoneWorkflowParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );

    return {
      milestones: await this.buildMilestoneTimelines(
        access.version.id,
        await this.findLinkedAgreementForDraft(access.draft)
      )
    };
  }

  async listMilestoneDisputes(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealVersionMilestoneDisputesResponse> {
    const parsed = dealVersionMilestoneWorkflowParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);

    return {
      disputes: await this.buildMilestoneDisputePackets(records, linkedAgreement)
    };
  }

  async listMilestoneSettlementExecutions(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealVersionMilestoneSettlementExecutionsResponse> {
    const parsed = dealVersionMilestoneWorkflowParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);

    return {
      settlements: await this.buildMilestoneSettlementExecutions(
        records,
        linkedAgreement
      )
    };
  }

  async getSettlementStatement(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<GetDealVersionSettlementStatementResponse> {
    const parsed = dealVersionMilestoneWorkflowParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);

    return this.buildSettlementStatement(access.draft, records, linkedAgreement);
  }

  async getMilestoneSettlementExecutionPlan(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<GetMilestoneSettlementExecutionPlanResponse> {
    const parsed = milestoneSettlementExecutionPlanParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);
    const settlementRequest =
      records.settlementRequestsById.get(
        parsed.data.dealMilestoneSettlementRequestId
      ) ?? null;

    if (!settlementRequest) {
      throw new NotFoundException("deal milestone settlement request not found");
    }

    return {
      plan: this.buildMilestoneSettlementExecutionPlan(
        records,
        linkedAgreement,
        settlementRequest,
        await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement)
      )
    };
  }

  async listMilestoneSettlementExecutionTransactions(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealMilestoneSettlementExecutionTransactionsResponse> {
    const parsed =
      milestoneSettlementExecutionTransactionParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);
    const settlementRequest = this.requireLoadedSettlementRequest(
      records,
      parsed.data.dealMilestoneSettlementRequestId
    );
    const executionTransactions =
      await this.repositories.dealMilestoneSettlementExecutionTransactions.listByDealMilestoneSettlementRequestId(
        settlementRequest.id
      );
    const chainId =
      linkedAgreement?.chainId ??
      records.settlementPreparationsByRequestId.get(settlementRequest.id)?.chainId ??
      normalizeApiChainId();
    const release4CursorKey =
      resolveMilestoneSettlementExecutionReconciliationCursorKey(
        this.milestoneSettlementExecutionReconciliationConfiguration,
        chainId
      );
    const [indexedTransactions, release4ChainCursor] = await Promise.all([
      this.release4Repositories.indexedTransactions.listByChainId(chainId),
      release4CursorKey
        ? this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
            chainId,
            release4CursorKey
          )
        : Promise.resolve(null)
    ]);
    const indexedTransactionsByHash = new Map(
      indexedTransactions.map((transaction) => [transaction.transactionHash, transaction] as const)
    );
    const executionTransactionsById = new Map(
      executionTransactions.map((transaction) => [transaction.id, transaction] as const)
    );
    const expectedAgreementAddress =
      records.settlementPreparationsByRequestId.get(settlementRequest.id)?.agreementAddress ??
      linkedAgreement?.agreementAddress ??
      null;
    const staleEvaluatedAt = new Date().toISOString();

    return {
      executionTransactions: executionTransactions.map((transaction) =>
        this.buildMilestoneSettlementExecutionTransactionSummary(
          transaction,
          expectedAgreementAddress,
          indexedTransactionsByHash,
          executionTransactionsById,
          release4ChainCursor,
          staleEvaluatedAt
        )
      )
    };
  }

  async createMilestoneSettlementExecutionTransaction(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneSettlementExecutionTransactionResponse> {
    const parsedParams =
      milestoneSettlementExecutionTransactionParamsSchema.safeParse(paramsInput);
    const parsedBody =
      createMilestoneSettlementExecutionTransactionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireWorkflowAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      requestMetadata,
      "ADMIN"
    );

    if (access.organizationParty.role !== "BUYER") {
      throw new ForbiddenException("buyer organization party is required");
    }

    const now = new Date().toISOString();
    const [linkedAgreement, records] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.loadMilestoneVersionRecords(access.version.id)
    ]);
    const settlementRequest = this.requireLoadedSettlementRequest(
      records,
      parsedParams.data.dealMilestoneSettlementRequestId
    );
    const milestone = records.milestones.find(
      (record) => record.id === settlementRequest.dealVersionMilestoneId
    );

    if (!milestone) {
      throw new NotFoundException("deal version milestone not found");
    }
    const plan = this.buildMilestoneSettlementExecutionPlan(
      records,
      linkedAgreement,
      settlementRequest,
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement)
    );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: milestone.id,
      draftDealId: access.draft.id,
      input: null,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: settlementRequest.id,
      subjectLabel: milestone.title,
      subjectMetadata: {
        dealMilestoneDisputeId: settlementRequest.dealMilestoneDisputeId,
        settlementRequestId: settlementRequest.id
      },
      subjectSnapshot: {
        dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
        dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
        milestonePosition: milestone.position
      },
      subjectType: "DEAL_MILESTONE_SETTLEMENT_REQUEST",
      title: milestone.title,
      totalAmountMinor: milestone.amountMinor
    });

    if (plan.blockers.length > 0) {
      throw new ConflictException("settlement execution is not ready for tracking");
    }

    if (!plan.agreementAddress) {
      throw new ConflictException("settlement execution agreement address is unavailable");
    }

    const transactionHash =
      parsedBody.data.transactionHash.toLowerCase() as `0x${string}`;
    const existing =
      await this.repositories.dealMilestoneSettlementExecutionTransactions.findByChainIdAndTransactionHash(
        plan.chainId,
        transactionHash
      );

    if (existing) {
      throw new ConflictException("settlement execution transaction is already tracked");
    }

    const executionTransaction =
      await this.repositories.dealMilestoneSettlementExecutionTransactions.create({
        chainId: plan.chainId,
        dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
        dealMilestoneSettlementRequestId: settlementRequest.id,
        dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
        dealVersionId: settlementRequest.dealVersionId,
        dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
        draftDealId: settlementRequest.draftDealId,
        id: randomUUID(),
        organizationId: settlementRequest.organizationId,
        reconciledAgreementAddress: null,
        reconciledAt: null,
        reconciledConfirmedAt: null,
        reconciledMatchesTrackedAgreement: null,
        reconciledStatus: null,
        stalePendingEscalatedAt: null,
        submittedAt: now,
        submittedByUserId: access.actor.user.id,
        submittedWalletAddress: access.actor.wallet.address,
        submittedWalletId: access.actor.wallet.id,
        supersededAt: null,
        supersededByDealMilestoneSettlementExecutionTransactionId: null,
        transactionHash
      });
    const existingTransactions =
      await this.repositories.dealMilestoneSettlementExecutionTransactions.listByDealMilestoneSettlementRequestId(
        settlementRequest.id
      );
    const indexedTransactions =
      await this.release4Repositories.indexedTransactions.listByChainId(plan.chainId);
    const release4CursorKey =
      resolveMilestoneSettlementExecutionReconciliationCursorKey(
        this.milestoneSettlementExecutionReconciliationConfiguration,
        plan.chainId
      );
    const release4ChainCursor = release4CursorKey
      ? await this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
          plan.chainId,
          release4CursorKey
        )
      : null;
    const indexedTransactionsByHash = new Map(
      indexedTransactions.map((transaction) => [transaction.transactionHash, transaction] as const)
    );
    const supersededTransactions =
      await this.supersedePendingMilestoneSettlementExecutionTransactions(
        existingTransactions.filter((transaction) => transaction.id !== executionTransaction.id),
        executionTransaction,
        plan.agreementAddress,
        access,
        indexedTransactionsByHash,
        requestMetadata,
        now
      );

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_SUBMITTED",
      actorUserId: access.actor.user.id,
      entityId: executionTransaction.id,
      entityType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        chainId: executionTransaction.chainId,
        dealMilestoneReviewId: executionTransaction.dealMilestoneReviewId,
        dealMilestoneSettlementRequestId:
          executionTransaction.dealMilestoneSettlementRequestId,
        dealMilestoneSubmissionId: executionTransaction.dealMilestoneSubmissionId,
        dealVersionId: executionTransaction.dealVersionId,
        dealVersionMilestoneId: executionTransaction.dealVersionMilestoneId,
        draftDealId: executionTransaction.draftDealId,
        supersededTransactionIds: supersededTransactions.map((transaction) => transaction.id),
        transactionHash: executionTransaction.transactionHash
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      executionTransaction: this.buildMilestoneSettlementExecutionTransactionSummary(
        executionTransaction,
        plan.agreementAddress,
        indexedTransactionsByHash,
        new Map(
          [executionTransaction, ...supersededTransactions].map((transaction) => [
            transaction.id,
            transaction
          ] as const)
        ),
        release4ChainCursor,
        now
      )
    };
  }

  async createMilestoneSubmission(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneSubmissionResponse> {
    const parsedParams = milestoneSubmissionParamsSchema.safeParse(paramsInput);
    const parsedBody = createMilestoneSubmissionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    this.assertUniqueAttachmentFileIds(parsedBody.data.attachmentFileIds ?? []);

    const access = await this.requireMilestoneAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      requestMetadata
    );

    if (access.organizationParty.role !== "SELLER") {
      throw new ForbiddenException("seller organization party is required");
    }

    this.assertEscrowIsActive(access.draft, access.linkedAgreement);

    const attachmentFiles = await this.requireFilesInOrganization(
      access.organization.id,
      parsedBody.data.attachmentFileIds ?? []
    );
    const existingSubmissions =
      await this.repositories.dealMilestoneSubmissions.listByDealVersionMilestoneId(
        access.milestone.id
      );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_SUBMISSION_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      input: parsedBody.data as unknown as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.milestone.id,
      subjectLabel: access.milestone.title,
      subjectMetadata: null,
      subjectSnapshot: {
        latestSubmissionId: existingSubmissions[existingSubmissions.length - 1]?.id ?? null,
        milestonePosition: access.milestone.position
      },
      subjectType: "DEAL_VERSION_MILESTONE",
      title: access.milestone.title,
      totalAmountMinor: access.milestone.amountMinor
    });
    const now = new Date().toISOString();
    const submission = await this.repositories.dealMilestoneSubmissions.create({
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      id: randomUUID(),
      organizationId: access.organization.id,
      reviewDeadlineAt: this.buildReviewDeadlineAt(now),
      scheme: null,
      signature: null,
      statementMarkdown: parsedBody.data.statementMarkdown,
      submissionNumber: existingSubmissions.length + 1,
      submittedAt: now,
      submittedByCounterpartyId: access.sellerParty.counterpartyId,
      submittedByPartyRole: access.sellerParty.role,
      submittedByPartySubjectType: access.sellerParty.subjectType,
      submittedByUserId: access.actor.user.id,
      typedData: null
    });

    for (const file of attachmentFiles) {
      await this.repositories.dealMilestoneSubmissionFiles.add({
        createdAt: now,
        dealMilestoneSubmissionId: submission.id,
        fileId: file.id,
        id: randomUUID()
      });
    }

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_SUBMISSION_CREATED",
      actorUserId: access.actor.user.id,
      entityId: submission.id,
      entityType: "DEAL_MILESTONE_SUBMISSION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        attachmentFileIds: attachmentFiles.map((file) => file.id),
        dealVersionId: access.version.id,
        dealVersionMilestoneId: access.milestone.id,
        draftDealId: access.draft.id,
        submissionNumber: submission.submissionNumber,
        submittedByCounterpartyId: submission.submittedByCounterpartyId,
        submittedByPartyRole: submission.submittedByPartyRole,
        submittedByPartySubjectType: submission.submittedByPartySubjectType
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const milestone = await this.buildMilestoneWorkflows(
      access.version.id,
      access.linkedAgreement
    ).then(
      (milestones) => milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      submission: milestone.submissions[milestone.submissions.length - 1]!
    };
  }

  async prepareCounterpartyMilestoneSubmission(
    paramsInput: unknown,
    bodyInput: unknown
  ): Promise<PrepareCounterpartyDealMilestoneSubmissionResponse> {
    const parsedParams = milestoneSubmissionParamsSchema.safeParse(paramsInput);
    const parsedBody =
      prepareCounterpartyMilestoneSubmissionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const context = await this.requireCounterpartyMilestoneSubmissionContext(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      parsedBody.data.statementMarkdown
    );

    this.assertEscrowIsActive(context.draft, context.linkedAgreement);

    return {
      challenge: {
        expectedWalletAddress: context.counterpartyParty.walletAddress!,
        typedData: context.typedData
      }
    };
  }

  async createCounterpartyMilestoneSubmission(
    paramsInput: unknown,
    bodyInput: unknown
  ): Promise<CreateCounterpartyDealMilestoneSubmissionResponse> {
    const parsedParams = milestoneSubmissionParamsSchema.safeParse(paramsInput);
    const parsedBody =
      createCounterpartyMilestoneSubmissionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const context = await this.requireCounterpartyMilestoneSubmissionContext(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      parsedBody.data.statementMarkdown
    );

    this.assertEscrowIsActive(context.draft, context.linkedAgreement);

    const typedMessage = context.typedData.message as {
      dealId: `0x${string}`;
      dealVersionHash: `0x${string}`;
      dealVersionId: string;
      dealVersionMilestoneId: string;
      draftDealId: string;
      intent: string;
      organizationId: string;
      statementHash: `0x${string}`;
      submissionNumber: string;
    };
    const isValid = await verifyTypedData({
      address: getAddress(context.counterpartyParty.walletAddress!),
      domain: context.typedData.domain as {
        chainId: number;
        name: string;
        version: string;
      },
      message: {
        ...typedMessage,
        submissionNumber: BigInt(typedMessage.submissionNumber)
      },
      primaryType: counterpartyMilestoneSubmissionPrimaryType,
      signature: parsedBody.data.signature as `0x${string}`,
      types: counterpartyMilestoneSubmissionTypes
    });

    if (!isValid) {
      throw new UnauthorizedException(
        "invalid counterparty milestone submission signature"
      );
    }

    const now = new Date().toISOString();
    const submission = await this.repositories.dealMilestoneSubmissions.create({
      dealVersionId: context.version.id,
      dealVersionMilestoneId: context.milestone.id,
      draftDealId: context.draft.id,
      id: randomUUID(),
      organizationId: context.draft.organizationId,
      reviewDeadlineAt: this.buildReviewDeadlineAt(now),
      scheme: "EIP712",
      signature: parsedBody.data.signature,
      statementMarkdown: parsedBody.data.statementMarkdown,
      submissionNumber: context.submissionNumber,
      submittedAt: now,
      submittedByCounterpartyId: context.versionSellerParty.counterpartyId,
      submittedByPartyRole: context.versionSellerParty.role,
      submittedByPartySubjectType: context.versionSellerParty.subjectType,
      submittedByUserId: null,
      typedData: context.typedData
    });

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_SUBMISSION_CREATED",
      actorUserId: null,
      entityId: submission.id,
      entityType: "DEAL_MILESTONE_SUBMISSION",
      id: randomUUID(),
      ipAddress: null,
      metadata: {
        dealVersionId: submission.dealVersionId,
        dealVersionMilestoneId: submission.dealVersionMilestoneId,
        draftDealId: submission.draftDealId,
        scheme: submission.scheme,
        signerWalletAddress: context.counterpartyParty.walletAddress,
        submissionNumber: submission.submissionNumber,
        submittedByCounterpartyId: submission.submittedByCounterpartyId,
        submittedByPartyRole: submission.submittedByPartyRole,
        submittedByPartySubjectType: submission.submittedByPartySubjectType
      },
      occurredAt: now,
      organizationId: context.draft.organizationId,
      userAgent: null
    });

    const milestone = await this.buildMilestoneWorkflows(
      context.version.id,
      context.linkedAgreement
    ).then(
      (milestones) => milestones.find((record) => record.milestone.id === context.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      submission: milestone.submissions[milestone.submissions.length - 1]!
    };
  }

  async createMilestoneReview(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneReviewResponse> {
    const parsedParams = milestoneReviewParamsSchema.safeParse(paramsInput);
    const parsedBody = createMilestoneReviewSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireMilestoneReviewAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      parsedParams.data.dealMilestoneSubmissionId,
      requestMetadata
    );

    if (access.organizationParty.role !== "BUYER") {
      throw new ForbiddenException("buyer organization party is required");
    }

    this.assertEscrowIsActive(access.draft, access.linkedAgreement);

    if (access.review) {
      throw new ConflictException("milestone submission already reviewed");
    }

    if (access.latestSubmission.id !== access.submission.id) {
      throw new ConflictException("only latest milestone submission can be reviewed");
    }

    if (access.submission.submittedByPartyRole !== "SELLER") {
      throw new ConflictException("milestone submission must originate from the seller party");
    }

    if (!this.doesSubmissionMatchSellerParty(access.submission, access.sellerParty)) {
      throw new ConflictException("milestone submission origin does not match seller party");
    }
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_REVIEW_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      input: parsedBody.data as unknown as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.submission.id,
      subjectLabel: access.milestone.title,
      subjectMetadata: null,
      subjectSnapshot: {
        latestSubmissionId: access.latestSubmission.id,
        milestonePosition: access.milestone.position,
        reviewId: null
      },
      subjectType: "DEAL_MILESTONE_SUBMISSION",
      title: access.milestone.title,
      totalAmountMinor: access.milestone.amountMinor
    });

    const now = new Date().toISOString();
    const review = await this.repositories.dealMilestoneReviews.create({
      decision: parsedBody.data.decision,
      dealMilestoneSubmissionId: access.submission.id,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      id: randomUUID(),
      organizationId: access.organization.id,
      reviewedAt: now,
      reviewedByUserId: access.actor.user.id,
      statementMarkdown: parsedBody.data.statementMarkdown ?? null
    });

    await this.repositories.auditLogs.append({
      action:
        review.decision === "APPROVED"
          ? "DEAL_MILESTONE_REVIEW_APPROVED"
          : "DEAL_MILESTONE_REVIEW_REJECTED",
      actorUserId: access.actor.user.id,
      entityId: review.id,
      entityType: "DEAL_MILESTONE_REVIEW",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        decision: review.decision,
        dealMilestoneSubmissionId: review.dealMilestoneSubmissionId,
        dealVersionId: review.dealVersionId,
        dealVersionMilestoneId: review.dealVersionMilestoneId,
        draftDealId: review.draftDealId
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const milestone = await this.buildMilestoneWorkflows(
      access.version.id,
      access.linkedAgreement
    ).then(
      (milestones) => milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      review: this.toReviewSummary(
        review,
        createEmptyLoadedMilestoneDisputeRecords(),
        new Map()
      )
    };
  }

  async createMilestoneSettlementRequest(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneSettlementRequestResponse> {
    const parsedParams =
      milestoneSettlementRequestParamsSchema.safeParse(paramsInput);
    const parsedBody =
      createMilestoneSettlementRequestSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireMilestoneSettlementRequestAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      parsedParams.data.dealMilestoneSubmissionId,
      parsedParams.data.dealMilestoneReviewId,
      requestMetadata
    );

    if (access.organizationParty.role !== "BUYER") {
      throw new ForbiddenException("buyer organization party is required");
    }

    this.assertEscrowIsActive(access.draft, access.linkedAgreement);

    if (access.latestSubmission.id !== access.submission.id) {
      throw new ConflictException(
        "only latest reviewed milestone submission can request settlement"
      );
    }

    if (!access.review) {
      throw new NotFoundException("deal milestone review not found");
    }

    if (access.review.id !== parsedParams.data.dealMilestoneReviewId) {
      throw new NotFoundException("deal milestone review not found");
    }

    if (access.settlementRequest) {
      throw new ConflictException("milestone review already has a settlement request");
    }

    if (access.dispute) {
      throw new ConflictException("milestone review is currently disputed");
    }

    if (access.submission.submittedByPartyRole !== "SELLER") {
      throw new ConflictException("milestone submission must originate from the seller party");
    }

    if (!this.doesSubmissionMatchSellerParty(access.submission, access.sellerParty)) {
      throw new ConflictException("milestone submission origin does not match seller party");
    }

    this.assertSettlementKindMatchesReviewDecision(
      parsedBody.data.kind,
      access.review.decision
    );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_SETTLEMENT_REQUEST_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      input: parsedBody.data as unknown as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.review.id,
      subjectLabel: access.milestone.title,
      subjectMetadata: null,
      subjectSnapshot: {
        latestSubmissionId: access.latestSubmission.id,
        milestonePosition: access.milestone.position,
        settlementRequestId: null
      },
      subjectType: "DEAL_MILESTONE_REVIEW",
      title: access.milestone.title,
      totalAmountMinor: access.milestone.amountMinor
    });

    const now = new Date().toISOString();
    const settlementRequest =
      await this.repositories.dealMilestoneSettlementRequests.create({
        dealMilestoneDisputeId: null,
        dealMilestoneReviewId: access.review.id,
        dealMilestoneSubmissionId: access.submission.id,
        dealVersionId: access.version.id,
        dealVersionMilestoneId: access.milestone.id,
        draftDealId: access.draft.id,
        id: randomUUID(),
        kind: parsedBody.data.kind,
        organizationId: access.organization.id,
        requestedAt: now,
        requestedByArbitratorAddress: null,
        requestedByUserId: access.actor.user.id,
        source: "BUYER_REVIEW",
        statementMarkdown: parsedBody.data.statementMarkdown ?? null
      });

    await this.repositories.auditLogs.append({
      action:
        settlementRequest.kind === "RELEASE"
          ? "DEAL_MILESTONE_RELEASE_REQUESTED"
          : "DEAL_MILESTONE_REFUND_REQUESTED",
      actorUserId: access.actor.user.id,
      entityId: settlementRequest.id,
      entityType: "DEAL_MILESTONE_SETTLEMENT_REQUEST",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
        dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
        dealVersionId: settlementRequest.dealVersionId,
        dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
        draftDealId: settlementRequest.draftDealId,
        kind: settlementRequest.kind
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const milestone = await this.buildMilestoneWorkflows(
      access.version.id,
      access.linkedAgreement
    ).then(
      (milestones) => milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      settlementRequest: this.toSettlementRequestSummary(
        settlementRequest,
        createEmptyLoadedMilestoneDisputeRecords()
      )
    };
  }

  async createMilestoneDispute(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneDisputeResponse> {
    const parsedParams = milestoneDisputeParamsSchema.safeParse(paramsInput);
    const parsedBody = createMilestoneDisputeSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireMilestoneDisputeAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealVersionMilestoneId,
      parsedParams.data.dealMilestoneSubmissionId,
      parsedParams.data.dealMilestoneReviewId,
      requestMetadata
    );

    this.assertEscrowIsActive(access.draft, access.linkedAgreement);
    this.assertUniqueAttachmentFileIds(parsedBody.data.attachmentFileIds ?? []);

    if (access.latestSubmission.id !== access.submission.id) {
      throw new ConflictException(
        "only latest reviewed milestone submission can be disputed"
      );
    }

    if (!access.review) {
      throw new NotFoundException("deal milestone review not found");
    }

    if (access.review.id !== parsedParams.data.dealMilestoneReviewId) {
      throw new NotFoundException("deal milestone review not found");
    }

    if (access.settlementRequest) {
      throw new ConflictException("milestone review already has a settlement request");
    }

    if (access.dispute) {
      throw new ConflictException("milestone review is already disputed");
    }

    const indexedSettlement =
      access.linkedAgreement &&
      (
        await this.loadIndexedMilestoneSettlementsByPosition(access.linkedAgreement)
      ).get(access.milestone.position);

    if (indexedSettlement) {
      throw new ConflictException("milestone is already settled");
    }

    const attachmentFiles = await this.requireFilesInOrganization(
      access.organization.id,
      parsedBody.data.attachmentFileIds ?? []
    );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_DISPUTE_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      input: parsedBody.data as unknown as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.review.id,
      subjectLabel: access.milestone.title,
      subjectMetadata: null,
      subjectSnapshot: {
        latestSubmissionId: access.latestSubmission.id,
        milestonePosition: access.milestone.position,
        reviewId: access.review.id
      },
      subjectType: "DEAL_MILESTONE_REVIEW",
      title: access.milestone.title,
      totalAmountMinor: access.milestone.amountMinor
    });
    const now = new Date().toISOString();
    const dispute = await this.repositories.dealMilestoneDisputes.create({
      dealMilestoneReviewId: access.review.id,
      dealMilestoneSubmissionId: access.submission.id,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      id: randomUUID(),
      openedAt: now,
      openedByUserId: access.actor.user.id,
      organizationId: access.organization.id,
      statementMarkdown: parsedBody.data.statementMarkdown
    });

    for (const file of attachmentFiles) {
      await this.repositories.dealMilestoneDisputeEvidence.add({
        createdAt: now,
        dealMilestoneDisputeId: dispute.id,
        fileId: file.id,
        id: randomUUID()
      });
    }

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_DISPUTE_OPENED",
      actorUserId: access.actor.user.id,
      entityId: dispute.id,
      entityType: "DEAL_MILESTONE_DISPUTE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        attachmentFileCount: attachmentFiles.length,
        dealMilestoneReviewId: dispute.dealMilestoneReviewId,
        dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
        dealVersionId: dispute.dealVersionId,
        dealVersionMilestoneId: dispute.dealVersionMilestoneId,
        draftDealId: dispute.draftDealId
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const records = await this.loadMilestoneVersionRecords(access.version.id);
    const milestone = await this.buildMilestoneWorkflows(
      access.version.id,
      access.linkedAgreement
    ).then((milestones) =>
      milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      dispute:
        (await this.toDisputeSummary(
          records.disputeRecords.disputesById.get(dispute.id) ?? dispute,
          records.disputeRecords
        )) ?? (await this.toDisputeSummary(dispute, records.disputeRecords))!,
      milestone
    };
  }

  async assignMilestoneDisputeArbitrator(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<AssignDealMilestoneDisputeArbitratorResponse> {
    const parsedParams =
      dealVersionMilestoneDisputeParamsSchema.safeParse(paramsInput);
    const parsedBody = assignMilestoneDisputeArbitratorSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireExistingMilestoneDisputeAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealMilestoneDisputeId,
      requestMetadata
    );

    if (access.settlementRequest) {
      throw new ConflictException("dispute is already resolved");
    }

    const assigned = await this.requireApprovedArbitratorAssignment(
      access.linkedAgreement,
      parsedBody.data.arbitratorAddress
    );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DEAL_MILESTONE_DISPUTE_ASSIGN_ARBITRATOR",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: access.milestone.id,
      draftDealId: access.draft.id,
      input: parsedBody.data as unknown as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.dispute.id,
      subjectLabel: access.milestone.title,
      subjectMetadata: {
        dealMilestoneDisputeId: access.dispute.id
      },
      subjectSnapshot: {
        assignmentId:
          (
            await this.repositories.dealMilestoneDisputeAssignments.listByDealMilestoneDisputeId(
              access.dispute.id
            )
          )
            .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt))[0]
            ?.id ?? null,
        disputeId: access.dispute.id,
        milestonePosition: access.milestone.position
      },
      subjectType: "DEAL_MILESTONE_DISPUTE",
      title: access.milestone.title,
      totalAmountMinor: access.milestone.amountMinor
    });
    const now = new Date().toISOString();
    const assignment =
      await this.repositories.dealMilestoneDisputeAssignments.create({
        arbitratorAddress: assigned,
        assignedAt: now,
        assignedByUserId: access.actor.user.id,
        chainId: access.linkedAgreement.chainId,
        dealMilestoneDisputeId: access.dispute.id,
        id: randomUUID(),
        organizationId: access.organization.id
      });

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_DISPUTE_ARBITRATOR_ASSIGNED",
      actorUserId: access.actor.user.id,
      entityId: assignment.id,
      entityType: "DEAL_MILESTONE_DISPUTE_ASSIGNMENT",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        arbitratorAddress: assignment.arbitratorAddress,
        chainId: assignment.chainId,
        dealMilestoneDisputeId: assignment.dealMilestoneDisputeId
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const records = await this.loadMilestoneVersionRecords(access.version.id);
    const disputeSummary = await this.toDisputeSummary(
      records.disputeRecords.disputesById.get(access.dispute.id) ?? access.dispute,
      records.disputeRecords
    );

    if (!disputeSummary) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    return {
      dispute: disputeSummary
    };
  }

  async prepareMilestoneDisputeDecision(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<PrepareDealMilestoneDisputeDecisionResponse> {
    const parsedParams =
      dealVersionMilestoneDisputeParamsSchema.safeParse(paramsInput);
    const parsedBody = prepareMilestoneDisputeDecisionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireExistingMilestoneDisputeAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealMilestoneDisputeId,
      requestMetadata
    );

    if (access.settlementRequest) {
      throw new ConflictException("dispute is already resolved");
    }

    const challenge = await this.buildMilestoneDisputeDecisionChallenge(
      access,
      parsedBody.data.kind,
      parsedBody.data.statementMarkdown
    );
    const records = await this.loadMilestoneVersionRecords(access.version.id);
    const disputeSummary = await this.toDisputeSummary(
      records.disputeRecords.disputesById.get(access.dispute.id) ?? access.dispute,
      records.disputeRecords
    );

    if (!disputeSummary) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    return {
      challenge,
      dispute: disputeSummary
    };
  }

  async createMilestoneDisputeDecision(
    paramsInput: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneDisputeDecisionResponse> {
    const parsedParams =
      dealVersionMilestoneDisputeParamsSchema.safeParse(paramsInput);
    const parsedBody = createMilestoneDisputeDecisionSchema.safeParse(bodyInput);

    if (!parsedParams.success) {
      throw new BadRequestException(parsedParams.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireExistingMilestoneDisputeAccess(
      parsedParams.data.organizationId,
      parsedParams.data.draftDealId,
      parsedParams.data.dealVersionId,
      parsedParams.data.dealMilestoneDisputeId,
      requestMetadata
    );

    if (access.settlementRequest) {
      throw new ConflictException("dispute is already resolved");
    }

    const challenge = await this.buildMilestoneDisputeDecisionChallenge(
      access,
      parsedBody.data.kind,
      parsedBody.data.statementMarkdown
    );
    const isValid = await (verifyTypedData as unknown as (input: unknown) => Promise<boolean>)({
      address: challenge.expectedWalletAddress,
      domain: challenge.typedData.domain as never,
      message: challenge.typedData.message as never,
      primaryType: milestoneDisputeDecisionPrimaryType,
      signature: parsedBody.data.signature as `0x${string}`,
      types: milestoneDisputeDecisionTypes as never
    });

    if (!isValid) {
      throw new UnauthorizedException("invalid milestone dispute decision signature");
    }

    const now = new Date().toISOString();
    const settlementRequest =
      await this.repositories.dealMilestoneSettlementRequests.create({
        dealMilestoneDisputeId: access.dispute.id,
        dealMilestoneReviewId: access.review.id,
        dealMilestoneSubmissionId: access.submission.id,
        dealVersionId: access.version.id,
        dealVersionMilestoneId: access.milestone.id,
        draftDealId: access.draft.id,
        id: randomUUID(),
        kind: parsedBody.data.kind,
        organizationId: access.organization.id,
        requestedAt: now,
        requestedByArbitratorAddress: challenge.expectedWalletAddress,
        requestedByUserId: null,
        source: "ARBITRATOR_DECISION",
        statementMarkdown: parsedBody.data.statementMarkdown
      });
    const assignment =
      await this.requireLatestDisputeAssignment(access.dispute.id);
    const decision =
      await this.repositories.dealMilestoneDisputeDecisions.create({
        dealMilestoneDisputeAssignmentId: assignment.id,
        dealMilestoneDisputeId: access.dispute.id,
        dealMilestoneSettlementRequestId: settlementRequest.id,
        decidedAt: now,
        id: randomUUID(),
        kind: parsedBody.data.kind,
        organizationId: access.organization.id,
        signature: parsedBody.data.signature as `0x${string}`,
        signedByArbitratorAddress: challenge.expectedWalletAddress,
        statementMarkdown: parsedBody.data.statementMarkdown,
        typedData: challenge.typedData
      });

    await this.repositories.auditLogs.append({
      action: "DEAL_MILESTONE_DISPUTE_DECISION_SUBMITTED",
      actorUserId: access.actor.user.id,
      entityId: decision.id,
      entityType: "DEAL_MILESTONE_DISPUTE_DECISION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        dealMilestoneDisputeId: decision.dealMilestoneDisputeId,
        dealMilestoneSettlementRequestId: decision.dealMilestoneSettlementRequestId,
        kind: decision.kind,
        signedByArbitratorAddress: decision.signedByArbitratorAddress
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const records = await this.loadMilestoneVersionRecords(access.version.id);
    const milestone = await this.buildMilestoneWorkflows(
      access.version.id,
      access.linkedAgreement
    ).then((milestones) =>
      milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    const disputeSummary = await this.toDisputeSummary(
      records.disputeRecords.disputesById.get(access.dispute.id) ?? access.dispute,
      records.disputeRecords
    );

    if (!disputeSummary) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    return {
      dispute: disputeSummary,
      milestone,
      settlementRequest: this.toSettlementRequestSummary(
        settlementRequest,
        records.disputeRecords
      )
    };
  }

  private async buildMilestoneWorkflows(
    dealVersionId: string,
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<DealVersionMilestoneWorkflow[]> {
    const records = await this.loadMilestoneVersionRecords(dealVersionId);
    const indexedSettlementsByMilestonePosition =
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement);

    return Promise.all(
      records.milestones.map((milestone) =>
        this.buildMilestoneWorkflow(
          milestone,
          records.submissionsByMilestoneId.get(milestone.id) ?? [],
          records.disputeRecords,
          records.deadlineExpiriesBySubmissionId,
          records.evaluatedAt,
          records.reviewsBySubmissionId,
          records.settlementPreparationsByRequestId,
          records.settlementRequestsByReviewId,
          indexedSettlementsByMilestonePosition.get(milestone.position) ?? null
        )
      )
    );
  }

  private async buildMilestoneTimelines(
    dealVersionId: string,
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<DealVersionMilestoneTimeline[]> {
    const records = await this.loadMilestoneVersionRecords(dealVersionId);
    const indexedSettlementsByMilestonePosition =
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement);

    return Promise.all(
      records.milestones.map((milestone) =>
        this.buildMilestoneTimeline(
          milestone,
          records.submissionsByMilestoneId.get(milestone.id) ?? [],
          records.disputeRecords,
          records.deadlineExpiriesBySubmissionId,
          records.evaluatedAt,
          records.reviewsBySubmissionId,
          records.settlementPreparationsByRequestId,
          records.settlementRequestsByReviewId,
          indexedSettlementsByMilestonePosition.get(milestone.position) ?? null
        )
      )
    );
  }

  private async buildMilestoneWorkflow(
    milestone: DealVersionMilestoneRecord,
    submissions: DealMilestoneSubmissionRecord[],
    disputeRecords: LoadedMilestoneDisputeRecords,
    deadlineExpiriesBySubmissionId: ReadonlyMap<
      string,
      DealMilestoneReviewDeadlineExpiryRecord
    >,
    evaluatedAt: string,
    reviewsBySubmissionId: ReadonlyMap<string, DealMilestoneReviewRecord>,
    settlementPreparationsByRequestId: ReadonlyMap<
      string,
      DealMilestoneSettlementPreparationRecord
    >,
    settlementRequestsByReviewId: ReadonlyMap<
      string,
      DealMilestoneSettlementRequestRecord
    >,
    indexedSettlement: EscrowAgreementMilestoneSettlementRecord | null
  ): Promise<DealVersionMilestoneWorkflow> {
    const submissionSummaries = await Promise.all(
      submissions.map((submission) =>
        this.toSubmissionSummary(
          submission,
          deadlineExpiriesBySubmissionId.get(submission.id) ?? null,
          evaluatedAt,
          reviewsBySubmissionId.get(submission.id) ?? null,
          disputeRecords,
          settlementPreparationsByRequestId,
          settlementRequestsByReviewId
        )
      )
    );
    const latestSubmission =
      submissionSummaries[submissionSummaries.length - 1] ?? null;
    const latestReview = latestSubmission?.review ?? null;
    const currentDispute = latestReview
      ? await this.toDisputeSummary(
          disputeRecords.disputesByReviewId.get(latestReview.id) ?? null,
          disputeRecords
        )
      : null;

    return {
      currentDispute,
      latestReviewDeadline: latestSubmission?.reviewDeadline ?? null,
      latestReviewAt: latestSubmission?.review?.reviewedAt ?? null,
      latestSubmissionAt: latestSubmission?.submittedAt ?? null,
      milestone: toMilestoneSnapshot(milestone),
      state: resolveMilestoneWorkflowState(
        latestSubmission,
        indexedSettlement ? this.toIndexedSettlementSummary(indexedSettlement) : null,
        currentDispute
      ),
      submissions: submissionSummaries
    };
  }

  private async buildMilestoneTimeline(
    milestone: DealVersionMilestoneRecord,
    submissions: DealMilestoneSubmissionRecord[],
    disputeRecords: LoadedMilestoneDisputeRecords,
    deadlineExpiriesBySubmissionId: ReadonlyMap<
      string,
      DealMilestoneReviewDeadlineExpiryRecord
    >,
    evaluatedAt: string,
    reviewsBySubmissionId: ReadonlyMap<string, DealMilestoneReviewRecord>,
    settlementPreparationsByRequestId: ReadonlyMap<
      string,
      DealMilestoneSettlementPreparationRecord
    >,
    settlementRequestsByReviewId: ReadonlyMap<
      string,
      DealMilestoneSettlementRequestRecord
    >,
    indexedSettlement: EscrowAgreementMilestoneSettlementRecord | null
  ): Promise<DealVersionMilestoneTimeline> {
    const events = await Promise.all(
      submissions.flatMap((submission) => {
        const review = reviewsBySubmissionId.get(submission.id) ?? null;
        const deadlineExpiry =
          deadlineExpiriesBySubmissionId.get(submission.id) ?? null;
        const dispute = review
          ? disputeRecords.disputesByReviewId.get(review.id) ?? null
          : null;
        const disputeAssignment = dispute
          ? disputeRecords.latestDisputeAssignmentsByDisputeId.get(dispute.id) ?? null
          : null;
        const disputeDecision = dispute
          ? disputeRecords.disputeDecisionsByDisputeId.get(dispute.id) ?? null
          : null;
        const settlementRequest = review
          ? settlementRequestsByReviewId.get(review.id) ?? null
          : null;
        const settlementPreparation = settlementRequest
          ? settlementPreparationsByRequestId.get(settlementRequest.id) ?? null
          : null;

        return [
          this.toSubmissionTimelineEvent(
            submission,
            review,
            deadlineExpiry,
            evaluatedAt
          ),
          review
            ? Promise.resolve(
                this.toReviewTimelineEvent(
                  submission,
                  review,
                  deadlineExpiry,
                  evaluatedAt
                )
              )
            : Promise.resolve(null),
          deadlineExpiry
            ? Promise.resolve(
                this.toDeadlineExpiryTimelineEvent(
                  submission,
                  review,
                  deadlineExpiry,
                  evaluatedAt
                )
              )
            : Promise.resolve(null),
          dispute
            ? this.toDisputeOpenedTimelineEvent(dispute, disputeRecords)
            : Promise.resolve(null),
          dispute && disputeAssignment
            ? this.toDisputeAssignmentTimelineEvent(
                dispute,
                disputeAssignment,
                disputeRecords
              )
            : Promise.resolve(null),
          dispute && disputeDecision
            ? this.toDisputeDecisionTimelineEvent(
                dispute,
                disputeDecision,
                disputeRecords
              )
            : Promise.resolve(null),
          settlementRequest && review
            ? Promise.resolve(
                this.toSettlementRequestTimelineEvent(
                  submission,
                  review,
                  settlementRequest,
                  deadlineExpiry,
                  evaluatedAt
                )
              )
            : Promise.resolve(null),
          settlementRequest && settlementPreparation
            ? Promise.resolve(
                this.toSettlementPreparationTimelineEvent(
                  settlementRequest,
                  settlementPreparation
                )
              )
            : Promise.resolve(null)
        ];
      })
    ).then((records) =>
      records.filter((event): event is DealMilestoneTimelineEvent => event !== null)
    );
    const latestSubmission = submissions[submissions.length - 1] ?? null;
    const latestReview = latestSubmission
      ? reviewsBySubmissionId.get(latestSubmission.id) ?? null
      : null;
    const latestSettlementRequest = latestReview
      ? settlementRequestsByReviewId.get(latestReview.id) ?? null
      : null;

    if (latestSubmission && latestReview && latestSettlementRequest && indexedSettlement) {
      events.push(
        this.toIndexedSettlementTimelineEvent(
          latestSubmission,
          latestReview,
          latestSettlementRequest,
          indexedSettlement
        )
      );
    }

    events.sort(compareTimelineEvents);

    return {
      events,
      latestOccurredAt: events[events.length - 1]?.occurredAt ?? null,
      milestone: toMilestoneSnapshot(milestone)
    };
  }

  private async buildMilestoneDisputePackets(
    records: LoadedMilestoneVersionRecords,
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<DealMilestoneDisputePacket[]> {
    const milestonesById = new Map(
      records.milestones.map((milestone) => [milestone.id, milestone] as const)
    );
    const indexedSettlementsByMilestonePosition =
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement);
    const packets = await Promise.all(
      records.disputeRecords.disputes.map(async (dispute) => {
        const milestone =
          milestonesById.get(dispute.dealVersionMilestoneId) ?? null;
        const submission =
          records.submissionsById.get(dispute.dealMilestoneSubmissionId) ?? null;
        const review =
          records.reviewsById.get(dispute.dealMilestoneReviewId) ?? null;

        if (!milestone || !submission || !review) {
          return null;
        }

        const settlementRequest =
          records.settlementRequestsByReviewId.get(review.id) ?? null;
        const indexedSettlement =
          indexedSettlementsByMilestonePosition.get(milestone.position) ?? null;
        const deadlineExpiry =
          records.deadlineExpiriesBySubmissionId.get(submission.id) ?? null;
        const submissionSummary = await this.toSubmissionSummary(
          submission,
          deadlineExpiry,
          records.evaluatedAt,
          review,
          records.disputeRecords,
          records.settlementPreparationsByRequestId,
          records.settlementRequestsByReviewId
        );
        const disputeSummary = await this.toDisputeSummary(
          dispute,
          records.disputeRecords
        );

        if (!disputeSummary) {
          return null;
        }

        return {
          dispute: disputeSummary,
          indexedSettlement: indexedSettlement
            ? this.toIndexedSettlementSummary(indexedSettlement)
            : null,
          milestone: toMilestoneSnapshot(milestone),
          review: this.toReviewSummary(
            review,
            records.disputeRecords,
            records.settlementPreparationsByRequestId,
            settlementRequest
          ),
          settlementRequest: settlementRequest
            ? this.toSettlementRequestSummary(
                settlementRequest,
                records.disputeRecords,
                records.settlementPreparationsByRequestId.get(
                  settlementRequest.id
                ) ?? null
              )
            : null,
          submission: submissionSummary
        } satisfies DealMilestoneDisputePacket;
      })
    );

    return packets
      .filter((packet): packet is DealMilestoneDisputePacket => packet !== null)
      .sort((left, right) =>
        compareIsoTimestamps(left.dispute.openedAt, right.dispute.openedAt)
      );
  }

  private async buildMilestoneSettlementExecutions(
    records: LoadedMilestoneVersionRecords,
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<DealMilestoneSettlementExecutionSummary[]> {
    const milestonesById = new Map(
      records.milestones.map((milestone) => [milestone.id, milestone] as const)
    );
    const indexedSettlementsByMilestonePosition =
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement);
    const settlements = records.settlementRequests.flatMap((settlementRequest) => {
      const review =
        records.reviewsById.get(settlementRequest.dealMilestoneReviewId) ?? null;
      const milestone =
        milestonesById.get(settlementRequest.dealVersionMilestoneId) ?? null;

      if (!review || !milestone) {
        return [];
      }

      const latestSubmission =
        this.findLatestMilestoneSubmission(records, milestone.id);
      const executionPreparation =
        records.settlementPreparationsByRequestId.get(settlementRequest.id) ?? null;
      const indexedSettlement =
        indexedSettlementsByMilestonePosition.get(milestone.position) ?? null;
      const blockers = this.resolveSettlementExecutionBlockers(
        settlementRequest,
        latestSubmission,
        milestone,
        linkedAgreement,
        indexedSettlement
      );

      return [
        {
          blockers,
          executionPreparation: executionPreparation
            ? this.toSettlementPreparationSummary(executionPreparation)
            : null,
          indexedSettlement: indexedSettlement
            ? this.toIndexedSettlementSummary(indexedSettlement)
            : null,
          milestone: toMilestoneSnapshot(milestone),
          review: this.toReviewSummary(
            review,
            records.disputeRecords,
            records.settlementPreparationsByRequestId,
            settlementRequest
          ),
          settlementRequest: this.toSettlementRequestSummary(
            settlementRequest,
            records.disputeRecords,
            executionPreparation
          ),
          status: this.resolveSettlementExecutionStatus(indexedSettlement, executionPreparation, blockers)
        }
      ];
    });

    settlements.sort((left, right) => {
      return (
        left.milestone.position - right.milestone.position ||
        compareIsoTimestamps(
          left.settlementRequest.requestedAt,
          right.settlementRequest.requestedAt
        ) ||
        left.settlementRequest.id.localeCompare(right.settlementRequest.id)
      );
    });

    return settlements;
  }

  private async buildSettlementStatement(
    draft: DraftDealRecord,
    records: LoadedMilestoneVersionRecords,
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<GetDealVersionSettlementStatementResponse> {
    const indexedSettlementsByMilestonePosition =
      await this.loadIndexedMilestoneSettlementsByPosition(linkedAgreement);
    const milestones = await Promise.all(
      records.milestones.map(async (milestone) => {
        const latestSubmission = this.findLatestMilestoneSubmission(records, milestone.id);
        const latestReview = latestSubmission
          ? records.reviewsBySubmissionId.get(latestSubmission.id) ?? null
          : null;
        const latestSettlementRequest = latestReview
          ? records.settlementRequestsByReviewId.get(latestReview.id) ?? null
          : null;
        const currentDispute = latestReview
          ? await this.toDisputeSummary(
              records.disputeRecords.disputesByReviewId.get(latestReview.id) ?? null,
              records.disputeRecords
            )
          : null;
        const latestDeadlineExpiry = latestSubmission
          ? records.deadlineExpiriesBySubmissionId.get(latestSubmission.id) ?? null
          : null;
        const indexedSettlement =
          indexedSettlementsByMilestonePosition.get(milestone.position) ?? null;
        const latestSubmissionSummary = latestSubmission
          ? await this.toSubmissionSummary(
              latestSubmission,
              latestDeadlineExpiry,
              records.evaluatedAt,
              latestReview,
              records.disputeRecords,
              records.settlementPreparationsByRequestId,
              records.settlementRequestsByReviewId
            )
          : null;
        const latestReviewDeadline = latestSubmission
          ? this.toReviewDeadlineSummary(
              latestSubmission,
              latestReview,
              latestDeadlineExpiry,
              records.evaluatedAt
            )
          : null;

        return {
          currentDispute,
          indexedSettlement: indexedSettlement
            ? this.toIndexedSettlementSummary(indexedSettlement)
            : null,
          latestReview: latestReview
            ? this.toReviewSummary(
                latestReview,
                records.disputeRecords,
                records.settlementPreparationsByRequestId,
                latestSettlementRequest
              )
            : null,
          latestReviewDeadline,
          latestSettlementRequest: latestSettlementRequest
            ? this.toSettlementRequestSummary(
                latestSettlementRequest,
                records.disputeRecords,
                records.settlementPreparationsByRequestId.get(
                  latestSettlementRequest.id
                ) ?? null
              )
            : null,
          latestSubmission: latestSubmissionSummary,
          milestone: toMilestoneSnapshot(milestone),
          state: resolveMilestoneWorkflowState(
            latestSubmissionSummary,
            indexedSettlement
              ? this.toIndexedSettlementSummary(indexedSettlement)
              : null,
            currentDispute
          )
        } satisfies DealVersionMilestoneStatement;
      })
    );

    const statement = this.buildSettlementStatementSummary(
      draft,
      records,
      linkedAgreement,
      milestones
    );

    return {
      milestones,
      statement
    };
  }

  private buildSettlementStatementSummary(
    draft: DraftDealRecord,
    records: LoadedMilestoneVersionRecords,
    linkedAgreement: EscrowAgreementRecord | null,
    milestones: DealVersionMilestoneStatement[]
  ): DealVersionSettlementStatementSummary {
    const releasedMilestones = milestones.filter(
      (milestone) => milestone.indexedSettlement?.kind === "RELEASE"
    );
    const refundedMilestones = milestones.filter(
      (milestone) => milestone.indexedSettlement?.kind === "REFUND"
    );
    const releasedAmountMinor = releasedMilestones.reduce(
      (total, milestone) =>
        total + BigInt(milestone.indexedSettlement?.amount ?? "0"),
      0n
    );
    const refundedAmountMinor = refundedMilestones.reduce(
      (total, milestone) =>
        total + BigInt(milestone.indexedSettlement?.amount ?? "0"),
      0n
    );
    const totalAmountMinor = records.milestones.reduce(
      (total, milestone) => total + BigInt(milestone.amountMinor),
      0n
    );
    const latestSettledAt =
      milestones
        .map((milestone) => milestone.indexedSettlement?.settledAt ?? null)
        .filter((value): value is string => value !== null)
        .sort(compareIsoTimestamps)
        .at(-1) ?? null;

    return {
      agreementAddress: linkedAgreement?.agreementAddress ?? null,
      chainId: linkedAgreement?.chainId ?? null,
      dealId: linkedAgreement?.dealId ?? null,
      dealVersionHash: linkedAgreement?.dealVersionHash ?? null,
      draftDealId: draft.id,
      draftState: draft.state,
      latestSettledAt,
      milestoneCount: records.milestones.length,
      organizationId: draft.organizationId,
      pendingAmountMinor: (
        totalAmountMinor -
        releasedAmountMinor -
        refundedAmountMinor
      ).toString(),
      pendingMilestoneCount: milestones.filter(
        (milestone) => milestone.indexedSettlement === null
      ).length,
      refundedAmountMinor: refundedAmountMinor.toString(),
      refundedMilestoneCount: refundedMilestones.length,
      releasedAmountMinor: releasedAmountMinor.toString(),
      releasedMilestoneCount: releasedMilestones.length,
      settlementTokenAddress: linkedAgreement?.settlementTokenAddress ?? null,
      totalAmountMinor: totalAmountMinor.toString()
    };
  }

  private resolveSettlementExecutionStatus(
    indexedSettlement: EscrowAgreementMilestoneSettlementRecord | null,
    executionPreparation: DealMilestoneSettlementPreparationRecord | null,
    blockers: MilestoneSettlementExecutionBlocker[]
  ): DealMilestoneSettlementExecutionSummary["status"] {
    if (indexedSettlement) {
      return "EXECUTED";
    }

    if (blockers.length > 0) {
      return "BLOCKED";
    }

    if (executionPreparation) {
      return "PREPARED";
    }

    return "PENDING_PREPARATION";
  }

  private buildMilestoneSettlementExecutionPlan(
    records: LoadedMilestoneVersionRecords,
    linkedAgreement: EscrowAgreementRecord | null,
    settlementRequest: DealMilestoneSettlementRequestRecord,
    indexedSettlementsByMilestonePosition: ReadonlyMap<
      number,
      EscrowAgreementMilestoneSettlementRecord
    >
  ): MilestoneSettlementExecutionPlanSummary {
    const review =
      records.reviewsById.get(settlementRequest.dealMilestoneReviewId) ?? null;
    const milestone = records.milestones.find(
      (record) => record.id === settlementRequest.dealVersionMilestoneId
    );

    if (!review || !milestone) {
      throw new NotFoundException("deal milestone settlement request not found");
    }

    const latestSubmission = this.findLatestMilestoneSubmission(records, milestone.id);
    const executionPreparation =
      records.settlementPreparationsByRequestId.get(settlementRequest.id) ?? null;
    const indexedSettlement =
      indexedSettlementsByMilestonePosition.get(milestone.position) ?? null;
    const blockers = this.resolveSettlementExecutionBlockers(
      settlementRequest,
      latestSubmission,
      milestone,
      linkedAgreement,
      indexedSettlement
    );

    if (!executionPreparation) {
      blockers.push("SETTLEMENT_PREPARATION_MISSING");
    }

    const chainId = linkedAgreement?.chainId ?? normalizeApiChainId();
    const manifest = getDeploymentManifestByChainId(chainId);

    if (!manifest || !deploymentSupportsMilestoneSettlementExecution(manifest)) {
      blockers.push("SETTLEMENT_EXECUTION_METHOD_UNAVAILABLE");
    }

    return {
      agreementAddress:
        executionPreparation?.agreementAddress ?? linkedAgreement?.agreementAddress ?? null,
      blockers,
      chainId,
      contractVersion: manifest?.contractVersion ?? null,
      dealId: executionPreparation?.dealId ?? linkedAgreement?.dealId ?? null,
      dealVersionHash:
        executionPreparation?.dealVersionHash ?? linkedAgreement?.dealVersionHash ?? null,
      executionPreparation: executionPreparation
        ? this.toSettlementPreparationSummary(executionPreparation)
        : null,
      indexedSettlement: indexedSettlement
        ? this.toIndexedSettlementSummary(indexedSettlement)
        : null,
      milestone: toMilestoneSnapshot(milestone),
      network: manifest?.network ?? null,
      ready: blockers.length === 0,
      review: this.toReviewSummary(
        review,
        records.disputeRecords,
        records.settlementPreparationsByRequestId,
        settlementRequest
      ),
      settlementRequest: this.toSettlementRequestSummary(
        settlementRequest,
        records.disputeRecords,
        executionPreparation
      ),
      settlementTokenAddress:
        executionPreparation?.settlementTokenAddress ??
        linkedAgreement?.settlementTokenAddress ??
        null,
      totalAmountMinor:
        executionPreparation?.totalAmount ?? linkedAgreement?.totalAmount ?? null
    };
  }

  private buildMilestoneSettlementExecutionTransactionSummary(
    transaction: DealMilestoneSettlementExecutionTransactionRecord,
    expectedAgreementAddress: `0x${string}` | null,
    indexedTransactionsByHash: ReadonlyMap<`0x${string}`, IndexedTransactionRecord>,
    executionTransactionsById: ReadonlyMap<
      string,
      DealMilestoneSettlementExecutionTransactionRecord
    >,
    release4ChainCursor: { updatedAt: string } | null,
    staleEvaluatedAt: string
  ): DealMilestoneSettlementExecutionTransactionSummary {
    const indexedTransaction =
      indexedTransactionsByHash.get(transaction.transactionHash) ?? null;
    const resolvedState = resolveSettlementExecutionTransactionState({
      agreementAddress: expectedAgreementAddress,
      indexedTransaction,
      settlementExecutionTransaction: transaction
    });
    const observation = buildSettlementExecutionTransactionObservation(indexedTransaction);
    const stalePendingState = resolveSettlementExecutionTransactionStalePendingState({
      currentStatus: resolvedState.status,
      evaluatedAt: staleEvaluatedAt,
      indexerFreshnessTtlSeconds:
        this.milestoneSettlementExecutionReconciliationConfiguration
          .indexerFreshnessTtlSeconds,
      pendingStaleAfterSeconds:
        this.milestoneSettlementExecutionReconciliationConfiguration
          .pendingStaleAfterSeconds,
      release4ChainCursor,
      settlementExecutionTransaction: transaction
    });
    const supersededByTransaction =
      transaction.supersededByDealMilestoneSettlementExecutionTransactionId
        ? executionTransactionsById.get(
            transaction.supersededByDealMilestoneSettlementExecutionTransactionId
          ) ?? null
        : null;

    return {
      agreementAddress: resolvedState.agreementAddress,
      chainId: transaction.chainId,
      confirmedAt: resolvedState.confirmedAt,
      dealMilestoneReviewId: transaction.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId:
        transaction.dealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: transaction.dealMilestoneSubmissionId,
      dealVersionId: transaction.dealVersionId,
      dealVersionMilestoneId: transaction.dealVersionMilestoneId,
      draftDealId: transaction.draftDealId,
      id: transaction.id,
      indexedAt: observation.indexedAt,
      indexedBlockNumber: observation.indexedBlockNumber,
      indexedExecutionStatus: observation.indexedExecutionStatus,
      matchesTrackedAgreement: resolvedState.matchesTrackedAgreement,
      organizationId: transaction.organizationId,
      reconciledAt: transaction.reconciledAt,
      reconciledStatus: transaction.reconciledStatus,
      stalePending: stalePendingState.stalePending,
      stalePendingAt: stalePendingState.stalePendingAt,
      stalePendingEscalatedAt: transaction.stalePendingEscalatedAt,
      stalePendingEvaluation: stalePendingState.stalePendingEvaluation,
      status: resolvedState.status,
      submittedAt: transaction.submittedAt,
      submittedByUserId: transaction.submittedByUserId,
      submittedWalletAddress: transaction.submittedWalletAddress,
      supersededAt: transaction.supersededAt,
      supersededByDealMilestoneSettlementExecutionTransactionId:
        transaction.supersededByDealMilestoneSettlementExecutionTransactionId,
      supersededByTransactionHash: supersededByTransaction?.transactionHash ?? null,
      transactionHash: transaction.transactionHash
    };
  }

  private async supersedePendingMilestoneSettlementExecutionTransactions(
    existingTransactions: DealMilestoneSettlementExecutionTransactionRecord[],
    replacementTransaction: DealMilestoneSettlementExecutionTransactionRecord,
    expectedAgreementAddress: `0x${string}`,
    access: MilestoneWorkflowAccessContext,
    indexedTransactionsByHash: ReadonlyMap<`0x${string}`, IndexedTransactionRecord>,
    requestMetadata: RequestMetadata,
    occurredAt: string
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord[]> {
    const supersededTransactions: DealMilestoneSettlementExecutionTransactionRecord[] =
      [];

    for (const trackedTransaction of existingTransactions) {
      const status = resolveSettlementExecutionTransactionState({
        agreementAddress: expectedAgreementAddress,
        indexedTransaction:
          indexedTransactionsByHash.get(trackedTransaction.transactionHash) ?? null,
        settlementExecutionTransaction: trackedTransaction
      }).status;

      if (status !== "PENDING") {
        continue;
      }

      const supersededTransaction =
        await this.repositories.dealMilestoneSettlementExecutionTransactions.markSuperseded(
          trackedTransaction.id,
          replacementTransaction.id,
          occurredAt
        );
      supersededTransactions.push(supersededTransaction);

      await this.repositories.auditLogs.append({
        action: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_SUPERSEDED",
        actorUserId: access.actor.user.id,
        entityId: supersededTransaction.id,
        entityType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
        id: randomUUID(),
        ipAddress: requestMetadata.ipAddress,
        metadata: {
          supersededAt: occurredAt,
          supersededByDealMilestoneSettlementExecutionTransactionId:
            replacementTransaction.id,
          supersededByTransactionHash: replacementTransaction.transactionHash
        },
        occurredAt,
        organizationId: access.organization.id,
        userAgent: requestMetadata.userAgent
      });
    }

    return supersededTransactions;
  }

  private requireLoadedSettlementRequest(
    records: LoadedMilestoneVersionRecords,
    dealMilestoneSettlementRequestId: string
  ): DealMilestoneSettlementRequestRecord {
    const settlementRequest =
      records.settlementRequestsById.get(dealMilestoneSettlementRequestId) ?? null;

    if (!settlementRequest) {
      throw new NotFoundException("deal milestone settlement request not found");
    }

    return settlementRequest;
  }

  private resolveSettlementExecutionBlockers(
    settlementRequest: DealMilestoneSettlementRequestRecord,
    latestSubmission: DealMilestoneSubmissionRecord | null,
    milestone: DealVersionMilestoneRecord,
    linkedAgreement: EscrowAgreementRecord | null,
    indexedSettlement: EscrowAgreementMilestoneSettlementRecord | null
  ): MilestoneSettlementExecutionBlocker[] {
    const blockers: MilestoneSettlementExecutionBlocker[] = [];

    if (
      latestSubmission &&
      latestSubmission.id !== settlementRequest.dealMilestoneSubmissionId
    ) {
      blockers.push("NEWER_SUBMISSION_EXISTS");
    }

    if (!linkedAgreement) {
      blockers.push("AGREEMENT_NOT_INDEXED");
      return blockers;
    }

    if (linkedAgreement.milestoneCount < milestone.position) {
      blockers.push("AGREEMENT_MILESTONE_COUNT_MISMATCH");
    }

    if (indexedSettlement) {
      blockers.push("SETTLEMENT_ALREADY_EXECUTED");
    }

    return blockers;
  }

  private async loadIndexedMilestoneSettlementsByPosition(
    linkedAgreement: EscrowAgreementRecord | null
  ): Promise<ReadonlyMap<number, EscrowAgreementMilestoneSettlementRecord>> {
    if (!linkedAgreement) {
      return new Map();
    }

    const settlements =
      await this.release4Repositories.escrowAgreementMilestoneSettlements.listByChainIdAndAgreementAddress(
        linkedAgreement.chainId,
        linkedAgreement.agreementAddress
      );

    return new Map(
      settlements.map((settlement) => [settlement.milestonePosition, settlement] as const)
    );
  }

  private findLatestMilestoneSubmission(
    records: LoadedMilestoneVersionRecords,
    dealVersionMilestoneId: string
  ): DealMilestoneSubmissionRecord | null {
    const submissions = records.submissionsByMilestoneId.get(dealVersionMilestoneId) ?? [];
    return submissions[submissions.length - 1] ?? null;
  }

  private async listSubmissionAttachmentFiles(
    dealMilestoneSubmissionId: string
  ): Promise<FileRecord[]> {
    const fileLinks =
      await this.repositories.dealMilestoneSubmissionFiles.listByDealMilestoneSubmissionId(
        dealMilestoneSubmissionId
      );

    return Promise.all(fileLinks.map((link) => this.requireLinkedFile(link)));
  }

  private toFileSummaries(files: FileRecord[]): DealMilestoneSubmissionSummary["attachmentFiles"] {
    return files.map((file) => ({
      byteSize: file.byteSize,
      category: file.category,
      createdAt: file.createdAt,
      createdByUserId: file.createdByUserId,
      id: file.id,
      mediaType: file.mediaType,
      organizationId: file.organizationId,
      originalFilename: file.originalFilename,
      sha256Hex: file.sha256Hex,
      storageKey: file.storageKey,
      updatedAt: file.updatedAt
    }));
  }

  private async toSubmissionSummary(
    submission: DealMilestoneSubmissionRecord,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string,
    review: DealMilestoneReviewRecord | null,
    disputeRecords: LoadedMilestoneDisputeRecords,
    settlementPreparationsByRequestId: ReadonlyMap<
      string,
      DealMilestoneSettlementPreparationRecord
    >,
    settlementRequestsByReviewId: ReadonlyMap<
      string,
      DealMilestoneSettlementRequestRecord
    >
  ): Promise<DealMilestoneSubmissionSummary> {
    const attachmentFiles = await this.listSubmissionAttachmentFiles(submission.id);

    return {
      attachmentFiles: this.toFileSummaries(attachmentFiles),
      dealVersionId: submission.dealVersionId,
      dealVersionMilestoneId: submission.dealVersionMilestoneId,
      draftDealId: submission.draftDealId,
      id: submission.id,
      organizationId: submission.organizationId,
      review: review
        ? this.toReviewSummary(
            review,
            disputeRecords,
            settlementPreparationsByRequestId,
            settlementRequestsByReviewId.get(review.id) ?? null
          )
        : null,
      reviewDeadline: this.toReviewDeadlineSummary(
        submission,
        review,
        deadlineExpiry,
        evaluatedAt
      ),
      statementMarkdown: submission.statementMarkdown,
      submissionNumber: submission.submissionNumber,
      submittedAt: submission.submittedAt,
      submittedByCounterpartyId: submission.submittedByCounterpartyId,
      submittedByPartyRole: submission.submittedByPartyRole,
      submittedByPartySubjectType: submission.submittedByPartySubjectType,
      submittedByUserId: submission.submittedByUserId
    };
  }

  private async toDisputeSummary(
    dispute: DealMilestoneDisputeRecord | null,
    disputeRecords: LoadedMilestoneDisputeRecords
  ): Promise<DealMilestoneDisputeSummary | null> {
    if (!dispute) {
      return null;
    }

    const evidenceLinks =
      disputeRecords.disputeEvidenceByDisputeId.get(dispute.id) ?? [];
    const attachmentFiles = await Promise.all(
      evidenceLinks.map(async (link) =>
        this.toDisputeEvidenceSummary(link, await this.requireLinkedFile(link))
      )
    );
    const latestAssignment =
      disputeRecords.latestDisputeAssignmentsByDisputeId.get(dispute.id) ?? null;
    const latestDecision =
      disputeRecords.disputeDecisionsByDisputeId.get(dispute.id) ?? null;

    return {
      attachmentFiles,
      dealMilestoneReviewId: dispute.dealMilestoneReviewId,
      dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
      dealVersionId: dispute.dealVersionId,
      dealVersionMilestoneId: dispute.dealVersionMilestoneId,
      draftDealId: dispute.draftDealId,
      id: dispute.id,
      latestAssignment: latestAssignment
        ? this.toDisputeAssignmentSummary(latestAssignment)
        : null,
      latestDecision: latestDecision
        ? this.toDisputeDecisionSummary(latestDecision, dispute)
        : null,
      openedAt: dispute.openedAt,
      openedByUserId: dispute.openedByUserId,
      organizationId: dispute.organizationId,
      statementMarkdown: dispute.statementMarkdown,
      status: latestDecision ? "RESOLVED" : "OPEN"
    };
  }

  private toDisputeEvidenceSummary(
    evidence: DealMilestoneDisputeEvidenceRecord,
    file: FileRecord
  ): DealMilestoneDisputeEvidenceSummary {
    return {
      createdAt: evidence.createdAt,
      dealMilestoneDisputeId: evidence.dealMilestoneDisputeId,
      file: this.toFileSummaries([file])[0]!,
      fileId: evidence.fileId,
      id: evidence.id
    };
  }

  private toDisputeAssignmentSummary(
    assignment: DealMilestoneDisputeAssignmentRecord
  ): DealMilestoneDisputeAssignmentSummary {
    return {
      arbitratorAddress: assignment.arbitratorAddress,
      assignedAt: assignment.assignedAt,
      assignedByUserId: assignment.assignedByUserId,
      chainId: assignment.chainId,
      dealMilestoneDisputeId: assignment.dealMilestoneDisputeId,
      id: assignment.id
    };
  }

  private toDisputeDecisionSummary(
    decision: DealMilestoneDisputeDecisionRecord,
    dispute: DealMilestoneDisputeRecord
  ): DealMilestoneDisputeDecisionSummary {
    return {
      assignmentId: decision.dealMilestoneDisputeAssignmentId,
      decidedAt: decision.decidedAt,
      dealMilestoneDisputeId: decision.dealMilestoneDisputeId,
      dealMilestoneReviewId: dispute.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId: decision.dealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
      dealVersionId: dispute.dealVersionId,
      dealVersionMilestoneId: dispute.dealVersionMilestoneId,
      draftDealId: dispute.draftDealId,
      id: decision.id,
      kind: decision.kind,
      organizationId: decision.organizationId,
      signature: decision.signature,
      signedByArbitratorAddress: decision.signedByArbitratorAddress,
      statementMarkdown: decision.statementMarkdown,
      typedData: decision.typedData
    };
  }

  private async toSubmissionTimelineEvent(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord | null,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string
  ): Promise<DealMilestoneTimelineEvent> {
    const attachmentFiles = await this.listSubmissionAttachmentFiles(submission.id);

    return {
      actorUserId: submission.submittedByUserId,
      attachmentFiles: this.toFileSummaries(attachmentFiles),
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: null,
      dealMilestoneReviewId: null,
      dealMilestoneSettlementRequestId: null,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: submission.dealVersionId,
      dealVersionMilestoneId: submission.dealVersionMilestoneId,
      draftDealId: submission.draftDealId,
      id: submission.id,
      dispute: null,
      indexedSettlement: null,
      kind: "SUBMISSION_CREATED",
      occurredAt: submission.submittedAt,
      organizationId: submission.organizationId,
      reviewDeadline: this.toReviewDeadlineSummary(
        submission,
        review,
        deadlineExpiry,
        evaluatedAt
      ),
      reviewDecision: null,
      settlementPreparation: null,
      settlementKind: null,
      statementMarkdown: submission.statementMarkdown,
      submittedByCounterpartyId: submission.submittedByCounterpartyId,
      submittedByPartyRole: submission.submittedByPartyRole,
      submittedByPartySubjectType: submission.submittedByPartySubjectType
    };
  }

  private toReviewSummary(
    review: DealMilestoneReviewRecord,
    disputeRecords: LoadedMilestoneDisputeRecords,
    settlementPreparationsByRequestId: ReadonlyMap<
      string,
      DealMilestoneSettlementPreparationRecord
    >,
    settlementRequest: DealMilestoneSettlementRequestRecord | null = null
  ): DealMilestoneReviewSummary {
    return {
      decision: review.decision,
      dealMilestoneSubmissionId: review.dealMilestoneSubmissionId,
      dealVersionId: review.dealVersionId,
      dealVersionMilestoneId: review.dealVersionMilestoneId,
      draftDealId: review.draftDealId,
      id: review.id,
      organizationId: review.organizationId,
      reviewedAt: review.reviewedAt,
      reviewedByUserId: review.reviewedByUserId,
      settlementRequest: settlementRequest
        ? this.toSettlementRequestSummary(
            settlementRequest,
            disputeRecords,
            settlementPreparationsByRequestId.get(settlementRequest.id) ?? null
          )
        : null,
      statementMarkdown: review.statementMarkdown
    };
  }

  private toSettlementRequestSummary(
    settlementRequest: DealMilestoneSettlementRequestRecord,
    disputeRecords: LoadedMilestoneDisputeRecords,
    executionPreparation: DealMilestoneSettlementPreparationRecord | null = null
  ): DealMilestoneSettlementRequestSummary {
    const disputeDecision =
      disputeRecords.disputeDecisionsBySettlementRequestId.get(settlementRequest.id) ??
      null;

    return {
      dealMilestoneDisputeDecisionId: disputeDecision?.id ?? null,
      dealMilestoneDisputeId: settlementRequest.dealMilestoneDisputeId,
      dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
      dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
      dealVersionId: settlementRequest.dealVersionId,
      dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
      draftDealId: settlementRequest.draftDealId,
      executionPreparation: executionPreparation
        ? this.toSettlementPreparationSummary(executionPreparation)
        : null,
      id: settlementRequest.id,
      kind: settlementRequest.kind,
      organizationId: settlementRequest.organizationId,
      requestedAt: settlementRequest.requestedAt,
      requestedByArbitratorAddress:
        settlementRequest.requestedByArbitratorAddress,
      requestedByUserId: settlementRequest.requestedByUserId,
      source: settlementRequest.source,
      statementMarkdown: settlementRequest.statementMarkdown
    };
  }

  private toSettlementPreparationSummary(
    preparation: DealMilestoneSettlementPreparationRecord
  ): DealMilestoneSettlementPreparationSummary {
    return {
      agreementAddress: preparation.agreementAddress,
      chainId: preparation.chainId,
      dealId: preparation.dealId,
      dealMilestoneReviewId: preparation.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId:
        preparation.dealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: preparation.dealMilestoneSubmissionId,
      dealVersionHash: preparation.dealVersionHash,
      dealVersionId: preparation.dealVersionId,
      dealVersionMilestoneId: preparation.dealVersionMilestoneId,
      draftDealId: preparation.draftDealId,
      id: preparation.id,
      kind: preparation.kind,
      milestoneAmountMinor: preparation.milestoneAmountMinor,
      milestonePosition: preparation.milestonePosition,
      organizationId: preparation.organizationId,
      preparedAt: preparation.preparedAt,
      settlementTokenAddress: preparation.settlementTokenAddress,
      totalAmount: preparation.totalAmount
    };
  }

  private toIndexedSettlementSummary(
    settlement: EscrowAgreementMilestoneSettlementRecord
  ): DealMilestoneIndexedSettlementSummary {
    return {
      agreementAddress: settlement.agreementAddress,
      amount: settlement.amount,
      beneficiaryAddress: settlement.beneficiaryAddress,
      chainId: settlement.chainId,
      dealId: settlement.dealId,
      dealVersionHash: settlement.dealVersionHash,
      kind: settlement.kind,
      milestonePosition: settlement.milestonePosition,
      settledAt: settlement.settledAt,
      settledBlockNumber: settlement.settledBlockNumber,
      settledByAddress: settlement.settledByAddress,
      settledTransactionHash: settlement.settledTransactionHash
    };
  }

  private toReviewTimelineEvent(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string
  ): DealMilestoneTimelineEvent {
    return {
      actorUserId: review.reviewedByUserId,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: null,
      dealMilestoneReviewId: review.id,
      dealMilestoneSettlementRequestId: null,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: review.dealVersionId,
      dealVersionMilestoneId: review.dealVersionMilestoneId,
      draftDealId: review.draftDealId,
      id: review.id,
      dispute: null,
      indexedSettlement: null,
      kind:
        review.decision === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
      occurredAt: review.reviewedAt,
      organizationId: review.organizationId,
      reviewDeadline: this.toReviewDeadlineSummary(
        submission,
        review,
        deadlineExpiry,
        evaluatedAt
      ),
      reviewDecision: review.decision,
      settlementPreparation: null,
      settlementKind: null,
      statementMarkdown: review.statementMarkdown,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private toDeadlineExpiryTimelineEvent(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord | null,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord,
    evaluatedAt: string
  ): DealMilestoneTimelineEvent {
    return {
      actorUserId: null,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: null,
      dealMilestoneReviewId: review?.id ?? null,
      dealMilestoneSettlementRequestId: null,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: deadlineExpiry.dealVersionId,
      dealVersionMilestoneId: deadlineExpiry.dealVersionMilestoneId,
      draftDealId: deadlineExpiry.draftDealId,
      id: deadlineExpiry.id,
      dispute: null,
      indexedSettlement: null,
      kind: "REVIEW_DEADLINE_EXPIRED",
      occurredAt: deadlineExpiry.expiredAt,
      organizationId: deadlineExpiry.organizationId,
      reviewDeadline: this.toReviewDeadlineSummary(
        submission,
        review,
        deadlineExpiry,
        evaluatedAt
      ),
      reviewDecision: review?.decision ?? null,
      settlementPreparation: null,
      settlementKind: null,
      statementMarkdown: null,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private toSettlementRequestTimelineEvent(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord,
    settlementRequest: DealMilestoneSettlementRequestRecord,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string
  ): DealMilestoneTimelineEvent {
    return {
      actorUserId: settlementRequest.requestedByUserId,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: settlementRequest.dealMilestoneDisputeId,
      dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId: settlementRequest.id,
      dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
      dealVersionId: settlementRequest.dealVersionId,
      dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
      draftDealId: settlementRequest.draftDealId,
      id: settlementRequest.id,
      dispute: null,
      indexedSettlement: null,
      kind:
        settlementRequest.kind === "RELEASE"
          ? "RELEASE_REQUESTED"
          : "REFUND_REQUESTED",
      occurredAt: settlementRequest.requestedAt,
      organizationId: settlementRequest.organizationId,
      reviewDeadline: this.toReviewDeadlineSummary(
        submission,
        review,
        deadlineExpiry,
        evaluatedAt
      ),
      reviewDecision: review.decision,
      settlementPreparation: null,
      settlementKind: settlementRequest.kind,
      statementMarkdown: settlementRequest.statementMarkdown,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private toSettlementPreparationTimelineEvent(
    settlementRequest: DealMilestoneSettlementRequestRecord,
    settlementPreparation: DealMilestoneSettlementPreparationRecord
  ): DealMilestoneTimelineEvent {
    return {
      actorUserId: null,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: settlementRequest.dealMilestoneDisputeId,
      dealMilestoneReviewId: settlementPreparation.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId:
        settlementPreparation.dealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: settlementPreparation.dealMilestoneSubmissionId,
      dealVersionId: settlementPreparation.dealVersionId,
      dealVersionMilestoneId: settlementPreparation.dealVersionMilestoneId,
      draftDealId: settlementPreparation.draftDealId,
      id: settlementPreparation.id,
      dispute: null,
      indexedSettlement: null,
      kind: "SETTLEMENT_PREPARED",
      occurredAt: settlementPreparation.preparedAt,
      organizationId: settlementPreparation.organizationId,
      reviewDeadline: null,
      reviewDecision: null,
      settlementPreparation: this.toSettlementPreparationSummary(
        settlementPreparation
      ),
      settlementKind: settlementRequest.kind,
      statementMarkdown: null,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private toIndexedSettlementTimelineEvent(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord,
    settlementRequest: DealMilestoneSettlementRequestRecord,
    indexedSettlement: EscrowAgreementMilestoneSettlementRecord
  ): DealMilestoneTimelineEvent {
    return {
      actorUserId: null,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: settlementRequest.dealMilestoneDisputeId,
      dealMilestoneReviewId: review.id,
      dealMilestoneSettlementRequestId: settlementRequest.id,
      dealMilestoneSubmissionId: submission.id,
      dealVersionId: settlementRequest.dealVersionId,
      dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
      draftDealId: settlementRequest.draftDealId,
      id: `${settlementRequest.id}:${indexedSettlement.settledTransactionHash}`,
      dispute: null,
      indexedSettlement: this.toIndexedSettlementSummary(indexedSettlement),
      kind:
        indexedSettlement.kind === "RELEASE"
          ? "RELEASE_EXECUTED"
          : "REFUND_EXECUTED",
      occurredAt: indexedSettlement.settledAt,
      organizationId: settlementRequest.organizationId,
      reviewDeadline: null,
      reviewDecision: review.decision,
      settlementPreparation: null,
      settlementKind: indexedSettlement.kind,
      statementMarkdown: null,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private async toDisputeOpenedTimelineEvent(
    dispute: DealMilestoneDisputeRecord,
    disputeRecords: LoadedMilestoneDisputeRecords
  ): Promise<DealMilestoneTimelineEvent> {
    return {
      actorUserId: dispute.openedByUserId,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: dispute.id,
      dealMilestoneReviewId: dispute.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId: null,
      dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
      dealVersionId: dispute.dealVersionId,
      dealVersionMilestoneId: dispute.dealVersionMilestoneId,
      draftDealId: dispute.draftDealId,
      dispute: await this.toDisputeSummary(dispute, disputeRecords),
      id: dispute.id,
      indexedSettlement: null,
      kind: "DISPUTE_OPENED",
      occurredAt: dispute.openedAt,
      organizationId: dispute.organizationId,
      reviewDeadline: null,
      reviewDecision: null,
      settlementPreparation: null,
      settlementKind: null,
      statementMarkdown: dispute.statementMarkdown,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private async toDisputeAssignmentTimelineEvent(
    dispute: DealMilestoneDisputeRecord,
    assignment: DealMilestoneDisputeAssignmentRecord,
    disputeRecords: LoadedMilestoneDisputeRecords
  ): Promise<DealMilestoneTimelineEvent> {
    return {
      actorUserId: assignment.assignedByUserId,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: null,
      dealMilestoneDisputeId: dispute.id,
      dealMilestoneReviewId: dispute.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId: null,
      dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
      dealVersionId: dispute.dealVersionId,
      dealVersionMilestoneId: dispute.dealVersionMilestoneId,
      draftDealId: dispute.draftDealId,
      dispute: await this.toDisputeSummary(dispute, disputeRecords),
      id: assignment.id,
      indexedSettlement: null,
      kind: "DISPUTE_ARBITRATOR_ASSIGNED",
      occurredAt: assignment.assignedAt,
      organizationId: assignment.organizationId,
      reviewDeadline: null,
      reviewDecision: null,
      settlementPreparation: null,
      settlementKind: null,
      statementMarkdown: null,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private async toDisputeDecisionTimelineEvent(
    dispute: DealMilestoneDisputeRecord,
    decision: DealMilestoneDisputeDecisionRecord,
    disputeRecords: LoadedMilestoneDisputeRecords
  ): Promise<DealMilestoneTimelineEvent> {
    return {
      actorUserId: null,
      attachmentFiles: [],
      dealMilestoneDisputeDecisionId: decision.id,
      dealMilestoneDisputeId: dispute.id,
      dealMilestoneReviewId: dispute.dealMilestoneReviewId,
      dealMilestoneSettlementRequestId: decision.dealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: dispute.dealMilestoneSubmissionId,
      dealVersionId: dispute.dealVersionId,
      dealVersionMilestoneId: dispute.dealVersionMilestoneId,
      draftDealId: dispute.draftDealId,
      dispute: await this.toDisputeSummary(dispute, disputeRecords),
      id: decision.id,
      indexedSettlement: null,
      kind: "DISPUTE_DECISION_SUBMITTED",
      occurredAt: decision.decidedAt,
      organizationId: decision.organizationId,
      reviewDeadline: null,
      reviewDecision: null,
      settlementPreparation: null,
      settlementKind: decision.kind,
      statementMarkdown: decision.statementMarkdown,
      submittedByCounterpartyId: null,
      submittedByPartyRole: null,
      submittedByPartySubjectType: null
    };
  }

  private toReviewDeadlineSummary(
    submission: DealMilestoneSubmissionRecord,
    review: DealMilestoneReviewRecord | null,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string
  ): MilestoneReviewDeadlineSummary {
    if (review) {
      if (!isIsoTimestampAfter(review.reviewedAt, submission.reviewDeadlineAt)) {
        return {
          deadlineAt: submission.reviewDeadlineAt,
          expiredAt: null,
          status: "REVIEWED_ON_TIME"
        };
      }

      return {
        deadlineAt: submission.reviewDeadlineAt,
        expiredAt: deadlineExpiry?.expiredAt ?? submission.reviewDeadlineAt,
        status: "REVIEWED_AFTER_DEADLINE"
      };
    }

    if (isIsoTimestampAtOrAfter(evaluatedAt, submission.reviewDeadlineAt)) {
      return {
        deadlineAt: submission.reviewDeadlineAt,
        expiredAt: deadlineExpiry?.expiredAt ?? submission.reviewDeadlineAt,
        status: "EXPIRED"
      };
    }

    return {
      deadlineAt: submission.reviewDeadlineAt,
      expiredAt: null,
      status: "OPEN"
    };
  }

  private async loadMilestoneVersionRecords(
    dealVersionId: string
  ): Promise<LoadedMilestoneVersionRecords> {
    const [
      milestones,
      submissions,
      reviews,
      disputes,
      settlementRequests,
      settlementPreparations,
      deadlineExpiries
    ] =
      await Promise.all([
        this.repositories.dealVersionMilestones.listByDealVersionId(dealVersionId),
        this.repositories.dealMilestoneSubmissions.listByDealVersionId(dealVersionId),
        this.repositories.dealMilestoneReviews.listByDealVersionId(dealVersionId),
        this.repositories.dealMilestoneDisputes.listByDealVersionId(dealVersionId),
        this.repositories.dealMilestoneSettlementRequests.listByDealVersionId(
          dealVersionId
        ),
        this.repositories.dealMilestoneSettlementPreparations.listByDealVersionId(
          dealVersionId
        ),
        this.repositories.dealMilestoneReviewDeadlineExpiries.listByDealVersionId(
          dealVersionId
        )
      ]);
    const settlementRequestsById = new Map<
      string,
      DealMilestoneSettlementRequestRecord
    >();
    const submissionsById = new Map<string, DealMilestoneSubmissionRecord>();
    const submissionsByMilestoneId = new Map<string, DealMilestoneSubmissionRecord[]>();
    const reviewsById = new Map<string, DealMilestoneReviewRecord>();
    const reviewsBySubmissionId = new Map<string, DealMilestoneReviewRecord>();
    const deadlineExpiriesBySubmissionId = new Map<
      string,
      DealMilestoneReviewDeadlineExpiryRecord
    >();
    const settlementRequestsByReviewId = new Map<
      string,
      DealMilestoneSettlementRequestRecord
    >();
    const settlementPreparationsByRequestId = new Map<
      string,
      DealMilestoneSettlementPreparationRecord
    >();
    const disputeRecords = await this.loadMilestoneDisputeRecords(disputes);

    for (const submission of submissions) {
      submissionsById.set(submission.id, submission);
      const records =
        submissionsByMilestoneId.get(submission.dealVersionMilestoneId) ?? [];
      records.push(submission);
      submissionsByMilestoneId.set(submission.dealVersionMilestoneId, records);
    }

    for (const review of reviews) {
      reviewsById.set(review.id, review);
      reviewsBySubmissionId.set(review.dealMilestoneSubmissionId, review);
    }

    for (const deadlineExpiry of deadlineExpiries) {
      deadlineExpiriesBySubmissionId.set(
        deadlineExpiry.dealMilestoneSubmissionId,
        deadlineExpiry
      );
    }

    for (const settlementRequest of settlementRequests) {
      settlementRequestsById.set(settlementRequest.id, settlementRequest);
      settlementRequestsByReviewId.set(
        settlementRequest.dealMilestoneReviewId,
        settlementRequest
      );
    }

    for (const settlementPreparation of settlementPreparations) {
      settlementPreparationsByRequestId.set(
        settlementPreparation.dealMilestoneSettlementRequestId,
        settlementPreparation
      );
    }

    return {
      disputeRecords,
      deadlineExpiriesBySubmissionId,
      evaluatedAt: new Date().toISOString(),
      milestones,
      reviewsById,
      reviewsBySubmissionId,
      settlementRequests,
      settlementRequestsById,
      settlementPreparationsByRequestId,
      settlementRequestsByReviewId,
      submissionsById,
      submissionsByMilestoneId
    };
  }

  private async loadMilestoneDisputeRecords(
    disputes: readonly DealMilestoneDisputeRecord[]
  ): Promise<LoadedMilestoneDisputeRecords> {
    const disputesById = new Map<string, DealMilestoneDisputeRecord>();
    const disputesByReviewId = new Map<string, DealMilestoneDisputeRecord>();
    const disputeEvidenceByDisputeId = new Map<
      string,
      DealMilestoneDisputeEvidenceRecord[]
    >();
    const latestDisputeAssignmentsByDisputeId = new Map<
      string,
      DealMilestoneDisputeAssignmentRecord
    >();
    const disputeDecisionsByDisputeId = new Map<
      string,
      DealMilestoneDisputeDecisionRecord
    >();
    const disputeDecisionsBySettlementRequestId = new Map<
      string,
      DealMilestoneDisputeDecisionRecord
    >();

    await Promise.all(
      disputes.map(async (dispute) => {
        disputesById.set(dispute.id, dispute);
        disputesByReviewId.set(dispute.dealMilestoneReviewId, dispute);

        const [evidenceLinks, assignments, decision] = await Promise.all([
          this.repositories.dealMilestoneDisputeEvidence.listByDealMilestoneDisputeId(
            dispute.id
          ),
          this.repositories.dealMilestoneDisputeAssignments.listByDealMilestoneDisputeId(
            dispute.id
          ),
          this.repositories.dealMilestoneDisputeDecisions.findByDealMilestoneDisputeId(
            dispute.id
          )
        ]);

        disputeEvidenceByDisputeId.set(dispute.id, evidenceLinks);

        const latestAssignment = assignments[assignments.length - 1] ?? null;

        if (latestAssignment) {
          latestDisputeAssignmentsByDisputeId.set(dispute.id, latestAssignment);
        }

        if (decision) {
          disputeDecisionsByDisputeId.set(dispute.id, decision);
          disputeDecisionsBySettlementRequestId.set(
            decision.dealMilestoneSettlementRequestId,
            decision
          );
        }
      })
    );

    return {
      disputeDecisionsByDisputeId,
      disputeDecisionsBySettlementRequestId,
      disputeEvidenceByDisputeId,
      disputes: [...disputes],
      disputesById,
      disputesByReviewId,
      latestDisputeAssignmentsByDisputeId
    };
  }

  private async requireLinkedFile(
    link: { fileId: string }
  ): Promise<FileRecord> {
    const file = await this.repositories.files.findById(link.fileId);

    if (!file) {
      throw new NotFoundException("linked file not found");
    }

    return file;
  }

  private async requireFilesInOrganization(
    organizationId: string,
    fileIds: string[]
  ): Promise<FileRecord[]> {
    const files = await Promise.all(
      fileIds.map((fileId) => this.repositories.files.findById(fileId))
    );

    return files.map((file) => {
      if (!file || file.organizationId !== organizationId) {
        throw new NotFoundException("file not found");
      }

      return file;
    });
  }

  private async requireWorkflowAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<MilestoneWorkflowAccessContext> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      minimumRole
    );
    const [draft, version] = await Promise.all([
      this.repositories.draftDeals.findById(draftDealId),
      this.repositories.dealVersions.findById(dealVersionId)
    ]);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    if (
      !version ||
      version.organizationId !== organizationId ||
      version.draftDealId !== draft.id
    ) {
      throw new NotFoundException("deal version not found");
    }

    const parties = await this.repositories.dealVersionParties.listByDealVersionId(version.id);
    const organizationParties = parties.filter(
      (party) =>
        party.subjectType === "ORGANIZATION" &&
        party.organizationId === organizationId
    );

    if (organizationParties.length !== 1) {
      throw new ConflictException(
        "deal version must have exactly one organization-side party"
      );
    }

    const sellerParties = parties.filter((party) => party.role === "SELLER");

    if (sellerParties.length !== 1) {
      throw new ConflictException("deal version must have exactly one seller party");
    }

    return {
      actor: authorized.actor,
      draft,
      membership: authorized.membership,
      organization: authorized.organization,
      organizationParty: organizationParties[0]!,
      sellerParty: sellerParties[0]!,
      version
    };
  }

  private async requireMilestoneAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    requestMetadata: RequestMetadata
  ): Promise<MilestoneAccessContext> {
    const access = await this.requireWorkflowAccess(
      organizationId,
      draftDealId,
      dealVersionId,
      requestMetadata
    );
    const [linkedAgreement, milestone] = await Promise.all([
      this.findLinkedAgreementForDraft(access.draft),
      this.repositories.dealVersionMilestones.findById(dealVersionMilestoneId)
    ]);

    if (!milestone || milestone.dealVersionId !== access.version.id) {
      throw new NotFoundException("deal milestone not found");
    }

    return {
      ...access,
      linkedAgreement,
      milestone
    };
  }

  private async requireCounterpartyMilestoneSubmissionContext(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    statementMarkdown: string
  ): Promise<CounterpartyMilestoneSubmissionContext> {
    const [draft, version] = await Promise.all([
      this.repositories.draftDeals.findById(draftDealId),
      this.repositories.dealVersions.findById(dealVersionId)
    ]);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    if (
      !version ||
      version.organizationId !== organizationId ||
      version.draftDealId !== draft.id
    ) {
      throw new NotFoundException("deal version not found");
    }

    const [draftParties, versionParties, milestone, milestoneSubmissions, linkedAgreement] =
      await Promise.all([
        this.repositories.draftDealParties.listByDraftDealId(draft.id),
        this.repositories.dealVersionParties.listByDealVersionId(version.id),
        this.repositories.dealVersionMilestones.findById(dealVersionMilestoneId),
        this.repositories.dealMilestoneSubmissions.listByDealVersionMilestoneId(
          dealVersionMilestoneId
        ),
        this.findLinkedAgreementForDraft(draft)
      ]);

    if (!milestone || milestone.dealVersionId !== version.id) {
      throw new NotFoundException("deal milestone not found");
    }

    const counterpartyParties = draftParties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );

    if (counterpartyParties.length !== 1) {
      throw new ConflictException("draft deal must have exactly one counterparty party");
    }

    const sellerParties = versionParties.filter((party) => party.role === "SELLER");

    if (sellerParties.length !== 1) {
      throw new ConflictException("deal version must have exactly one seller party");
    }

    const counterpartyParty = counterpartyParties[0]!;
    const versionSellerParty = sellerParties[0]!;

    if (versionSellerParty.subjectType !== "COUNTERPARTY") {
      throw new ConflictException("milestone seller party is not a counterparty");
    }

    if (counterpartyParty.counterpartyId !== versionSellerParty.counterpartyId) {
      throw new ConflictException(
        "draft counterparty party does not match milestone seller party"
      );
    }

    if (!counterpartyParty.walletAddress) {
      throw new ConflictException("counterparty wallet address is required");
    }

    const [fileLinks, milestones] = await Promise.all([
      this.repositories.dealVersionFiles.listByDealVersionId(version.id),
      this.repositories.dealVersionMilestones.listByDealVersionId(version.id)
    ]);
    const files = await Promise.all(
      fileLinks.map(async (link) => {
        const file = await this.repositories.files.findById(link.fileId);

        if (!file) {
          throw new NotFoundException("linked file not found");
        }

        return file;
      })
    );
    const dealId = buildCanonicalDealId(draft.organizationId, draft.id);
    const dealVersionHash = buildCanonicalDealVersionHash(
      draft,
      version,
      versionParties,
      milestones,
      files
    );
    const submissionNumber = milestoneSubmissions.length + 1;

    return {
      counterpartyParty,
      draft,
      linkedAgreement,
      milestone,
      submissionNumber,
      typedData: buildCounterpartyMilestoneSubmissionTypedData(
        draft,
        version,
        milestone.id,
        dealId,
        dealVersionHash,
        submissionNumber,
        statementMarkdown
      ),
      version,
      versionSellerParty
    };
  }

  private async requireMilestoneReviewAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    dealMilestoneSubmissionId: string,
    requestMetadata: RequestMetadata
  ): Promise<MilestoneReviewAccessContext> {
    const access = await this.requireMilestoneAccess(
      organizationId,
      draftDealId,
      dealVersionId,
      dealVersionMilestoneId,
      requestMetadata
    );
    const [submission, review, milestoneSubmissions] = await Promise.all([
      this.repositories.dealMilestoneSubmissions.findById(dealMilestoneSubmissionId),
      this.repositories.dealMilestoneReviews.findByDealMilestoneSubmissionId(
        dealMilestoneSubmissionId
      ),
      this.repositories.dealMilestoneSubmissions.listByDealVersionMilestoneId(
        dealVersionMilestoneId
      )
    ]);

    if (
      !submission ||
      submission.draftDealId !== access.draft.id ||
      submission.dealVersionId !== access.version.id ||
      submission.dealVersionMilestoneId !== access.milestone.id
    ) {
      throw new NotFoundException("deal milestone submission not found");
    }

    const latestSubmission = milestoneSubmissions[milestoneSubmissions.length - 1] ?? null;

    if (!latestSubmission) {
      throw new NotFoundException("deal milestone submission not found");
    }

    return {
      ...access,
      latestSubmission,
      review,
      submission
    };
  }

  private async requireMilestoneSettlementRequestAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    dealMilestoneSubmissionId: string,
    dealMilestoneReviewId: string,
    requestMetadata: RequestMetadata
  ): Promise<MilestoneSettlementRequestAccessContext> {
    const access = await this.requireMilestoneReviewAccess(
      organizationId,
      draftDealId,
      dealVersionId,
      dealVersionMilestoneId,
      dealMilestoneSubmissionId,
      requestMetadata
    );
    const settlementRequest =
      await this.repositories.dealMilestoneSettlementRequests.findByDealMilestoneReviewId(
        dealMilestoneReviewId
      );
    const dispute =
      await this.repositories.dealMilestoneDisputes.findByDealMilestoneReviewId(
        dealMilestoneReviewId
      );

    if (access.review && access.review.id !== dealMilestoneReviewId) {
      throw new NotFoundException("deal milestone review not found");
    }

    return {
      ...access,
      dispute,
      settlementRequest
    };
  }

  private async requireMilestoneDisputeAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    dealMilestoneSubmissionId: string,
    dealMilestoneReviewId: string,
    requestMetadata: RequestMetadata
  ): Promise<MilestoneDisputeAccessContext> {
    return this.requireMilestoneSettlementRequestAccess(
      organizationId,
      draftDealId,
      dealVersionId,
      dealVersionMilestoneId,
      dealMilestoneSubmissionId,
      dealMilestoneReviewId,
      requestMetadata
    );
  }

  private async requireExistingMilestoneDisputeAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealMilestoneDisputeId: string,
    requestMetadata: RequestMetadata
  ): Promise<ExistingMilestoneDisputeAccessContext> {
    const access = await this.requireWorkflowAccess(
      organizationId,
      draftDealId,
      dealVersionId,
      requestMetadata
    );
    const dispute =
      await this.repositories.dealMilestoneDisputes.findById(dealMilestoneDisputeId);

    if (
      !dispute ||
      dispute.organizationId !== access.organization.id ||
      dispute.draftDealId !== access.draft.id ||
      dispute.dealVersionId !== access.version.id
    ) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    const [linkedAgreement, milestone, submission, review, settlementRequest] =
      await Promise.all([
        this.findLinkedAgreementForDraft(access.draft),
        this.repositories.dealVersionMilestones.findById(
          dispute.dealVersionMilestoneId
        ),
        this.repositories.dealMilestoneSubmissions.findById(
          dispute.dealMilestoneSubmissionId
        ),
        this.repositories.dealMilestoneReviews.findById(dispute.dealMilestoneReviewId),
        this.repositories.dealMilestoneSettlementRequests.findByDealMilestoneReviewId(
          dispute.dealMilestoneReviewId
        )
      ]);

    if (!linkedAgreement) {
      throw new ConflictException("draft deal escrow is not active");
    }

    if (
      !milestone ||
      milestone.dealVersionId !== access.version.id ||
      !submission ||
      submission.dealVersionId !== access.version.id ||
      !review ||
      review.dealVersionId !== access.version.id
    ) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    return {
      ...access,
      dispute,
      linkedAgreement,
      milestone,
      review,
      settlementRequest,
      submission
    };
  }

  private async requireLatestDisputeAssignment(
    dealMilestoneDisputeId: string
  ): Promise<DealMilestoneDisputeAssignmentRecord> {
    const assignments =
      await this.repositories.dealMilestoneDisputeAssignments.listByDealMilestoneDisputeId(
        dealMilestoneDisputeId
      );
    const latestAssignment = assignments[assignments.length - 1] ?? null;

    if (!latestAssignment) {
      throw new ConflictException("dispute arbitrator assignment is required");
    }

    return latestAssignment;
  }

  private async requireApprovedArbitratorAssignment(
    linkedAgreement: EscrowAgreementRecord | null,
    arbitratorAddress: string
  ): Promise<`0x${string}`> {
    if (!linkedAgreement) {
      throw new ConflictException("draft deal escrow is not active");
    }

    const normalizedAddress = getAddress(arbitratorAddress).toLowerCase() as `0x${string}`;

    if (!linkedAgreement.arbitratorAddress) {
      throw new ConflictException("agreement arbitrator is not configured");
    }

    if (linkedAgreement.arbitratorAddress !== normalizedAddress) {
      throw new ConflictException("assigned arbitrator does not match agreement arbitrator");
    }

    const manifest = getDeploymentManifestByChainId(linkedAgreement.chainId);
    const protocolConfigAddress = manifest?.contracts.ProtocolConfig?.toLowerCase() as
      | `0x${string}`
      | undefined;
    const protocolProjection = protocolConfigAddress
      ? await this.release4Repositories.protocolConfigStates.findByChainIdAndAddress(
          linkedAgreement.chainId,
          protocolConfigAddress
        )
      : null;

    if (!protocolProjection?.arbitratorRegistryAddress) {
      throw new ConflictException("arbitrator registry projection is unavailable");
    }

    const approvedArbitrators =
      await this.release4Repositories.arbitratorRegistryEntries.listApprovedByChainIdAndContract(
        linkedAgreement.chainId,
        protocolProjection.arbitratorRegistryAddress
      );
    const isApproved = approvedArbitrators.some(
      (entry) => entry.arbitrator === normalizedAddress && entry.isApproved
    );

    if (!isApproved) {
      throw new ConflictException("assigned arbitrator is not approved");
    }

    return normalizedAddress;
  }

  private async buildMilestoneDisputeDecisionChallenge(
    access: ExistingMilestoneDisputeAccessContext,
    kind: "RELEASE" | "REFUND",
    statementMarkdown: string
  ): Promise<DealMilestoneDisputeDecisionChallenge> {
    const assignment = await this.requireLatestDisputeAssignment(access.dispute.id);
    const [parties, milestones, fileLinks] = await Promise.all([
      this.repositories.dealVersionParties.listByDealVersionId(access.version.id),
      this.repositories.dealVersionMilestones.listByDealVersionId(access.version.id),
      this.repositories.dealVersionFiles.listByDealVersionId(access.version.id)
    ]);
    const files = await Promise.all(
      fileLinks.map(async (link) => {
        const file = await this.repositories.files.findById(link.fileId);

        if (!file) {
          throw new NotFoundException("linked file not found");
        }

        return file;
      })
    );
    const dealId = buildCanonicalDealId(access.draft.organizationId, access.draft.id);
    const dealVersionHash = buildCanonicalDealVersionHash(
      access.draft,
      access.version,
      parties,
      milestones,
      files
    );

    return {
      expectedWalletAddress: assignment.arbitratorAddress,
      typedData: buildMilestoneDisputeDecisionTypedData(access.draft, access.version, {
        dealId,
        dealMilestoneDisputeId: access.dispute.id,
        dealMilestoneReviewId: access.review.id,
        dealMilestoneSubmissionId: access.submission.id,
        dealVersionHash,
        dealVersionMilestoneId: access.milestone.id,
        kind,
        statementMarkdown
      })
    };
  }

  private assertEscrowIsActive(
    draft: DraftDealRecord,
    linkedAgreement: EscrowAgreementRecord | null
  ): void {
    if (isMilestoneWorkflowOpenDealState(draft.state)) {
      return;
    }

    if (isCustodyTrackedDealState(draft.state)) {
      throw new ConflictException("draft deal escrow is not active");
    }

    if (!linkedAgreement) {
      throw new ConflictException("draft deal escrow is not active");
    }

    const manifest = getDeploymentManifestByChainId(linkedAgreement.chainId);

    if (manifest && deploymentSupportsCreateAndFund(manifest) && !linkedAgreement.funded) {
      throw new ConflictException("draft deal escrow is not active");
    }
  }

  private doesSubmissionMatchSellerParty(
    submission: DealMilestoneSubmissionRecord,
    sellerParty: DealVersionPartyRecord
  ): boolean {
    if (submission.submittedByPartyRole !== sellerParty.role) {
      return false;
    }

    if (submission.submittedByPartySubjectType !== sellerParty.subjectType) {
      return false;
    }

    if (sellerParty.subjectType === "COUNTERPARTY") {
      return submission.submittedByCounterpartyId === sellerParty.counterpartyId;
    }

    return submission.submittedByCounterpartyId === null;
  }

  private assertSettlementKindMatchesReviewDecision(
    kind: DealMilestoneSettlementRequestSummary["kind"],
    decision: DealMilestoneReviewSummary["decision"]
  ): void {
    if (decision === "APPROVED" && kind !== "RELEASE") {
      throw new ConflictException("approved milestone reviews require release requests");
    }

    if (decision === "REJECTED" && kind !== "REFUND") {
      throw new ConflictException("rejected milestone reviews require refund requests");
    }
  }

  private async findLinkedAgreementForDraft(
    draft: DraftDealRecord
  ): Promise<EscrowAgreementRecord | null> {
    const chainId = normalizeApiChainId();
    const dealId = buildCanonicalDealId(draft.organizationId, draft.id);
    const agreements = await this.release4Repositories.escrowAgreements.listByChainId(
      chainId
    );

    return agreements.find((agreement) => agreement.dealId === dealId) ?? null;
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: AuthenticatedSessionContext;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
  }> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const [organization, membership] = await Promise.all([
      this.repositories.organizations.findById(organizationId),
      this.repositories.organizationMembers.findMembership(
        organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization access is required");
    }

    if (minimumRole && !hasMinimumOrganizationRole(membership.role, minimumRole)) {
      throw new ForbiddenException("organization role is insufficient");
    }

    return {
      actor,
      membership,
      organization
    };
  }

  private assertUniqueAttachmentFileIds(fileIds: string[]): void {
    if (new Set(fileIds).size !== fileIds.length) {
      throw new BadRequestException("attachment file ids must be unique");
    }
  }

  private buildReviewDeadlineAt(submittedAt: string): string {
    return addSecondsToIsoTimestamp(
      submittedAt,
      this.milestoneReviewConfiguration.reviewDeadlineSeconds
    );
  }
}
