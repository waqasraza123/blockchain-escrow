import type {
  AuditLogRecord,
  CounterpartyRecord,
  FileRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  SessionRecord,
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
      case "FILE": {
        const file = await this.requireFileAccess(actor, params.entityId);
        return this.repositories.auditLogs.listByEntity("FILE", file.id);
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
