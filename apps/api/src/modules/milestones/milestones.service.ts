import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  DealMilestoneReviewDeadlineExpiryRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  FileRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createCounterpartyMilestoneSubmissionSchema,
  createMilestoneReviewSchema,
  createMilestoneSettlementRequestSchema,
  createMilestoneSubmissionSchema,
  dealVersionMilestoneWorkflowParamsSchema,
  milestoneReviewParamsSchema,
  milestoneSettlementRequestParamsSchema,
  milestoneSubmissionParamsSchema,
  prepareCounterpartyMilestoneSubmissionSchema,
  type CounterpartyDealMilestoneSubmissionChallenge,
  type CreateCounterpartyDealMilestoneSubmissionResponse,
  type CreateDealMilestoneReviewResponse,
  type CreateDealMilestoneSettlementRequestResponse,
  type CreateDealMilestoneSubmissionResponse,
  type DealMilestoneReviewSummary,
  type DealMilestoneSettlementRequestSummary,
  type DealMilestoneSubmissionSummary,
  type DealVersionMilestoneSnapshot,
  type DealVersionMilestoneWorkflow,
  type ListDealVersionMilestoneWorkflowsResponse,
  type MilestoneReviewDeadlineSummary,
  type MilestoneWorkflowState,
  type PrepareCounterpartyDealMilestoneSubmissionResponse
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
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash,
  buildCounterpartyMilestoneSubmissionTypedData,
  counterpartyMilestoneSubmissionPrimaryType,
  counterpartyMilestoneSubmissionTypes,
  normalizeApiChainId
} from "../drafts/deal-identity";
import {
  MILESTONE_REVIEW_CONFIGURATION,
  type MilestoneReviewConfiguration
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
  settlementRequest: DealMilestoneSettlementRequestRecord | null;
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
  latestSubmission: DealMilestoneSubmissionSummary | null
): MilestoneWorkflowState {
  if (!latestSubmission) {
    return "PENDING";
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

@Injectable()
export class MilestonesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    @Inject(MILESTONE_REVIEW_CONFIGURATION)
    private readonly milestoneReviewConfiguration: MilestoneReviewConfiguration
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
      milestones: await this.buildMilestoneWorkflows(access.version.id)
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

    const milestone = await this.buildMilestoneWorkflows(access.version.id).then(
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

    const milestone = await this.buildMilestoneWorkflows(context.version.id).then(
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

    const milestone = await this.buildMilestoneWorkflows(access.version.id).then(
      (milestones) => milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      review: this.toReviewSummary(review)
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

    const now = new Date().toISOString();
    const settlementRequest =
      await this.repositories.dealMilestoneSettlementRequests.create({
        dealMilestoneReviewId: access.review.id,
        dealMilestoneSubmissionId: access.submission.id,
        dealVersionId: access.version.id,
        dealVersionMilestoneId: access.milestone.id,
        draftDealId: access.draft.id,
        id: randomUUID(),
        kind: parsedBody.data.kind,
        organizationId: access.organization.id,
        requestedAt: now,
        requestedByUserId: access.actor.user.id,
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

    const milestone = await this.buildMilestoneWorkflows(access.version.id).then(
      (milestones) => milestones.find((record) => record.milestone.id === access.milestone.id)
    );

    if (!milestone) {
      throw new NotFoundException("milestone workflow not found");
    }

    return {
      milestone,
      settlementRequest: this.toSettlementRequestSummary(settlementRequest)
    };
  }

  private async buildMilestoneWorkflows(
    dealVersionId: string
  ): Promise<DealVersionMilestoneWorkflow[]> {
    const [milestones, submissions, reviews, settlementRequests, deadlineExpiries] =
      await Promise.all([
      this.repositories.dealVersionMilestones.listByDealVersionId(dealVersionId),
      this.repositories.dealMilestoneSubmissions.listByDealVersionId(dealVersionId),
      this.repositories.dealMilestoneReviews.listByDealVersionId(dealVersionId),
      this.repositories.dealMilestoneSettlementRequests.listByDealVersionId(
        dealVersionId
      ),
      this.repositories.dealMilestoneReviewDeadlineExpiries.listByDealVersionId(
        dealVersionId
      )
    ]);
    const submissionsByMilestoneId = new Map<string, DealMilestoneSubmissionRecord[]>();
    const reviewsBySubmissionId = new Map<string, DealMilestoneReviewRecord>();
    const deadlineExpiriesBySubmissionId = new Map<
      string,
      DealMilestoneReviewDeadlineExpiryRecord
    >();
    const settlementRequestsByReviewId = new Map<
      string,
      DealMilestoneSettlementRequestRecord
    >();
    const evaluatedAt = new Date().toISOString();

    for (const submission of submissions) {
      const records =
        submissionsByMilestoneId.get(submission.dealVersionMilestoneId) ?? [];
      records.push(submission);
      submissionsByMilestoneId.set(submission.dealVersionMilestoneId, records);
    }

    for (const review of reviews) {
      reviewsBySubmissionId.set(review.dealMilestoneSubmissionId, review);
    }

    for (const deadlineExpiry of deadlineExpiries) {
      deadlineExpiriesBySubmissionId.set(
        deadlineExpiry.dealMilestoneSubmissionId,
        deadlineExpiry
      );
    }

    for (const settlementRequest of settlementRequests) {
      settlementRequestsByReviewId.set(
        settlementRequest.dealMilestoneReviewId,
        settlementRequest
      );
    }

    return Promise.all(
      milestones.map((milestone) =>
        this.buildMilestoneWorkflow(
          milestone,
          submissionsByMilestoneId.get(milestone.id) ?? [],
          deadlineExpiriesBySubmissionId,
          evaluatedAt,
          reviewsBySubmissionId,
          settlementRequestsByReviewId
        )
      )
    );
  }

  private async buildMilestoneWorkflow(
    milestone: DealVersionMilestoneRecord,
    submissions: DealMilestoneSubmissionRecord[],
    deadlineExpiriesBySubmissionId: ReadonlyMap<
      string,
      DealMilestoneReviewDeadlineExpiryRecord
    >,
    evaluatedAt: string,
    reviewsBySubmissionId: ReadonlyMap<string, DealMilestoneReviewRecord>,
    settlementRequestsByReviewId: ReadonlyMap<
      string,
      DealMilestoneSettlementRequestRecord
    >
  ): Promise<DealVersionMilestoneWorkflow> {
    const submissionSummaries = await Promise.all(
      submissions.map((submission) =>
        this.toSubmissionSummary(
          submission,
          deadlineExpiriesBySubmissionId.get(submission.id) ?? null,
          evaluatedAt,
          reviewsBySubmissionId.get(submission.id) ?? null,
          settlementRequestsByReviewId
        )
      )
    );
    const latestSubmission =
      submissionSummaries[submissionSummaries.length - 1] ?? null;

    return {
      latestReviewDeadline: latestSubmission?.reviewDeadline ?? null,
      latestReviewAt: latestSubmission?.review?.reviewedAt ?? null,
      latestSubmissionAt: latestSubmission?.submittedAt ?? null,
      milestone: toMilestoneSnapshot(milestone),
      state: resolveMilestoneWorkflowState(latestSubmission),
      submissions: submissionSummaries
    };
  }

  private async toSubmissionSummary(
    submission: DealMilestoneSubmissionRecord,
    deadlineExpiry: DealMilestoneReviewDeadlineExpiryRecord | null,
    evaluatedAt: string,
    review: DealMilestoneReviewRecord | null,
    settlementRequestsByReviewId: ReadonlyMap<
      string,
      DealMilestoneSettlementRequestRecord
    >
  ): Promise<DealMilestoneSubmissionSummary> {
    const fileLinks =
      await this.repositories.dealMilestoneSubmissionFiles.listByDealMilestoneSubmissionId(
        submission.id
      );
    const attachmentFiles = await Promise.all(
      fileLinks.map((link) => this.requireLinkedFile(link))
    );

    return {
      attachmentFiles: attachmentFiles.map((file) => ({
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
      })),
      dealVersionId: submission.dealVersionId,
      dealVersionMilestoneId: submission.dealVersionMilestoneId,
      draftDealId: submission.draftDealId,
      id: submission.id,
      organizationId: submission.organizationId,
      review: review
        ? this.toReviewSummary(
            review,
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

  private toReviewSummary(
    review: DealMilestoneReviewRecord,
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
        ? this.toSettlementRequestSummary(settlementRequest)
        : null,
      statementMarkdown: review.statementMarkdown
    };
  }

  private toSettlementRequestSummary(
    settlementRequest: DealMilestoneSettlementRequestRecord
  ): DealMilestoneSettlementRequestSummary {
    return {
      dealMilestoneReviewId: settlementRequest.dealMilestoneReviewId,
      dealMilestoneSubmissionId: settlementRequest.dealMilestoneSubmissionId,
      dealVersionId: settlementRequest.dealVersionId,
      dealVersionMilestoneId: settlementRequest.dealVersionMilestoneId,
      draftDealId: settlementRequest.draftDealId,
      id: settlementRequest.id,
      kind: settlementRequest.kind,
      organizationId: settlementRequest.organizationId,
      requestedAt: settlementRequest.requestedAt,
      requestedByUserId: settlementRequest.requestedByUserId,
      statementMarkdown: settlementRequest.statementMarkdown
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

  private async requireLinkedFile(
    link: DealMilestoneSubmissionFileRecord
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

    if (access.review && access.review.id !== dealMilestoneReviewId) {
      throw new NotFoundException("deal milestone review not found");
    }

    return {
      ...access,
      settlementRequest
    };
  }

  private assertEscrowIsActive(
    draft: DraftDealRecord,
    linkedAgreement: EscrowAgreementRecord | null
  ): void {
    if (draft.state === "ACTIVE") {
      return;
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
