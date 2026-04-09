import type {
  AuditLogRecord,
  CounterpartyRecord,
  CounterpartyDealVersionAcceptanceRecord,
  DealMilestoneDisputeAssignmentRecord,
  DealMilestoneDisputeDecisionRecord,
  DealMilestoneDisputeRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionRecord,
  DealVersionAcceptanceRecord,
  DealVersionRecord,
  DraftDealRecord,
  FileRecord,
  FundingTransactionRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  SessionRecord,
  TemplateRecord,
  WalletRecord
} from "@blockchain-escrow/db";
import {
  listAuditLogsParamsSchema,
  type AuditEntityType,
  type AuditLogEntry,
  type ListAuditLogsResponse,
  type WalletAddress
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";

const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/;

function normalizeWalletAddress(address: string): WalletAddress {
  return address.toLowerCase() as WalletAddress;
}

function toAuditLogEntry(record: AuditLogRecord): AuditLogEntry {
  return {
    action: record.action,
    actorUserId: record.actorUserId,
    entityId: record.entityId,
    entityType: record.entityType,
    id: record.id,
    ipAddress: record.ipAddress,
    metadata: record.metadata,
    occurredAt: record.occurredAt,
    organizationId: record.organizationId,
    userAgent: record.userAgent
  };
}

function compareAuditLogs(left: AuditLogRecord, right: AuditLogRecord): number {
  return new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listByEntity(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListAuditLogsResponse> {
    const parsed = listAuditLogsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const auditLogs = await this.listAuthorizedAuditLogs(actor, parsed.data);

    return {
      auditLogs: auditLogs.map(toAuditLogEntry)
    };
  }

  private async listAuthorizedAuditLogs(
    actor: AuthenticatedSessionContext,
    params: {
      entityId: string;
      entityType: AuditEntityType;
    }
  ): Promise<AuditLogRecord[]> {
    switch (params.entityType) {
      case "USER":
        this.requireUserAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("USER", params.entityId);
      case "WALLET": {
        const wallet = await this.requireWalletAccess(actor, params.entityId);
        return this.listWalletAuditLogs(wallet);
      }
      case "SESSION": {
        const session = await this.requireSessionAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("SESSION", session.id);
      }
      case "ORGANIZATION": {
        const organization = await this.requireOrganizationAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("ORGANIZATION", organization.id);
      }
      case "COUNTERPARTY": {
        const counterparty = await this.requireCounterpartyAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "COUNTERPARTY",
          counterparty.id
        );
      }
      case "DRAFT_DEAL": {
        const draftDeal = await this.requireDraftDealAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("DRAFT_DEAL", draftDeal.id);
      }
      case "DEAL_VERSION": {
        const dealVersion = await this.requireDealVersionAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_VERSION",
          dealVersion.id
        );
      }
      case "DEAL_MILESTONE_SUBMISSION": {
        const submission = await this.requireDealMilestoneSubmissionAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_SUBMISSION",
          submission.id
        );
      }
      case "DEAL_MILESTONE_REVIEW": {
        const review = await this.requireDealMilestoneReviewAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_REVIEW",
          review.id
        );
      }
      case "DEAL_MILESTONE_DISPUTE": {
        const dispute = await this.requireDealMilestoneDisputeAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_DISPUTE",
          dispute.id
        );
      }
      case "DEAL_MILESTONE_DISPUTE_ASSIGNMENT": {
        const assignment =
          await this.requireDealMilestoneDisputeAssignmentAccess(
            actor,
            params.entityId
          );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_DISPUTE_ASSIGNMENT",
          assignment.id
        );
      }
      case "DEAL_MILESTONE_DISPUTE_DECISION": {
        const decision = await this.requireDealMilestoneDisputeDecisionAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_DISPUTE_DECISION",
          decision.id
        );
      }
      case "DEAL_MILESTONE_SETTLEMENT_REQUEST": {
        const settlementRequest =
          await this.requireDealMilestoneSettlementRequestAccess(
            actor,
            params.entityId
          );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_SETTLEMENT_REQUEST",
          settlementRequest.id
        );
      }
      case "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION": {
        const executionTransaction =
          await this.requireDealMilestoneSettlementExecutionTransactionAccess(
            actor,
            params.entityId
          );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
          executionTransaction.id
        );
      }
      case "DEAL_VERSION_ACCEPTANCE": {
        const dealVersionAcceptance = await this.requireDealVersionAcceptanceAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_VERSION_ACCEPTANCE",
          dealVersionAcceptance.id
        );
      }
      case "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE": {
        const counterpartyAcceptance =
          await this.requireCounterpartyDealVersionAcceptanceAccess(
            actor,
            params.entityId
          );
        return this.repositories.auditLogs.listByEntity(
          "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE",
          counterpartyAcceptance.id
        );
      }
      case "FILE": {
        const file = await this.requireFileAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("FILE", file.id);
      }
      case "FUNDING_TRANSACTION": {
        const fundingTransaction = await this.requireFundingTransactionAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "FUNDING_TRANSACTION",
          fundingTransaction.id
        );
      }
      case "TEMPLATE": {
        const template = await this.requireTemplateAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("TEMPLATE", template.id);
      }
      case "ORGANIZATION_MEMBER": {
        const member = await this.requireOrganizationMemberAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "ORGANIZATION_MEMBER",
          member.id
        );
      }
      case "ORGANIZATION_INVITE": {
        const invite = await this.requireOrganizationInviteAccess(
          actor,
          params.entityId
        );
        return this.repositories.auditLogs.listByEntity(
          "ORGANIZATION_INVITE",
          invite.id
        );
      }
      case "OPERATOR_ALERT":
      case "APPROVAL_POLICY":
      case "APPROVAL_REQUEST":
      case "APPROVAL_REQUEST_STEP":
      case "COMPLIANCE_CHECKPOINT":
      case "COMPLIANCE_CASE":
      case "COMPLIANCE_CASE_NOTE":
      case "COST_CENTER":
      case "PROTOCOL_PROPOSAL_DRAFT":
      case "STATEMENT_SNAPSHOT":
        throw new ForbiddenException(
          "audit logs for operator-only entities are not available on this surface"
        );
      default:
        return this.assertNever(params.entityType);
    }
  }

  private requireUserAccess(
    actor: AuthenticatedSessionContext,
    userId: string
  ): void {
    if (actor.user.id !== userId) {
      throw new ForbiddenException("user audit access is required");
    }
  }

  private async requireWalletAccess(
    actor: AuthenticatedSessionContext,
    walletEntityId: string
  ): Promise<WalletRecord> {
    const wallet = walletAddressPattern.test(walletEntityId)
      ? await this.repositories.wallets.findByAddress(
          normalizeWalletAddress(walletEntityId)
        )
      : await this.repositories.wallets.findById(walletEntityId);

    if (!wallet) {
      throw new NotFoundException("wallet not found");
    }

    if (wallet.userId !== actor.user.id) {
      throw new ForbiddenException("wallet audit access is required");
    }

    return wallet;
  }

  private async listWalletAuditLogs(wallet: WalletRecord): Promise<AuditLogRecord[]> {
    const [addressLogs, idLogs] = await Promise.all([
      this.repositories.auditLogs.listByEntity("WALLET", wallet.address),
      this.repositories.auditLogs.listByEntity("WALLET", wallet.id)
    ]);
    const logsById = new Map<string, AuditLogRecord>();

    for (const record of [...addressLogs, ...idLogs]) {
      logsById.set(record.id, record);
    }

    return [...logsById.values()].sort(compareAuditLogs);
  }

  private async requireSessionAccess(
    actor: AuthenticatedSessionContext,
    sessionId: string
  ): Promise<SessionRecord> {
    const session = await this.repositories.sessions.findById(sessionId);

    if (!session) {
      throw new NotFoundException("session not found");
    }

    if (session.userId !== actor.user.id) {
      throw new ForbiddenException("session audit access is required");
    }

    return session;
  }

  private async requireOrganizationAccess(
    actor: AuthenticatedSessionContext,
    organizationId: string
  ): Promise<OrganizationRecord> {
    const [organization, membership] = await Promise.all([
      this.repositories.organizations.findById(organizationId),
      this.repositories.organizationMembers.findMembership(organizationId, actor.user.id)
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization audit access is required");
    }

    return organization;
  }

  private async requireOrganizationMemberAccess(
    actor: AuthenticatedSessionContext,
    memberId: string
  ): Promise<OrganizationMemberRecord> {
    const member = await this.repositories.organizationMembers.findById(memberId);

    if (!member) {
      throw new NotFoundException("organization member not found");
    }

    await this.requireOrganizationAccess(actor, member.organizationId);
    return member;
  }

  private async requireCounterpartyAccess(
    actor: AuthenticatedSessionContext,
    counterpartyId: string
  ): Promise<CounterpartyRecord> {
    const counterparty = await this.repositories.counterparties.findById(counterpartyId);

    if (!counterparty) {
      throw new NotFoundException("counterparty not found");
    }

    await this.requireOrganizationAccess(actor, counterparty.organizationId);
    return counterparty;
  }

  private async requireDraftDealAccess(
    actor: AuthenticatedSessionContext,
    draftDealId: string
  ): Promise<DraftDealRecord> {
    const draftDeal = await this.repositories.draftDeals.findById(draftDealId);

    if (!draftDeal) {
      throw new NotFoundException("draft deal not found");
    }

    await this.requireOrganizationAccess(actor, draftDeal.organizationId);
    return draftDeal;
  }

  private async requireDealVersionAccess(
    actor: AuthenticatedSessionContext,
    dealVersionId: string
  ): Promise<DealVersionRecord> {
    const dealVersion = await this.repositories.dealVersions.findById(dealVersionId);

    if (!dealVersion) {
      throw new NotFoundException("deal version not found");
    }

    await this.requireOrganizationAccess(actor, dealVersion.organizationId);
    return dealVersion;
  }

  private async requireDealVersionAcceptanceAccess(
    actor: AuthenticatedSessionContext,
    dealVersionAcceptanceId: string
  ): Promise<DealVersionAcceptanceRecord> {
    const dealVersionAcceptance =
      await this.repositories.dealVersionAcceptances.findById(
        dealVersionAcceptanceId
      );

    if (!dealVersionAcceptance) {
      throw new NotFoundException("deal version acceptance not found");
    }

    await this.requireOrganizationAccess(actor, dealVersionAcceptance.organizationId);
    return dealVersionAcceptance;
  }

  private async requireDealMilestoneSubmissionAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneSubmissionId: string
  ): Promise<DealMilestoneSubmissionRecord> {
    const submission = await this.repositories.dealMilestoneSubmissions.findById(
      dealMilestoneSubmissionId
    );

    if (!submission) {
      throw new NotFoundException("deal milestone submission not found");
    }

    await this.requireDraftDealAccess(actor, submission.draftDealId);
    return submission;
  }

  private async requireDealMilestoneReviewAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneReviewId: string
  ): Promise<DealMilestoneReviewRecord> {
    const review = await this.repositories.dealMilestoneReviews.findById(
      dealMilestoneReviewId
    );

    if (!review) {
      throw new NotFoundException("deal milestone review not found");
    }

    await this.requireDraftDealAccess(actor, review.draftDealId);
    return review;
  }

  private async requireDealMilestoneSettlementRequestAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneSettlementRequestId: string
  ): Promise<DealMilestoneSettlementRequestRecord> {
    const settlementRequest =
      await this.repositories.dealMilestoneSettlementRequests.findById(
        dealMilestoneSettlementRequestId
      );

    if (!settlementRequest) {
      throw new NotFoundException("deal milestone settlement request not found");
    }

    await this.requireDraftDealAccess(actor, settlementRequest.draftDealId);
    return settlementRequest;
  }

  private async requireDealMilestoneDisputeAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneDisputeId: string
  ): Promise<DealMilestoneDisputeRecord> {
    const dispute =
      await this.repositories.dealMilestoneDisputes.findById(dealMilestoneDisputeId);

    if (!dispute) {
      throw new NotFoundException("deal milestone dispute not found");
    }

    await this.requireDraftDealAccess(actor, dispute.draftDealId);
    return dispute;
  }

  private async requireDealMilestoneDisputeAssignmentAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneDisputeAssignmentId: string
  ): Promise<DealMilestoneDisputeAssignmentRecord> {
    const assignment =
      await this.repositories.dealMilestoneDisputeAssignments.findById(
        dealMilestoneDisputeAssignmentId
      );

    if (!assignment) {
      throw new NotFoundException("deal milestone dispute assignment not found");
    }

    const dispute = await this.requireDealMilestoneDisputeAccess(
      actor,
      assignment.dealMilestoneDisputeId
    );
    void dispute;

    return assignment;
  }

  private async requireDealMilestoneDisputeDecisionAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneDisputeDecisionId: string
  ): Promise<DealMilestoneDisputeDecisionRecord> {
    const decision =
      await this.repositories.dealMilestoneDisputeDecisions.findById(
        dealMilestoneDisputeDecisionId
      );

    if (!decision) {
      throw new NotFoundException("deal milestone dispute decision not found");
    }

    const dispute = await this.requireDealMilestoneDisputeAccess(
      actor,
      decision.dealMilestoneDisputeId
    );
    void dispute;

    return decision;
  }

  private async requireDealMilestoneSettlementExecutionTransactionAccess(
    actor: AuthenticatedSessionContext,
    dealMilestoneSettlementExecutionTransactionId: string
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord> {
    const executionTransaction =
      await this.repositories.dealMilestoneSettlementExecutionTransactions.findById(
        dealMilestoneSettlementExecutionTransactionId
      );

    if (!executionTransaction) {
      throw new NotFoundException(
        "deal milestone settlement execution transaction not found"
      );
    }

    await this.requireDraftDealAccess(actor, executionTransaction.draftDealId);
    return executionTransaction;
  }

  private async requireCounterpartyDealVersionAcceptanceAccess(
    actor: AuthenticatedSessionContext,
    counterpartyDealVersionAcceptanceId: string
  ): Promise<CounterpartyDealVersionAcceptanceRecord> {
    const counterpartyDealVersionAcceptance =
      await this.repositories.counterpartyDealVersionAcceptances.findById(
        counterpartyDealVersionAcceptanceId
      );

    if (!counterpartyDealVersionAcceptance) {
      throw new NotFoundException("counterparty deal version acceptance not found");
    }

    const dealVersion = await this.requireDealVersionAccess(
      actor,
      counterpartyDealVersionAcceptance.dealVersionId
    );
    await this.requireOrganizationAccess(actor, dealVersion.organizationId);

    return counterpartyDealVersionAcceptance;
  }

  private async requireFileAccess(
    actor: AuthenticatedSessionContext,
    fileId: string
  ): Promise<FileRecord> {
    const file = await this.repositories.files.findById(fileId);

    if (!file) {
      throw new NotFoundException("file not found");
    }

    await this.requireOrganizationAccess(actor, file.organizationId);
    return file;
  }

  private async requireFundingTransactionAccess(
    actor: AuthenticatedSessionContext,
    fundingTransactionId: string
  ): Promise<FundingTransactionRecord> {
    const fundingTransaction =
      await this.repositories.fundingTransactions.findById(fundingTransactionId);

    if (!fundingTransaction) {
      throw new NotFoundException("funding transaction not found");
    }

    await this.requireDraftDealAccess(actor, fundingTransaction.draftDealId);
    return fundingTransaction;
  }

  private async requireTemplateAccess(
    actor: AuthenticatedSessionContext,
    templateId: string
  ): Promise<TemplateRecord> {
    const template = await this.repositories.templates.findById(templateId);

    if (!template) {
      throw new NotFoundException("template not found");
    }

    await this.requireOrganizationAccess(actor, template.organizationId);
    return template;
  }

  private async requireOrganizationInviteAccess(
    actor: AuthenticatedSessionContext,
    inviteId: string
  ): Promise<OrganizationInviteRecord> {
    const invite = await this.repositories.organizationInvites.findById(inviteId);

    if (!invite) {
      throw new NotFoundException("organization invite not found");
    }

    await this.requireOrganizationAccess(actor, invite.organizationId);
    return invite;
  }

  private assertNever(entityType: never): never {
    throw new InternalAuditStateError(entityType);
  }
}

class InternalAuditStateError extends Error {
  constructor(entityType: never) {
    super(`unsupported audit entity type: ${String(entityType)}`);
  }
}
