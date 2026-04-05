import type {
  AuditLogRecord,
  CounterpartyRecord,
  DealVersionAcceptanceRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  FileRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  SessionRecord,
  TemplateRecord,
  UserRecord,
  WalletNonceRecord,
  WalletRecord
} from "@blockchain-escrow/db";

function compareIsoTimestamps(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export class InMemoryRelease1Repositories implements Release1Repositories {
  readonly auditLogRecords: AuditLogRecord[] = [];
  readonly counterpartyRecords: CounterpartyRecord[] = [];
  readonly dealVersionAcceptanceRecords: DealVersionAcceptanceRecord[] = [];
  readonly dealVersionFileRecords: DealVersionFileRecord[] = [];
  readonly dealVersionMilestoneRecords: DealVersionMilestoneRecord[] = [];
  readonly dealVersionPartyRecords: DealVersionPartyRecord[] = [];
  readonly dealVersionRecords: DealVersionRecord[] = [];
  readonly draftDealPartyRecords: DraftDealPartyRecord[] = [];
  readonly draftDealRecords: DraftDealRecord[] = [];
  readonly fileRecords: FileRecord[] = [];
  readonly organizationInviteRecords: OrganizationInviteRecord[] = [];
  readonly organizationMemberRecords: OrganizationMemberRecord[] = [];
  readonly organizationRecords: OrganizationRecord[] = [];
  readonly sessionRecords: SessionRecord[] = [];
  readonly templateRecords: TemplateRecord[] = [];
  readonly userRecords: UserRecord[] = [];
  readonly walletNonceRecords: WalletNonceRecord[] = [];
  readonly walletRecords: WalletRecord[] = [];

  readonly auditLogs = {
    append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
      this.auditLogRecords.push(record);
      return record;
    },
    listByEntity: async (
      entityType: AuditLogRecord["entityType"],
      entityId: string
    ): Promise<AuditLogRecord[]> =>
      this.auditLogRecords
        .filter(
          (record) =>
            record.entityType === entityType && record.entityId === entityId
        )
        .sort((left, right) =>
          compareIsoTimestamps(left.occurredAt, right.occurredAt)
        )
  };

  readonly counterparties = {
    create: async (record: CounterpartyRecord): Promise<CounterpartyRecord> => {
      this.counterpartyRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<CounterpartyRecord | null> =>
      this.counterpartyRecords.find((record) => record.id === id) ?? null,
    findByOrganizationIdAndNormalizedName: async (
      organizationId: string,
      normalizedName: string
    ): Promise<CounterpartyRecord | null> =>
      this.counterpartyRecords.find(
        (record) =>
          record.organizationId === organizationId &&
          record.normalizedName === normalizedName
      ) ?? null,
    listByOrganizationId: async (
      organizationId: string
    ): Promise<CounterpartyRecord[]> =>
      this.counterpartyRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly dealVersionAcceptances = {
    create: async (
      record: DealVersionAcceptanceRecord
    ): Promise<DealVersionAcceptanceRecord> => {
      this.dealVersionAcceptanceRecords.push(record);
      return record;
    },
    findByDealVersionPartyId: async (
      dealVersionPartyId: string
    ): Promise<DealVersionAcceptanceRecord | null> =>
      this.dealVersionAcceptanceRecords.find(
        (record) => record.dealVersionPartyId === dealVersionPartyId
      ) ?? null,
    findById: async (
      id: string
    ): Promise<DealVersionAcceptanceRecord | null> =>
      this.dealVersionAcceptanceRecords.find((record) => record.id === id) ?? null,
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<DealVersionAcceptanceRecord[]> =>
      this.dealVersionAcceptanceRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => compareIsoTimestamps(left.acceptedAt, right.acceptedAt))
  };

  readonly draftDeals = {
    create: async (record: DraftDealRecord): Promise<DraftDealRecord> => {
      this.draftDealRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<DraftDealRecord | null> =>
      this.draftDealRecords.find((record) => record.id === id) ?? null,
    listByOrganizationId: async (
      organizationId: string
    ): Promise<DraftDealRecord[]> =>
      this.draftDealRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly draftDealParties = {
    add: async (record: DraftDealPartyRecord): Promise<DraftDealPartyRecord> => {
      this.draftDealPartyRecords.push(record);
      return record;
    },
    listByDraftDealId: async (
      draftDealId: string
    ): Promise<DraftDealPartyRecord[]> =>
      this.draftDealPartyRecords
        .filter((record) => record.draftDealId === draftDealId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt)),
    updateWalletAddress: async (
      id: string,
      walletAddress: string | null,
      updatedAt: string
    ): Promise<DraftDealPartyRecord | null> => {
      const record = this.draftDealPartyRecords.find((entry) => entry.id === id);

      if (!record) {
        return null;
      }

      record.walletAddress = walletAddress as DraftDealPartyRecord["walletAddress"];
      record.updatedAt = updatedAt;

      return record;
    }
  };

  readonly dealVersions = {
    create: async (record: DealVersionRecord): Promise<DealVersionRecord> => {
      this.dealVersionRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<DealVersionRecord | null> =>
      this.dealVersionRecords.find((record) => record.id === id) ?? null,
    findLatestByDraftDealId: async (
      draftDealId: string
    ): Promise<DealVersionRecord | null> =>
      this.dealVersionRecords
        .filter((record) => record.draftDealId === draftDealId)
        .sort((left, right) => right.versionNumber - left.versionNumber)[0] ?? null,
    listByDraftDealId: async (
      draftDealId: string
    ): Promise<DealVersionRecord[]> =>
      this.dealVersionRecords
        .filter((record) => record.draftDealId === draftDealId)
        .sort((left, right) => left.versionNumber - right.versionNumber)
  };

  readonly dealVersionParties = {
    add: async (
      record: DealVersionPartyRecord
    ): Promise<DealVersionPartyRecord> => {
      this.dealVersionPartyRecords.push(record);
      return record;
    },
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<DealVersionPartyRecord[]> =>
      this.dealVersionPartyRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly dealVersionMilestones = {
    add: async (
      record: DealVersionMilestoneRecord
    ): Promise<DealVersionMilestoneRecord> => {
      this.dealVersionMilestoneRecords.push(record);
      return record;
    },
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<DealVersionMilestoneRecord[]> =>
      this.dealVersionMilestoneRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => left.position - right.position)
  };

  readonly dealVersionFiles = {
    add: async (record: DealVersionFileRecord): Promise<DealVersionFileRecord> => {
      this.dealVersionFileRecords.push(record);
      return record;
    },
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<DealVersionFileRecord[]> =>
      this.dealVersionFileRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly files = {
    create: async (record: FileRecord): Promise<FileRecord> => {
      this.fileRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<FileRecord | null> =>
      this.fileRecords.find((record) => record.id === id) ?? null,
    findByOrganizationIdAndStorageKey: async (
      organizationId: string,
      storageKey: string
    ): Promise<FileRecord | null> =>
      this.fileRecords.find(
        (record) =>
          record.organizationId === organizationId &&
          record.storageKey === storageKey
      ) ?? null,
    listByOrganizationId: async (organizationId: string): Promise<FileRecord[]> =>
      this.fileRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly templates = {
    create: async (record: TemplateRecord): Promise<TemplateRecord> => {
      this.templateRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<TemplateRecord | null> =>
      this.templateRecords.find((record) => record.id === id) ?? null,
    findByOrganizationIdAndNormalizedName: async (
      organizationId: string,
      normalizedName: string
    ): Promise<TemplateRecord | null> =>
      this.templateRecords.find(
        (record) =>
          record.organizationId === organizationId &&
          record.normalizedName === normalizedName
      ) ?? null,
    listByOrganizationId: async (
      organizationId: string
    ): Promise<TemplateRecord[]> =>
      this.templateRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly organizationInvites = {
    accept: async (id: string): Promise<OrganizationInviteRecord | null> => {
      const record = this.organizationInviteRecords.find((invite) => invite.id === id);

      if (!record) {
        return null;
      }

      record.acceptedAt = new Date().toISOString();
      record.status = "ACCEPTED";
      record.updatedAt = new Date().toISOString();
      return record;
    },
    create: async (
      record: OrganizationInviteRecord
    ): Promise<OrganizationInviteRecord> => {
      this.organizationInviteRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<OrganizationInviteRecord | null> =>
      this.organizationInviteRecords.find((record) => record.id === id) ?? null,
    findPendingByOrganizationIdAndEmail: async (
      organizationId: string,
      email: string
    ): Promise<OrganizationInviteRecord | null> =>
      this.organizationInviteRecords.find(
        (record) =>
          record.organizationId === organizationId &&
          record.email === email &&
          record.status === "PENDING"
      ) ?? null,
    findByTokenHash: async (
      tokenHash: string
    ): Promise<OrganizationInviteRecord | null> =>
      this.organizationInviteRecords.find((record) => record.tokenHash === tokenHash) ??
      null,
    listPendingByOrganizationId: async (
      organizationId: string
    ): Promise<OrganizationInviteRecord[]> =>
      this.organizationInviteRecords
        .filter(
          (record) =>
            record.organizationId === organizationId && record.status === "PENDING"
        )
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt)),
    revoke: async (id: string): Promise<OrganizationInviteRecord | null> => {
      const record = this.organizationInviteRecords.find((invite) => invite.id === id);

      if (!record) {
        return null;
      }

      record.status = "REVOKED";
      record.updatedAt = new Date().toISOString();
      return record;
    }
  };

  readonly organizationMembers = {
    add: async (
      record: OrganizationMemberRecord
    ): Promise<OrganizationMemberRecord> => {
      this.organizationMemberRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<OrganizationMemberRecord | null> =>
      this.organizationMemberRecords.find((record) => record.id === id) ?? null,
    findMembership: async (
      organizationId: string,
      userId: string
    ): Promise<OrganizationMemberRecord | null> =>
      this.organizationMemberRecords.find(
        (record) =>
          record.organizationId === organizationId && record.userId === userId
      ) ?? null,
    listByOrganizationId: async (
      organizationId: string
    ): Promise<OrganizationMemberRecord[]> =>
      this.organizationMemberRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt)),
    listByUserId: async (userId: string): Promise<OrganizationMemberRecord[]> =>
      this.organizationMemberRecords
        .filter((record) => record.userId === userId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt)),
    remove: async (id: string): Promise<OrganizationMemberRecord | null> => {
      const index = this.organizationMemberRecords.findIndex(
        (record) => record.id === id
      );

      if (index < 0) {
        return null;
      }

      const [removed] = this.organizationMemberRecords.splice(index, 1);
      return removed ?? null;
    },
    updateRole: async (
      id: string,
      role: OrganizationMemberRecord["role"]
    ): Promise<OrganizationMemberRecord | null> => {
      const record = this.organizationMemberRecords.find((member) => member.id === id);

      if (!record) {
        return null;
      }

      record.role = role;
      record.updatedAt = new Date().toISOString();
      return record;
    }
  };

  readonly organizations = {
    create: async (record: OrganizationRecord): Promise<OrganizationRecord> => {
      this.organizationRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<OrganizationRecord | null> =>
      this.organizationRecords.find((record) => record.id === id) ?? null,
    findBySlug: async (slug: string): Promise<OrganizationRecord | null> =>
      this.organizationRecords.find((record) => record.slug === slug) ?? null,
    listByUserId: async (userId: string): Promise<OrganizationRecord[]> => {
      const organizationIds = new Set(
        this.organizationMemberRecords
          .filter((record) => record.userId === userId)
          .map((record) => record.organizationId)
      );

      return this.organizationRecords
        .filter((record) => organizationIds.has(record.id))
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt));
    }
  };

  readonly sessions = {
    create: async (record: SessionRecord): Promise<SessionRecord> => {
      this.sessionRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<SessionRecord | null> =>
      this.sessionRecords.find((record) => record.id === id) ?? null,
    findByTokenHash: async (tokenHash: string): Promise<SessionRecord | null> =>
      this.sessionRecords.find((record) => record.tokenHash === tokenHash) ?? null,
    revoke: async (id: string): Promise<SessionRecord | null> => {
      const record = this.sessionRecords.find((session) => session.id === id);

      if (!record) {
        return null;
      }

      record.revokedAt = new Date().toISOString();
      record.status = "REVOKED";
      return record;
    },
    touch: async (id: string): Promise<SessionRecord | null> => {
      const record = this.sessionRecords.find((session) => session.id === id);

      if (!record) {
        return null;
      }

      record.lastSeenAt = new Date().toISOString();
      return record;
    }
  };

  readonly users = {
    create: async (record: UserRecord): Promise<UserRecord> => {
      this.userRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<UserRecord | null> =>
      this.userRecords.find((record) => record.id === id) ?? null
  };

  readonly walletNonces = {
    consume: async (id: string): Promise<WalletNonceRecord | null> => {
      const record = this.walletNonceRecords.find((nonce) => nonce.id === id);

      if (!record) {
        return null;
      }

      if (!record.consumedAt) {
        record.consumedAt = new Date().toISOString();
      }

      return record;
    },
    create: async (record: WalletNonceRecord): Promise<WalletNonceRecord> => {
      this.walletNonceRecords.push(record);
      return record;
    },
    findActiveByWalletAddress: async (
      walletAddress: string
    ): Promise<WalletNonceRecord | null> =>
      this.walletNonceRecords
        .filter(
          (record) =>
            record.walletAddress === walletAddress &&
            record.consumedAt === null &&
            new Date(record.expiresAt).getTime() > Date.now()
        )
        .sort((left, right) => compareIsoTimestamps(right.createdAt, left.createdAt))[0] ??
      null,
    findActiveByWalletAddressAndChainId: async (
      walletAddress: string,
      chainId: number
    ): Promise<WalletNonceRecord | null> =>
      this.walletNonceRecords
        .filter(
          (record) =>
            record.walletAddress === walletAddress &&
            record.chainId === chainId &&
            record.consumedAt === null &&
            new Date(record.expiresAt).getTime() > Date.now()
        )
        .sort((left, right) => compareIsoTimestamps(right.createdAt, left.createdAt))[0] ??
      null
  };

  readonly wallets = {
    create: async (record: WalletRecord): Promise<WalletRecord> => {
      this.walletRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<WalletRecord | null> =>
      this.walletRecords.find((record) => record.id === id) ?? null,
    findByAddress: async (address: string): Promise<WalletRecord | null> =>
      this.walletRecords.find((record) => record.address === address) ?? null,
    listByUserId: async (userId: string): Promise<WalletRecord[]> =>
      this.walletRecords
        .filter((record) => record.userId === userId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };
}
