import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
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
  createMilestoneSubmissionSchema,
  dealVersionMilestoneWorkflowParamsSchema,
  milestoneSubmissionParamsSchema,
  type CreateDealMilestoneSubmissionResponse,
  type DealMilestoneSubmissionSummary,
  type DealVersionMilestoneSnapshot,
  type DealVersionMilestoneWorkflow,
  type ListDealVersionMilestoneWorkflowsResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import {
  RELEASE1_REPOSITORIES,
  RELEASE4_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import { buildCanonicalDealId, normalizeApiChainId } from "../drafts/deal-identity";

interface MilestoneWorkflowAccessContext {
  actor: AuthenticatedSessionContext;
  draft: DraftDealRecord;
  membership: OrganizationMemberRecord;
  organization: OrganizationRecord;
  organizationParty: DealVersionPartyRecord;
  version: DealVersionRecord;
}

interface MilestoneSubmissionAccessContext extends MilestoneWorkflowAccessContext {
  linkedAgreement: EscrowAgreementRecord | null;
  milestone: DealVersionMilestoneRecord;
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

@Injectable()
export class MilestonesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
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

    const access = await this.requireSubmissionAccess(
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
      statementMarkdown: parsedBody.data.statementMarkdown,
      submissionNumber: existingSubmissions.length + 1,
      submittedAt: now,
      submittedByUserId: access.actor.user.id
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
        submissionNumber: submission.submissionNumber
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    const milestone = await this.buildMilestoneWorkflow(
      access.milestone,
      [...existingSubmissions, submission]
    );

    return {
      milestone,
      submission: milestone.submissions[milestone.submissions.length - 1]!
    };
  }

  private async buildMilestoneWorkflows(
    dealVersionId: string
  ): Promise<DealVersionMilestoneWorkflow[]> {
    const [milestones, submissions] = await Promise.all([
      this.repositories.dealVersionMilestones.listByDealVersionId(dealVersionId),
      this.repositories.dealMilestoneSubmissions.listByDealVersionId(dealVersionId)
    ]);
    const submissionsByMilestoneId = new Map<string, DealMilestoneSubmissionRecord[]>();

    for (const submission of submissions) {
      const records =
        submissionsByMilestoneId.get(submission.dealVersionMilestoneId) ?? [];
      records.push(submission);
      submissionsByMilestoneId.set(submission.dealVersionMilestoneId, records);
    }

    return Promise.all(
      milestones.map((milestone) =>
        this.buildMilestoneWorkflow(
          milestone,
          submissionsByMilestoneId.get(milestone.id) ?? []
        )
      )
    );
  }

  private async buildMilestoneWorkflow(
    milestone: DealVersionMilestoneRecord,
    submissions: DealMilestoneSubmissionRecord[]
  ): Promise<DealVersionMilestoneWorkflow> {
    const submissionSummaries = await Promise.all(
      submissions.map((submission) => this.toSubmissionSummary(submission))
    );
    const latestSubmission =
      submissionSummaries[submissionSummaries.length - 1] ?? null;

    return {
      latestSubmissionAt: latestSubmission?.submittedAt ?? null,
      milestone: toMilestoneSnapshot(milestone),
      state: submissionSummaries.length > 0 ? "SUBMITTED" : "PENDING",
      submissions: submissionSummaries
    };
  }

  private async toSubmissionSummary(
    submission: DealMilestoneSubmissionRecord
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
      statementMarkdown: submission.statementMarkdown,
      submissionNumber: submission.submissionNumber,
      submittedAt: submission.submittedAt,
      submittedByUserId: submission.submittedByUserId
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

    const organizationParty = await this.requireOrganizationVersionParty(
      version.id,
      organizationId
    );

    return {
      actor: authorized.actor,
      draft,
      membership: authorized.membership,
      organization: authorized.organization,
      organizationParty,
      version
    };
  }

  private async requireSubmissionAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    dealVersionMilestoneId: string,
    requestMetadata: RequestMetadata
  ): Promise<MilestoneSubmissionAccessContext> {
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

  private async requireOrganizationVersionParty(
    dealVersionId: string,
    organizationId: string
  ): Promise<DealVersionPartyRecord> {
    const parties = await this.repositories.dealVersionParties.listByDealVersionId(
      dealVersionId
    );
    const matchingParties = parties.filter(
      (party) =>
        party.subjectType === "ORGANIZATION" &&
        party.organizationId === organizationId
    );

    if (matchingParties.length !== 1) {
      throw new ConflictException(
        "deal version must have exactly one organization-side party"
      );
    }

    return matchingParties[0]!;
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
}
