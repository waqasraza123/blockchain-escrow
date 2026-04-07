import {
  Prisma,
  PrismaClient,
  DealPartyRole as PrismaDealPartyRole,
  DealPartySubjectType as PrismaDealPartySubjectType,
  DealState as PrismaDealState,
  TypedSignatureScheme as PrismaTypedSignatureScheme,
  FileCategory as PrismaFileCategory,
  SettlementCurrency as PrismaSettlementCurrency,
  SessionStatus as PrismaSessionStatus,
  OrganizationInviteStatus as PrismaOrganizationInviteStatus,
  OrganizationRole as PrismaOrganizationRole,
  AuditAction as PrismaAuditAction,
  AuditEntityType as PrismaAuditEntityType,
  FundingTransactionReconciledStatus as PrismaFundingTransactionReconciledStatus,
  MilestoneReviewDecision as PrismaMilestoneReviewDecision,
  MilestoneSettlementRequestKind as PrismaMilestoneSettlementRequestKind
} from "@prisma/client";

import type {
  AuditLogRecord,
  CounterpartyRecord,
  CounterpartyDealVersionAcceptanceRecord,
  DealMilestoneReviewDeadlineExpiryRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionAcceptanceRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  FileRecord,
  FundingTransactionRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  SessionRecord,
  TemplateRecord,
  UserRecord,
  WalletNonceRecord,
  WalletRecord
} from "./records";
import type {
  AuditLogRepository,
  CounterpartyRepository,
  CounterpartyDealVersionAcceptanceRepository,
  DealMilestoneReviewDeadlineExpiryRepository,
  DealMilestoneReviewRepository,
  DealMilestoneSettlementRequestRepository,
  DealMilestoneSubmissionFileRepository,
  DealMilestoneSubmissionRepository,
  DealVersionAcceptanceRepository,
  DealVersionFileRepository,
  DealVersionMilestoneRepository,
  DealVersionPartyRepository,
  DealVersionRepository,
  DraftDealPartyRepository,
  DraftDealRepository,
  FileRepository,
  FundingTransactionRepository,
  OrganizationInviteRepository,
  OrganizationMemberRepository,
  OrganizationRepository,
  Release1Repositories,
  SessionRepository,
  TemplateRepository,
  UserRepository,
  WalletNonceRepository,
  WalletRepository
} from "./repositories";

function toIsoTimestamp(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function toDate(value: string): Date {
  return new Date(value);
}

function toPrismaJsonInput(
  value: AuditLogRecord["metadata"]
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function toPrismaJsonObject(
  value: DealVersionAcceptanceRecord["typedData"]
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapUserRecord(record: {
  createdAt: Date;
  id: string;
  updatedAt: Date;
}): UserRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapWalletRecord(record: {
  address: string;
  chainId: number | null;
  createdAt: Date;
  id: string;
  isPrimary: boolean;
  updatedAt: Date;
  userId: string;
}): WalletRecord {
  return {
    address: record.address as WalletRecord["address"],
    chainId: record.chainId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    isPrimary: record.isPrimary,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    userId: record.userId
  };
}

function mapWalletNonceRecord(record: {
  chainId: number;
  consumedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  nonce: string;
  walletAddress: string;
}): WalletNonceRecord {
  return {
    chainId: record.chainId,
    consumedAt: toIsoTimestamp(record.consumedAt),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    nonce: record.nonce,
    walletAddress: record.walletAddress as WalletNonceRecord["walletAddress"]
  };
}

function mapSessionRecord(record: {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  status: PrismaSessionStatus;
  tokenHash: string;
  userId: string;
  walletId: string;
}): SessionRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    lastSeenAt: toIsoTimestamp(record.lastSeenAt),
    revokedAt: toIsoTimestamp(record.revokedAt),
    status: record.status,
    tokenHash: record.tokenHash,
    userId: record.userId,
    walletId: record.walletId
  };
}

function mapOrganizationRecord(record: {
  createdAt: Date;
  createdByUserId: string;
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
}): OrganizationRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    id: record.id,
    name: record.name,
    slug: record.slug,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapCounterpartyRecord(record: {
  contactEmail: string | null;
  createdAt: Date;
  createdByUserId: string;
  id: string;
  legalName: string | null;
  name: string;
  normalizedName: string;
  organizationId: string;
  updatedAt: Date;
}): CounterpartyRecord {
  return {
    contactEmail: record.contactEmail,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    id: record.id,
    legalName: record.legalName,
    name: record.name,
    normalizedName: record.normalizedName,
    organizationId: record.organizationId,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapFileRecord(record: {
  byteSize: bigint;
  category: PrismaFileCategory;
  createdAt: Date;
  createdByUserId: string;
  id: string;
  mediaType: string;
  organizationId: string;
  originalFilename: string;
  sha256Hex: string;
  storageKey: string;
  updatedAt: Date;
}): FileRecord {
  return {
    byteSize: Number(record.byteSize),
    category: record.category,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    id: record.id,
    mediaType: record.mediaType,
    organizationId: record.organizationId,
    originalFilename: record.originalFilename,
    sha256Hex: record.sha256Hex,
    storageKey: record.storageKey,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapTemplateRecord(record: {
  bodyMarkdown: string;
  createdAt: Date;
  createdByUserId: string;
  defaultCounterpartyId: string | null;
  description: string | null;
  id: string;
  name: string;
  normalizedName: string;
  organizationId: string;
  updatedAt: Date;
}): TemplateRecord {
  return {
    bodyMarkdown: record.bodyMarkdown,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    defaultCounterpartyId: record.defaultCounterpartyId,
    description: record.description,
    id: record.id,
    name: record.name,
    normalizedName: record.normalizedName,
    organizationId: record.organizationId,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapDraftDealRecord(record: {
  createdAt: Date;
  createdByUserId: string;
  id: string;
  organizationId: string;
  settlementCurrency: PrismaSettlementCurrency;
  state: PrismaDealState;
  summary: string | null;
  templateId: string | null;
  title: string;
  updatedAt: Date;
}): DraftDealRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    id: record.id,
    organizationId: record.organizationId,
    settlementCurrency: record.settlementCurrency,
    state: record.state,
    summary: record.summary,
    templateId: record.templateId,
    title: record.title,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapDraftDealPartyRecord(record: {
  counterpartyId: string | null;
  createdAt: Date;
  draftDealId: string;
  id: string;
  organizationId: string | null;
  role: PrismaDealPartyRole;
  subjectType: PrismaDealPartySubjectType;
  updatedAt: Date;
  walletAddress: string | null;
}): DraftDealPartyRecord {
  return {
    counterpartyId: record.counterpartyId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    draftDealId: record.draftDealId,
    id: record.id,
    organizationId: record.organizationId,
    role: record.role,
    subjectType: record.subjectType,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    walletAddress: record.walletAddress as DraftDealPartyRecord["walletAddress"]
  };
}

function mapDealVersionRecord(record: {
  bodyMarkdown: string;
  createdAt: Date;
  createdByUserId: string;
  draftDealId: string;
  id: string;
  organizationId: string;
  settlementCurrency: PrismaSettlementCurrency;
  summary: string | null;
  templateId: string | null;
  title: string;
  versionNumber: number;
}): DealVersionRecord {
  return {
    bodyMarkdown: record.bodyMarkdown,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    draftDealId: record.draftDealId,
    id: record.id,
    organizationId: record.organizationId,
    settlementCurrency: record.settlementCurrency,
    summary: record.summary,
    templateId: record.templateId,
    title: record.title,
    versionNumber: record.versionNumber
  };
}

function mapDealVersionPartyRecord(record: {
  counterpartyId: string | null;
  createdAt: Date;
  dealVersionId: string;
  displayName: string;
  id: string;
  organizationId: string | null;
  role: PrismaDealPartyRole;
  subjectType: PrismaDealPartySubjectType;
}): DealVersionPartyRecord {
  return {
    counterpartyId: record.counterpartyId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    dealVersionId: record.dealVersionId,
    displayName: record.displayName,
    id: record.id,
    organizationId: record.organizationId,
    role: record.role,
    subjectType: record.subjectType
  };
}

function mapDealVersionMilestoneRecord(record: {
  amountMinor: string;
  createdAt: Date;
  dealVersionId: string;
  description: string | null;
  dueAt: Date | null;
  id: string;
  position: number;
  title: string;
}): DealVersionMilestoneRecord {
  return {
    amountMinor: record.amountMinor,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    dealVersionId: record.dealVersionId,
    description: record.description,
    dueAt: toIsoTimestamp(record.dueAt),
    id: record.id,
    position: record.position,
    title: record.title
  };
}

function mapDealMilestoneSubmissionRecord(record: {
  dealVersionId: string;
  dealVersionMilestoneId: string;
  draftDealId: string;
  id: string;
  organizationId: string;
  reviewDeadlineAt: Date;
  scheme: PrismaTypedSignatureScheme | null;
  signature: string | null;
  statementMarkdown: string;
  submissionNumber: number;
  submittedAt: Date;
  submittedByCounterpartyId: string | null;
  submittedByPartyRole: PrismaDealPartyRole;
  submittedByPartySubjectType: PrismaDealPartySubjectType;
  submittedByUserId: string | null;
  typedData: Prisma.JsonValue | null;
}): DealMilestoneSubmissionRecord {
  return {
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    id: record.id,
    organizationId: record.organizationId,
    reviewDeadlineAt: toRequiredIsoTimestamp(record.reviewDeadlineAt),
    scheme: record.scheme,
    signature: record.signature,
    statementMarkdown: record.statementMarkdown,
    submissionNumber: record.submissionNumber,
    submittedAt: toRequiredIsoTimestamp(record.submittedAt),
    submittedByCounterpartyId: record.submittedByCounterpartyId,
    submittedByPartyRole: record.submittedByPartyRole,
    submittedByPartySubjectType: record.submittedByPartySubjectType,
    submittedByUserId: record.submittedByUserId,
    typedData: record.typedData as DealMilestoneSubmissionRecord["typedData"]
  };
}

function mapDealMilestoneReviewDeadlineExpiryRecord(record: {
  dealMilestoneSubmissionId: string;
  dealVersionId: string;
  dealVersionMilestoneId: string;
  deadlineAt: Date;
  draftDealId: string;
  expiredAt: Date;
  id: string;
  organizationId: string;
}): DealMilestoneReviewDeadlineExpiryRecord {
  return {
    dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    deadlineAt: toRequiredIsoTimestamp(record.deadlineAt),
    draftDealId: record.draftDealId,
    expiredAt: toRequiredIsoTimestamp(record.expiredAt),
    id: record.id,
    organizationId: record.organizationId
  };
}

function mapDealMilestoneSubmissionFileRecord(record: {
  createdAt: Date;
  dealMilestoneSubmissionId: string;
  fileId: string;
  id: string;
}): DealMilestoneSubmissionFileRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
    fileId: record.fileId,
    id: record.id
  };
}

function mapDealMilestoneReviewRecord(record: {
  decision: PrismaMilestoneReviewDecision;
  dealMilestoneSubmissionId: string;
  dealVersionId: string;
  dealVersionMilestoneId: string;
  draftDealId: string;
  id: string;
  organizationId: string;
  reviewedAt: Date;
  reviewedByUserId: string;
  statementMarkdown: string | null;
}): DealMilestoneReviewRecord {
  return {
    decision: record.decision,
    dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    id: record.id,
    organizationId: record.organizationId,
    reviewedAt: toRequiredIsoTimestamp(record.reviewedAt),
    reviewedByUserId: record.reviewedByUserId,
    statementMarkdown: record.statementMarkdown
  };
}

function mapDealMilestoneSettlementRequestRecord(record: {
  dealMilestoneReviewId: string;
  dealMilestoneSubmissionId: string;
  dealVersionId: string;
  dealVersionMilestoneId: string;
  draftDealId: string;
  id: string;
  kind: PrismaMilestoneSettlementRequestKind;
  organizationId: string;
  requestedAt: Date;
  requestedByUserId: string;
  statementMarkdown: string | null;
}): DealMilestoneSettlementRequestRecord {
  return {
    dealMilestoneReviewId: record.dealMilestoneReviewId,
    dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    organizationId: record.organizationId,
    requestedAt: toRequiredIsoTimestamp(record.requestedAt),
    requestedByUserId: record.requestedByUserId,
    statementMarkdown: record.statementMarkdown
  };
}

function mapDealVersionFileRecord(record: {
  createdAt: Date;
  dealVersionId: string;
  fileId: string;
  id: string;
}): DealVersionFileRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    dealVersionId: record.dealVersionId,
    fileId: record.fileId,
    id: record.id
  };
}

function mapDealVersionAcceptanceRecord(record: {
  acceptedAt: Date;
  acceptedByUserId: string;
  dealVersionId: string;
  dealVersionPartyId: string;
  id: string;
  organizationId: string;
  scheme: PrismaTypedSignatureScheme;
  signature: string;
  signerWalletAddress: string;
  signerWalletId: string;
  typedData: unknown;
}): DealVersionAcceptanceRecord {
  return {
    acceptedAt: toRequiredIsoTimestamp(record.acceptedAt),
    acceptedByUserId: record.acceptedByUserId,
    dealVersionId: record.dealVersionId,
    dealVersionPartyId: record.dealVersionPartyId,
    id: record.id,
    organizationId: record.organizationId,
    scheme: record.scheme,
    signature: record.signature,
    signerWalletAddress: record.signerWalletAddress as DealVersionAcceptanceRecord["signerWalletAddress"],
    signerWalletId: record.signerWalletId,
    typedData: record.typedData as DealVersionAcceptanceRecord["typedData"]
  };
}

function mapCounterpartyDealVersionAcceptanceRecord(record: {
  acceptedAt: Date;
  dealVersionId: string;
  dealVersionPartyId: string;
  id: string;
  scheme: PrismaTypedSignatureScheme;
  signature: string;
  signerWalletAddress: string;
  typedData: unknown;
}): CounterpartyDealVersionAcceptanceRecord {
  return {
    acceptedAt: toRequiredIsoTimestamp(record.acceptedAt),
    dealVersionId: record.dealVersionId,
    dealVersionPartyId: record.dealVersionPartyId,
    id: record.id,
    scheme: record.scheme,
    signature: record.signature,
    signerWalletAddress:
      record.signerWalletAddress as CounterpartyDealVersionAcceptanceRecord["signerWalletAddress"],
    typedData:
      record.typedData as CounterpartyDealVersionAcceptanceRecord["typedData"]
  };
}

function mapFundingTransactionRecord(record: {
  chainId: number;
  dealVersionId: string;
  draftDealId: string;
  id: string;
  organizationId: string;
  reconciledAgreementAddress: string | null;
  reconciledAt: Date | null;
  reconciledConfirmedAt: Date | null;
  reconciledMatchesTrackedVersion: boolean | null;
  reconciledStatus: PrismaFundingTransactionReconciledStatus | null;
  stalePendingEscalatedAt: Date | null;
  submittedAt: Date;
  submittedByUserId: string;
  submittedWalletAddress: string;
  submittedWalletId: string;
  supersededAt: Date | null;
  supersededByFundingTransactionId: string | null;
  transactionHash: string;
}): FundingTransactionRecord {
  return {
    chainId: record.chainId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    id: record.id,
    organizationId: record.organizationId,
    reconciledAgreementAddress:
      record.reconciledAgreementAddress as FundingTransactionRecord["reconciledAgreementAddress"],
    reconciledAt: toIsoTimestamp(record.reconciledAt),
    reconciledConfirmedAt: toIsoTimestamp(record.reconciledConfirmedAt),
    reconciledMatchesTrackedVersion: record.reconciledMatchesTrackedVersion,
    reconciledStatus:
      record.reconciledStatus as FundingTransactionRecord["reconciledStatus"],
    stalePendingEscalatedAt: toIsoTimestamp(record.stalePendingEscalatedAt),
    submittedAt: toRequiredIsoTimestamp(record.submittedAt),
    submittedByUserId: record.submittedByUserId,
    submittedWalletAddress:
      record.submittedWalletAddress as FundingTransactionRecord["submittedWalletAddress"],
    submittedWalletId: record.submittedWalletId,
    supersededAt: toIsoTimestamp(record.supersededAt),
    supersededByFundingTransactionId: record.supersededByFundingTransactionId,
    transactionHash: record.transactionHash as FundingTransactionRecord["transactionHash"]
  };
}

function mapOrganizationMemberRecord(record: {
  createdAt: Date;
  id: string;
  organizationId: string;
  role: PrismaOrganizationRole;
  updatedAt: Date;
  userId: string;
}): OrganizationMemberRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    organizationId: record.organizationId,
    role: record.role,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    userId: record.userId
  };
}

function mapOrganizationInviteRecord(record: {
  acceptedAt: Date | null;
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  invitedByUserId: string;
  organizationId: string;
  role: PrismaOrganizationRole;
  status: PrismaOrganizationInviteStatus;
  tokenHash: string;
  updatedAt: Date;
}): OrganizationInviteRecord {
  return {
    acceptedAt: toIsoTimestamp(record.acceptedAt),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    email: record.email,
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    invitedByUserId: record.invitedByUserId,
    organizationId: record.organizationId,
    role: record.role,
    status: record.status,
    tokenHash: record.tokenHash,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapAuditLogRecord(record: {
  action: PrismaAuditAction;
  actorUserId: string | null;
  entityId: string;
  entityType: PrismaAuditEntityType;
  id: string;
  ipAddress: string | null;
  metadata: unknown;
  occurredAt: Date;
  organizationId: string | null;
  userAgent: string | null;
}): AuditLogRecord {
  return {
    action: record.action,
    actorUserId: record.actorUserId,
    entityId: record.entityId,
    entityType: record.entityType,
    id: record.id,
    ipAddress: record.ipAddress,
    metadata: (record.metadata ?? null) as AuditLogRecord["metadata"],
    occurredAt: toRequiredIsoTimestamp(record.occurredAt),
    organizationId: record.organizationId,
    userAgent: record.userAgent
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: UserRecord): Promise<UserRecord> {
    const created = await this.prisma.user.create({
      data: {
        createdAt: toDate(record.createdAt),
        id: record.id,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? mapUserRecord(record) : null;
  }
}

export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: WalletRecord): Promise<WalletRecord> {
    const created = await this.prisma.wallet.create({
      data: {
        address: record.address,
        chainId: record.chainId,
        createdAt: toDate(record.createdAt),
        id: record.id,
        isPrimary: record.isPrimary,
        updatedAt: toDate(record.updatedAt),
        userId: record.userId
      }
    });

    return mapWalletRecord(created);
  }

  async findById(id: string): Promise<WalletRecord | null> {
    const record = await this.prisma.wallet.findUnique({ where: { id } });
    return record ? mapWalletRecord(record) : null;
  }

  async findByAddress(address: string): Promise<WalletRecord | null> {
    const record = await this.prisma.wallet.findUnique({ where: { address } });
    return record ? mapWalletRecord(record) : null;
  }

  async listByUserId(userId: string): Promise<WalletRecord[]> {
    const records = await this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapWalletRecord);
  }
}

export class PrismaWalletNonceRepository implements WalletNonceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async consume(id: string): Promise<WalletNonceRecord | null> {
    const existing = await this.prisma.walletNonce.findUnique({ where: { id } });

    if (!existing || existing.consumedAt) {
      return existing ? mapWalletNonceRecord(existing) : null;
    }

    const updated = await this.prisma.walletNonce.update({
      where: { id },
      data: { consumedAt: new Date() }
    });

    return mapWalletNonceRecord(updated);
  }

  async create(record: WalletNonceRecord): Promise<WalletNonceRecord> {
    const created = await this.prisma.walletNonce.create({
      data: {
        chainId: record.chainId,
        consumedAt: record.consumedAt ? toDate(record.consumedAt) : null,
        createdAt: toDate(record.createdAt),
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        nonce: record.nonce,
        walletAddress: record.walletAddress
      }
    });

    return mapWalletNonceRecord(created);
  }

  async findActiveByWalletAddress(
    walletAddress: string
  ): Promise<WalletNonceRecord | null> {
    const record = await this.prisma.walletNonce.findFirst({
      where: {
        consumedAt: null,
        expiresAt: { gt: new Date() },
        walletAddress
      },
      orderBy: { createdAt: "desc" }
    });

    return record ? mapWalletNonceRecord(record) : null;
  }

  async findActiveByWalletAddressAndChainId(
    walletAddress: string,
    chainId: number
  ): Promise<WalletNonceRecord | null> {
    const record = await this.prisma.walletNonce.findFirst({
      where: {
        chainId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        walletAddress
      },
      orderBy: { createdAt: "desc" }
    });

    return record ? mapWalletNonceRecord(record) : null;
  }
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: SessionRecord): Promise<SessionRecord> {
    const created = await this.prisma.session.create({
      data: {
        createdAt: toDate(record.createdAt),
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        lastSeenAt: record.lastSeenAt ? toDate(record.lastSeenAt) : null,
        revokedAt: record.revokedAt ? toDate(record.revokedAt) : null,
        status: record.status,
        tokenHash: record.tokenHash,
        userId: record.userId,
        walletId: record.walletId
      }
    });

    return mapSessionRecord(created);
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? mapSessionRecord(record) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const record = await this.prisma.session.findUnique({
      where: { tokenHash }
    });

    return record ? mapSessionRecord(record) : null;
  }

  async revoke(id: string): Promise<SessionRecord | null> {
    const existing = await this.prisma.session.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        status: PrismaSessionStatus.REVOKED
      }
    });

    return mapSessionRecord(updated);
  }

  async touch(id: string): Promise<SessionRecord | null> {
    const existing = await this.prisma.session.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: { lastSeenAt: new Date() }
    });

    return mapSessionRecord(updated);
  }
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: OrganizationRecord): Promise<OrganizationRecord> {
    const created = await this.prisma.organization.create({
      data: {
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        id: record.id,
        name: record.name,
        slug: record.slug,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapOrganizationRecord(created);
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const record = await this.prisma.organization.findUnique({ where: { id } });
    return record ? mapOrganizationRecord(record) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationRecord | null> {
    const record = await this.prisma.organization.findUnique({ where: { slug } });
    return record ? mapOrganizationRecord(record) : null;
  }

  async listByUserId(userId: string): Promise<OrganizationRecord[]> {
    const records = await this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationRecord);
  }
}

export class PrismaCounterpartyRepository implements CounterpartyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: CounterpartyRecord): Promise<CounterpartyRecord> {
    const created = await this.prisma.counterparty.create({
      data: {
        contactEmail: record.contactEmail,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        id: record.id,
        legalName: record.legalName,
        name: record.name,
        normalizedName: record.normalizedName,
        organizationId: record.organizationId,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapCounterpartyRecord(created);
  }

  async findById(id: string): Promise<CounterpartyRecord | null> {
    const record = await this.prisma.counterparty.findUnique({ where: { id } });
    return record ? mapCounterpartyRecord(record) : null;
  }

  async findByOrganizationIdAndNormalizedName(
    organizationId: string,
    normalizedName: string
  ): Promise<CounterpartyRecord | null> {
    const record = await this.prisma.counterparty.findUnique({
      where: {
        organizationId_normalizedName: {
          normalizedName,
          organizationId
        }
      }
    });

    return record ? mapCounterpartyRecord(record) : null;
  }

  async listByOrganizationId(organizationId: string): Promise<CounterpartyRecord[]> {
    const records = await this.prisma.counterparty.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapCounterpartyRecord);
  }
}

export class PrismaFileRepository implements FileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: FileRecord): Promise<FileRecord> {
    const created = await this.prisma.storedFile.create({
      data: {
        byteSize: BigInt(record.byteSize),
        category: record.category,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        id: record.id,
        mediaType: record.mediaType,
        organizationId: record.organizationId,
        originalFilename: record.originalFilename,
        sha256Hex: record.sha256Hex,
        storageKey: record.storageKey,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapFileRecord(created);
  }

  async findById(id: string): Promise<FileRecord | null> {
    const record = await this.prisma.storedFile.findUnique({ where: { id } });
    return record ? mapFileRecord(record) : null;
  }

  async findByOrganizationIdAndStorageKey(
    organizationId: string,
    storageKey: string
  ): Promise<FileRecord | null> {
    const record = await this.prisma.storedFile.findUnique({
      where: {
        organizationId_storageKey: {
          organizationId,
          storageKey
        }
      }
    });

    return record ? mapFileRecord(record) : null;
  }

  async listByOrganizationId(organizationId: string): Promise<FileRecord[]> {
    const records = await this.prisma.storedFile.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapFileRecord);
  }
}

export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: TemplateRecord): Promise<TemplateRecord> {
    const created = await this.prisma.template.create({
      data: {
        bodyMarkdown: record.bodyMarkdown,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        defaultCounterpartyId: record.defaultCounterpartyId,
        description: record.description,
        id: record.id,
        name: record.name,
        normalizedName: record.normalizedName,
        organizationId: record.organizationId,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapTemplateRecord(created);
  }

  async findById(id: string): Promise<TemplateRecord | null> {
    const record = await this.prisma.template.findUnique({ where: { id } });
    return record ? mapTemplateRecord(record) : null;
  }

  async findByOrganizationIdAndNormalizedName(
    organizationId: string,
    normalizedName: string
  ): Promise<TemplateRecord | null> {
    const record = await this.prisma.template.findUnique({
      where: {
        organizationId_normalizedName: {
          normalizedName,
          organizationId
        }
      }
    });

    return record ? mapTemplateRecord(record) : null;
  }

  async listByOrganizationId(organizationId: string): Promise<TemplateRecord[]> {
    const records = await this.prisma.template.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapTemplateRecord);
  }
}

export class PrismaDraftDealRepository implements DraftDealRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: DraftDealRecord): Promise<DraftDealRecord> {
    const created = await this.prisma.draftDeal.create({
      data: {
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        id: record.id,
        organizationId: record.organizationId,
        settlementCurrency: record.settlementCurrency,
        state: record.state,
        summary: record.summary,
        templateId: record.templateId,
        title: record.title,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapDraftDealRecord(created);
  }

  async findById(id: string): Promise<DraftDealRecord | null> {
    const record = await this.prisma.draftDeal.findUnique({ where: { id } });
    return record ? mapDraftDealRecord(record) : null;
  }

  async listByOrganizationId(organizationId: string): Promise<DraftDealRecord[]> {
    const records = await this.prisma.draftDeal.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapDraftDealRecord);
  }

  async listByStates(states: DraftDealRecord["state"][]): Promise<DraftDealRecord[]> {
    const records = await this.prisma.draftDeal.findMany({
      where: {
        state: {
          in: states
        }
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDraftDealRecord);
  }

  async updateState(
    id: string,
    state: DraftDealRecord["state"],
    updatedAt: string
  ): Promise<DraftDealRecord | null> {
    const existing = await this.prisma.draftDeal.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.draftDeal.update({
      where: { id },
      data: {
        state,
        updatedAt: toDate(updatedAt)
      }
    });

    return mapDraftDealRecord(updated);
  }
}

export class PrismaDraftDealPartyRepository implements DraftDealPartyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(record: DraftDealPartyRecord): Promise<DraftDealPartyRecord> {
    const created = await this.prisma.draftDealParty.create({
      data: {
        counterpartyId: record.counterpartyId,
        createdAt: toDate(record.createdAt),
        draftDealId: record.draftDealId,
        id: record.id,
        organizationId: record.organizationId,
        role: record.role,
        subjectType: record.subjectType,
        updatedAt: toDate(record.updatedAt),
        walletAddress: record.walletAddress
      }
    });

    return mapDraftDealPartyRecord(created);
  }

  async listByDraftDealId(draftDealId: string): Promise<DraftDealPartyRecord[]> {
    const records = await this.prisma.draftDealParty.findMany({
      where: { draftDealId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapDraftDealPartyRecord);
  }

  async updateWalletAddress(
    id: string,
    walletAddress: string | null,
    updatedAt: string
  ): Promise<DraftDealPartyRecord | null> {
    const existing = await this.prisma.draftDealParty.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.draftDealParty.update({
      where: { id },
      data: {
        updatedAt: toDate(updatedAt),
        walletAddress
      }
    });

    return mapDraftDealPartyRecord(updated);
  }
}

export class PrismaDealVersionRepository implements DealVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: DealVersionRecord): Promise<DealVersionRecord> {
    const created = await this.prisma.dealVersion.create({
      data: {
        bodyMarkdown: record.bodyMarkdown,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        draftDealId: record.draftDealId,
        id: record.id,
        organizationId: record.organizationId,
        settlementCurrency: record.settlementCurrency,
        summary: record.summary,
        templateId: record.templateId,
        title: record.title,
        versionNumber: record.versionNumber
      }
    });

    return mapDealVersionRecord(created);
  }

  async findById(id: string): Promise<DealVersionRecord | null> {
    const record = await this.prisma.dealVersion.findUnique({ where: { id } });
    return record ? mapDealVersionRecord(record) : null;
  }

  async findLatestByDraftDealId(
    draftDealId: string
  ): Promise<DealVersionRecord | null> {
    const record = await this.prisma.dealVersion.findFirst({
      where: { draftDealId },
      orderBy: { versionNumber: "desc" }
    });

    return record ? mapDealVersionRecord(record) : null;
  }

  async listByDraftDealId(draftDealId: string): Promise<DealVersionRecord[]> {
    const records = await this.prisma.dealVersion.findMany({
      where: { draftDealId },
      orderBy: { versionNumber: "asc" }
    });

    return records.map(mapDealVersionRecord);
  }
}

export class PrismaDealVersionPartyRepository
  implements DealVersionPartyRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async add(record: DealVersionPartyRecord): Promise<DealVersionPartyRecord> {
    const created = await this.prisma.dealVersionParty.create({
      data: {
        counterpartyId: record.counterpartyId,
        createdAt: toDate(record.createdAt),
        dealVersionId: record.dealVersionId,
        displayName: record.displayName,
        id: record.id,
        organizationId: record.organizationId,
        role: record.role,
        subjectType: record.subjectType
      }
    });

    return mapDealVersionPartyRecord(created);
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealVersionPartyRecord[]> {
    const records = await this.prisma.dealVersionParty.findMany({
      where: { dealVersionId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapDealVersionPartyRecord);
  }
}

export class PrismaDealVersionMilestoneRepository
  implements DealVersionMilestoneRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async add(
    record: DealVersionMilestoneRecord
  ): Promise<DealVersionMilestoneRecord> {
    const created = await this.prisma.dealVersionMilestone.create({
      data: {
        amountMinor: record.amountMinor,
        createdAt: toDate(record.createdAt),
        dealVersionId: record.dealVersionId,
        description: record.description,
        dueAt: record.dueAt ? toDate(record.dueAt) : null,
        id: record.id,
        position: record.position,
        title: record.title
      }
    });

    return mapDealVersionMilestoneRecord(created);
  }

  async findById(id: string): Promise<DealVersionMilestoneRecord | null> {
    const record = await this.prisma.dealVersionMilestone.findUnique({
      where: { id }
    });

    return record ? mapDealVersionMilestoneRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealVersionMilestoneRecord[]> {
    const records = await this.prisma.dealVersionMilestone.findMany({
      where: { dealVersionId },
      orderBy: { position: "asc" }
    });

    return records.map(mapDealVersionMilestoneRecord);
  }
}

export class PrismaDealMilestoneSubmissionRepository
  implements DealMilestoneSubmissionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    record: DealMilestoneSubmissionRecord
  ): Promise<DealMilestoneSubmissionRecord> {
    const created = await this.prisma.dealMilestoneSubmission.create({
      data: {
        dealVersionId: record.dealVersionId,
        dealVersionMilestoneId: record.dealVersionMilestoneId,
        draftDealId: record.draftDealId,
        id: record.id,
        organizationId: record.organizationId,
        reviewDeadlineAt: toDate(record.reviewDeadlineAt),
        scheme: record.scheme,
        signature: record.signature,
        statementMarkdown: record.statementMarkdown,
        submissionNumber: record.submissionNumber,
        submittedAt: toDate(record.submittedAt),
        submittedByCounterpartyId: record.submittedByCounterpartyId,
        submittedByPartyRole: record.submittedByPartyRole,
        submittedByPartySubjectType: record.submittedByPartySubjectType,
        submittedByUserId: record.submittedByUserId,
        typedData:
          record.typedData === null
            ? Prisma.JsonNull
            : (record.typedData as Prisma.InputJsonValue)
      }
    });

    return mapDealMilestoneSubmissionRecord(created);
  }

  async findById(id: string): Promise<DealMilestoneSubmissionRecord | null> {
    const record = await this.prisma.dealMilestoneSubmission.findUnique({
      where: { id }
    });

    return record ? mapDealMilestoneSubmissionRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealMilestoneSubmissionRecord[]> {
    const records = await this.prisma.dealMilestoneSubmission.findMany({
      where: { dealVersionId },
      orderBy: [{ submissionNumber: "asc" }, { submittedAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDealMilestoneSubmissionRecord);
  }

  async listByDealVersionMilestoneId(
    dealVersionMilestoneId: string
  ): Promise<DealMilestoneSubmissionRecord[]> {
    const records = await this.prisma.dealMilestoneSubmission.findMany({
      where: { dealVersionMilestoneId },
      orderBy: [{ submissionNumber: "asc" }, { submittedAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDealMilestoneSubmissionRecord);
  }
}

export class PrismaDealMilestoneReviewDeadlineExpiryRepository
  implements DealMilestoneReviewDeadlineExpiryRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    record: DealMilestoneReviewDeadlineExpiryRecord
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord> {
    const created = await this.prisma.dealMilestoneReviewDeadlineExpiry.create({
      data: {
        dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
        dealVersionId: record.dealVersionId,
        dealVersionMilestoneId: record.dealVersionMilestoneId,
        deadlineAt: toDate(record.deadlineAt),
        draftDealId: record.draftDealId,
        expiredAt: toDate(record.expiredAt),
        id: record.id,
        organizationId: record.organizationId
      }
    });

    return mapDealMilestoneReviewDeadlineExpiryRecord(created);
  }

  async findByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: string
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord | null> {
    const record = await this.prisma.dealMilestoneReviewDeadlineExpiry.findUnique({
      where: { dealMilestoneSubmissionId }
    });

    return record ? mapDealMilestoneReviewDeadlineExpiryRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord[]> {
    const records = await this.prisma.dealMilestoneReviewDeadlineExpiry.findMany({
      where: { dealVersionId },
      orderBy: [{ expiredAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDealMilestoneReviewDeadlineExpiryRecord);
  }
}

export class PrismaDealMilestoneReviewRepository
  implements DealMilestoneReviewRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: DealMilestoneReviewRecord): Promise<DealMilestoneReviewRecord> {
    const created = await this.prisma.dealMilestoneReview.create({
      data: {
        decision: record.decision,
        dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
        dealVersionId: record.dealVersionId,
        dealVersionMilestoneId: record.dealVersionMilestoneId,
        draftDealId: record.draftDealId,
        id: record.id,
        organizationId: record.organizationId,
        reviewedAt: toDate(record.reviewedAt),
        reviewedByUserId: record.reviewedByUserId,
        statementMarkdown: record.statementMarkdown
      }
    });

    return mapDealMilestoneReviewRecord(created);
  }

  async findByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: string
  ): Promise<DealMilestoneReviewRecord | null> {
    const record = await this.prisma.dealMilestoneReview.findUnique({
      where: { dealMilestoneSubmissionId }
    });

    return record ? mapDealMilestoneReviewRecord(record) : null;
  }

  async findById(id: string): Promise<DealMilestoneReviewRecord | null> {
    const record = await this.prisma.dealMilestoneReview.findUnique({
      where: { id }
    });

    return record ? mapDealMilestoneReviewRecord(record) : null;
  }

  async listByDealVersionId(dealVersionId: string): Promise<DealMilestoneReviewRecord[]> {
    const records = await this.prisma.dealMilestoneReview.findMany({
      where: { dealVersionId },
      orderBy: [{ reviewedAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDealMilestoneReviewRecord);
  }
}

export class PrismaDealMilestoneSubmissionFileRepository
  implements DealMilestoneSubmissionFileRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async add(
    record: DealMilestoneSubmissionFileRecord
  ): Promise<DealMilestoneSubmissionFileRecord> {
    const created = await this.prisma.dealMilestoneSubmissionFile.create({
      data: {
        createdAt: toDate(record.createdAt),
        dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
        fileId: record.fileId,
        id: record.id
      }
    });

    return mapDealMilestoneSubmissionFileRecord(created);
  }

  async listByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: string
  ): Promise<DealMilestoneSubmissionFileRecord[]> {
    const records = await this.prisma.dealMilestoneSubmissionFile.findMany({
      where: { dealMilestoneSubmissionId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapDealMilestoneSubmissionFileRecord);
  }
}

export class PrismaDealMilestoneSettlementRequestRepository
  implements DealMilestoneSettlementRequestRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    record: DealMilestoneSettlementRequestRecord
  ): Promise<DealMilestoneSettlementRequestRecord> {
    const created = await this.prisma.dealMilestoneSettlementRequest.create({
      data: {
        dealMilestoneReviewId: record.dealMilestoneReviewId,
        dealMilestoneSubmissionId: record.dealMilestoneSubmissionId,
        dealVersionId: record.dealVersionId,
        dealVersionMilestoneId: record.dealVersionMilestoneId,
        draftDealId: record.draftDealId,
        id: record.id,
        kind: record.kind,
        organizationId: record.organizationId,
        requestedAt: toDate(record.requestedAt),
        requestedByUserId: record.requestedByUserId,
        statementMarkdown: record.statementMarkdown
      }
    });

    return mapDealMilestoneSettlementRequestRecord(created);
  }

  async findByDealMilestoneReviewId(
    dealMilestoneReviewId: string
  ): Promise<DealMilestoneSettlementRequestRecord | null> {
    const record = await this.prisma.dealMilestoneSettlementRequest.findUnique({
      where: { dealMilestoneReviewId }
    });

    return record ? mapDealMilestoneSettlementRequestRecord(record) : null;
  }

  async findById(id: string): Promise<DealMilestoneSettlementRequestRecord | null> {
    const record = await this.prisma.dealMilestoneSettlementRequest.findUnique({
      where: { id }
    });

    return record ? mapDealMilestoneSettlementRequestRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealMilestoneSettlementRequestRecord[]> {
    const records = await this.prisma.dealMilestoneSettlementRequest.findMany({
      where: { dealVersionId },
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }]
    });

    return records.map(mapDealMilestoneSettlementRequestRecord);
  }
}

export class PrismaDealVersionFileRepository implements DealVersionFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(record: DealVersionFileRecord): Promise<DealVersionFileRecord> {
    const created = await this.prisma.dealVersionFile.create({
      data: {
        createdAt: toDate(record.createdAt),
        dealVersionId: record.dealVersionId,
        fileId: record.fileId,
        id: record.id
      }
    });

    return mapDealVersionFileRecord(created);
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealVersionFileRecord[]> {
    const records = await this.prisma.dealVersionFile.findMany({
      where: { dealVersionId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapDealVersionFileRecord);
  }
}

export class PrismaDealVersionAcceptanceRepository
  implements DealVersionAcceptanceRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    record: DealVersionAcceptanceRecord
  ): Promise<DealVersionAcceptanceRecord> {
    const created = await this.prisma.dealVersionAcceptance.create({
      data: {
        acceptedAt: toDate(record.acceptedAt),
        acceptedByUserId: record.acceptedByUserId,
        dealVersionId: record.dealVersionId,
        dealVersionPartyId: record.dealVersionPartyId,
        id: record.id,
        organizationId: record.organizationId,
        scheme: record.scheme,
        signature: record.signature,
        signerWalletAddress: record.signerWalletAddress,
        signerWalletId: record.signerWalletId,
        typedData: toPrismaJsonObject(record.typedData)
      }
    });

    return mapDealVersionAcceptanceRecord(created);
  }

  async findByDealVersionPartyId(
    dealVersionPartyId: string
  ): Promise<DealVersionAcceptanceRecord | null> {
    const record = await this.prisma.dealVersionAcceptance.findUnique({
      where: { dealVersionPartyId }
    });

    return record ? mapDealVersionAcceptanceRecord(record) : null;
  }

  async findById(id: string): Promise<DealVersionAcceptanceRecord | null> {
    const record = await this.prisma.dealVersionAcceptance.findUnique({
      where: { id }
    });

    return record ? mapDealVersionAcceptanceRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<DealVersionAcceptanceRecord[]> {
    const records = await this.prisma.dealVersionAcceptance.findMany({
      where: { dealVersionId },
      orderBy: { acceptedAt: "asc" }
    });

    return records.map(mapDealVersionAcceptanceRecord);
  }
}

export class PrismaCounterpartyDealVersionAcceptanceRepository
  implements CounterpartyDealVersionAcceptanceRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    record: CounterpartyDealVersionAcceptanceRecord
  ): Promise<CounterpartyDealVersionAcceptanceRecord> {
    const created = await this.prisma.counterpartyDealVersionAcceptance.create({
      data: {
        acceptedAt: toDate(record.acceptedAt),
        dealVersionId: record.dealVersionId,
        dealVersionPartyId: record.dealVersionPartyId,
        id: record.id,
        scheme: record.scheme,
        signature: record.signature,
        signerWalletAddress: record.signerWalletAddress,
        typedData: toPrismaJsonObject(record.typedData)
      }
    });

    return mapCounterpartyDealVersionAcceptanceRecord(created);
  }

  async findByDealVersionPartyId(
    dealVersionPartyId: string
  ): Promise<CounterpartyDealVersionAcceptanceRecord | null> {
    const record = await this.prisma.counterpartyDealVersionAcceptance.findUnique({
      where: { dealVersionPartyId }
    });

    return record ? mapCounterpartyDealVersionAcceptanceRecord(record) : null;
  }

  async findById(
    id: string
  ): Promise<CounterpartyDealVersionAcceptanceRecord | null> {
    const record = await this.prisma.counterpartyDealVersionAcceptance.findUnique({
      where: { id }
    });

    return record ? mapCounterpartyDealVersionAcceptanceRecord(record) : null;
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<CounterpartyDealVersionAcceptanceRecord[]> {
    const records = await this.prisma.counterpartyDealVersionAcceptance.findMany({
      where: { dealVersionId },
      orderBy: { acceptedAt: "asc" }
    });

    return records.map(mapCounterpartyDealVersionAcceptanceRecord);
  }
}

export class PrismaFundingTransactionRepository
  implements FundingTransactionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: FundingTransactionRecord): Promise<FundingTransactionRecord> {
    const created = await this.prisma.fundingTransaction.create({
      data: {
        chainId: record.chainId,
        dealVersionId: record.dealVersionId,
        draftDealId: record.draftDealId,
        id: record.id,
        organizationId: record.organizationId,
        reconciledAgreementAddress: record.reconciledAgreementAddress,
        reconciledAt: record.reconciledAt ? toDate(record.reconciledAt) : null,
        reconciledConfirmedAt: record.reconciledConfirmedAt
          ? toDate(record.reconciledConfirmedAt)
          : null,
        reconciledMatchesTrackedVersion: record.reconciledMatchesTrackedVersion,
        reconciledStatus: record.reconciledStatus
          ? (record.reconciledStatus as PrismaFundingTransactionReconciledStatus)
          : null,
        stalePendingEscalatedAt: record.stalePendingEscalatedAt
          ? toDate(record.stalePendingEscalatedAt)
          : null,
        submittedAt: toDate(record.submittedAt),
        submittedByUserId: record.submittedByUserId,
        submittedWalletAddress: record.submittedWalletAddress,
        submittedWalletId: record.submittedWalletId,
        supersededAt: record.supersededAt ? toDate(record.supersededAt) : null,
        supersededByFundingTransactionId: record.supersededByFundingTransactionId,
        transactionHash: record.transactionHash
      }
    });

    return mapFundingTransactionRecord(created);
  }

  async findByChainIdAndTransactionHash(
    chainId: number,
    transactionHash: `0x${string}`
  ): Promise<FundingTransactionRecord | null> {
    const record = await this.prisma.fundingTransaction.findUnique({
      where: {
        chainId_transactionHash: {
          chainId,
          transactionHash
        }
      }
    });

    return record ? mapFundingTransactionRecord(record) : null;
  }

  async findById(id: string): Promise<FundingTransactionRecord | null> {
    const record = await this.prisma.fundingTransaction.findUnique({
      where: { id }
    });

    return record ? mapFundingTransactionRecord(record) : null;
  }

  async listByChainId(chainId: number): Promise<FundingTransactionRecord[]> {
    const records = await this.prisma.fundingTransaction.findMany({
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      where: { chainId }
    });

    return records.map(mapFundingTransactionRecord);
  }

  async listByDealVersionId(dealVersionId: string): Promise<FundingTransactionRecord[]> {
    const records = await this.prisma.fundingTransaction.findMany({
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      where: { dealVersionId }
    });

    return records.map(mapFundingTransactionRecord);
  }

  async listByDraftDealId(draftDealId: string): Promise<FundingTransactionRecord[]> {
    const records = await this.prisma.fundingTransaction.findMany({
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      where: { draftDealId }
    });

    return records.map(mapFundingTransactionRecord);
  }

  async markStalePendingEscalated(
    id: string,
    stalePendingEscalatedAt: string
  ): Promise<FundingTransactionRecord> {
    const record = await this.prisma.fundingTransaction.update({
      data: {
        stalePendingEscalatedAt: toDate(stalePendingEscalatedAt)
      },
      where: { id }
    });

    return mapFundingTransactionRecord(record);
  }

  async updateReconciliation(
    id: string,
    reconciliation: Pick<
      FundingTransactionRecord,
      | "reconciledAgreementAddress"
      | "reconciledAt"
      | "reconciledConfirmedAt"
      | "reconciledMatchesTrackedVersion"
      | "reconciledStatus"
    >
  ): Promise<FundingTransactionRecord> {
    const record = await this.prisma.fundingTransaction.update({
      data: {
        reconciledAgreementAddress: reconciliation.reconciledAgreementAddress,
        reconciledAt: reconciliation.reconciledAt
          ? toDate(reconciliation.reconciledAt)
          : null,
        reconciledConfirmedAt: reconciliation.reconciledConfirmedAt
          ? toDate(reconciliation.reconciledConfirmedAt)
          : null,
        reconciledMatchesTrackedVersion: reconciliation.reconciledMatchesTrackedVersion,
        reconciledStatus: reconciliation.reconciledStatus
          ? (reconciliation.reconciledStatus as PrismaFundingTransactionReconciledStatus)
          : null
      },
      where: { id }
    });

    return mapFundingTransactionRecord(record);
  }

  async markSuperseded(
    id: string,
    supersededByFundingTransactionId: string,
    supersededAt: string
  ): Promise<FundingTransactionRecord> {
    const record = await this.prisma.fundingTransaction.update({
      data: {
        supersededAt: toDate(supersededAt),
        supersededByFundingTransactionId
      },
      where: { id }
    });

    return mapFundingTransactionRecord(record);
  }
}

export class PrismaOrganizationMemberRepository
  implements OrganizationMemberRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async add(record: OrganizationMemberRecord): Promise<OrganizationMemberRecord> {
    const created = await this.prisma.organizationMember.create({
      data: {
        createdAt: toDate(record.createdAt),
        id: record.id,
        organizationId: record.organizationId,
        role: record.role,
        updatedAt: toDate(record.updatedAt),
        userId: record.userId
      }
    });

    return mapOrganizationMemberRecord(created);
  }

  async findById(id: string): Promise<OrganizationMemberRecord | null> {
    const record = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    return record ? mapOrganizationMemberRecord(record) : null;
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMemberRecord | null> {
    const record = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    return record ? mapOrganizationMemberRecord(record) : null;
  }

  async listByOrganizationId(
    organizationId: string
  ): Promise<OrganizationMemberRecord[]> {
    const records = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationMemberRecord);
  }

  async listByUserId(userId: string): Promise<OrganizationMemberRecord[]> {
    const records = await this.prisma.organizationMember.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationMemberRecord);
  }

  async remove(id: string): Promise<OrganizationMemberRecord | null> {
    const existing = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const deleted = await this.prisma.organizationMember.delete({
      where: { id }
    });

    return mapOrganizationMemberRecord(deleted);
  }

  async updateRole(
    id: string,
    role: OrganizationMemberRecord["role"]
  ): Promise<OrganizationMemberRecord | null> {
    const existing = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id },
      data: {
        role,
        updatedAt: new Date()
      }
    });

    return mapOrganizationMemberRecord(updated);
  }
}

export class PrismaOrganizationInviteRepository
  implements OrganizationInviteRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async accept(id: string): Promise<OrganizationInviteRecord | null> {
    const existing = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationInvite.update({
      where: { id },
      data: {
        acceptedAt: new Date(),
        status: PrismaOrganizationInviteStatus.ACCEPTED,
        updatedAt: new Date()
      }
    });

    return mapOrganizationInviteRecord(updated);
  }

  async create(record: OrganizationInviteRecord): Promise<OrganizationInviteRecord> {
    const created = await this.prisma.organizationInvite.create({
      data: {
        acceptedAt: record.acceptedAt ? toDate(record.acceptedAt) : null,
        createdAt: toDate(record.createdAt),
        email: record.email,
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        invitedByUserId: record.invitedByUserId,
        organizationId: record.organizationId,
        role: record.role,
        status: record.status,
        tokenHash: record.tokenHash,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapOrganizationInviteRecord(created);
  }

  async findById(id: string): Promise<OrganizationInviteRecord | null> {
    const record = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    return record ? mapOrganizationInviteRecord(record) : null;
  }

  async findPendingByOrganizationIdAndEmail(
    organizationId: string,
    email: string
  ): Promise<OrganizationInviteRecord | null> {
    const record = await this.prisma.organizationInvite.findFirst({
      where: {
        email,
        organizationId,
        status: PrismaOrganizationInviteStatus.PENDING
      },
      orderBy: { createdAt: "desc" }
    });

    return record ? mapOrganizationInviteRecord(record) : null;
  }

  async findByTokenHash(
    tokenHash: string
  ): Promise<OrganizationInviteRecord | null> {
    const record = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash }
    });

    return record ? mapOrganizationInviteRecord(record) : null;
  }

  async listPendingByOrganizationId(
    organizationId: string
  ): Promise<OrganizationInviteRecord[]> {
    const records = await this.prisma.organizationInvite.findMany({
      where: {
        organizationId,
        status: PrismaOrganizationInviteStatus.PENDING
      },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationInviteRecord);
  }

  async revoke(id: string): Promise<OrganizationInviteRecord | null> {
    const existing = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationInvite.update({
      where: { id },
      data: {
        status: PrismaOrganizationInviteStatus.REVOKED,
        updatedAt: new Date()
      }
    });

    return mapOrganizationInviteRecord(updated);
  }
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(record: AuditLogRecord): Promise<AuditLogRecord> {
    const created = await this.prisma.auditLog.create({
      data: {
        action: record.action,
        actorUserId: record.actorUserId,
        entityId: record.entityId,
        entityType: record.entityType,
        id: record.id,
        ipAddress: record.ipAddress,
        metadata: toPrismaJsonInput(record.metadata),
        occurredAt: toDate(record.occurredAt),
        organizationId: record.organizationId,
        userAgent: record.userAgent
      }
    });

    return mapAuditLogRecord(created);
  }

  async listByEntity(
    entityType: AuditLogRecord["entityType"],
    entityId: string
  ): Promise<AuditLogRecord[]> {
    const records = await this.prisma.auditLog.findMany({
      where: {
        entityId,
        entityType
      },
      orderBy: { occurredAt: "asc" }
    });

    return records.map(mapAuditLogRecord);
  }
}

export class PrismaRelease1Repositories implements Release1Repositories {
  readonly auditLogs: AuditLogRepository;
  readonly counterparties: CounterpartyRepository;
  readonly counterpartyDealVersionAcceptances: CounterpartyDealVersionAcceptanceRepository;
  readonly dealMilestoneReviewDeadlineExpiries: DealMilestoneReviewDeadlineExpiryRepository;
  readonly dealMilestoneReviews: DealMilestoneReviewRepository;
  readonly dealMilestoneSettlementRequests: DealMilestoneSettlementRequestRepository;
  readonly dealMilestoneSubmissionFiles: DealMilestoneSubmissionFileRepository;
  readonly dealMilestoneSubmissions: DealMilestoneSubmissionRepository;
  readonly dealVersionAcceptances: DealVersionAcceptanceRepository;
  readonly dealVersionFiles: DealVersionFileRepository;
  readonly dealVersionMilestones: DealVersionMilestoneRepository;
  readonly dealVersionParties: DealVersionPartyRepository;
  readonly dealVersions: DealVersionRepository;
  readonly draftDealParties: DraftDealPartyRepository;
  readonly draftDeals: DraftDealRepository;
  readonly files: FileRepository;
  readonly fundingTransactions: FundingTransactionRepository;
  readonly organizationInvites: OrganizationInviteRepository;
  readonly organizationMembers: OrganizationMemberRepository;
  readonly organizations: OrganizationRepository;
  readonly sessions: SessionRepository;
  readonly templates: TemplateRepository;
  readonly users: UserRepository;
  readonly walletNonces: WalletNonceRepository;
  readonly wallets: WalletRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.auditLogs = new PrismaAuditLogRepository(prisma);
    this.counterparties = new PrismaCounterpartyRepository(prisma);
    this.counterpartyDealVersionAcceptances =
      new PrismaCounterpartyDealVersionAcceptanceRepository(prisma);
    this.dealMilestoneReviewDeadlineExpiries =
      new PrismaDealMilestoneReviewDeadlineExpiryRepository(prisma);
    this.dealMilestoneReviews = new PrismaDealMilestoneReviewRepository(prisma);
    this.dealMilestoneSettlementRequests =
      new PrismaDealMilestoneSettlementRequestRepository(prisma);
    this.dealMilestoneSubmissionFiles =
      new PrismaDealMilestoneSubmissionFileRepository(prisma);
    this.dealMilestoneSubmissions =
      new PrismaDealMilestoneSubmissionRepository(prisma);
    this.dealVersionAcceptances = new PrismaDealVersionAcceptanceRepository(prisma);
    this.dealVersionFiles = new PrismaDealVersionFileRepository(prisma);
    this.dealVersionMilestones = new PrismaDealVersionMilestoneRepository(prisma);
    this.dealVersionParties = new PrismaDealVersionPartyRepository(prisma);
    this.dealVersions = new PrismaDealVersionRepository(prisma);
    this.draftDealParties = new PrismaDraftDealPartyRepository(prisma);
    this.draftDeals = new PrismaDraftDealRepository(prisma);
    this.files = new PrismaFileRepository(prisma);
    this.fundingTransactions = new PrismaFundingTransactionRepository(prisma);
    this.organizationInvites = new PrismaOrganizationInviteRepository(prisma);
    this.organizationMembers = new PrismaOrganizationMemberRepository(prisma);
    this.organizations = new PrismaOrganizationRepository(prisma);
    this.sessions = new PrismaSessionRepository(prisma);
    this.templates = new PrismaTemplateRepository(prisma);
    this.users = new PrismaUserRepository(prisma);
    this.walletNonces = new PrismaWalletNonceRepository(prisma);
    this.wallets = new PrismaWalletRepository(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createRelease1Repositories(
  prismaClient?: PrismaClient
): PrismaRelease1Repositories {
  return new PrismaRelease1Repositories(prismaClient ?? new PrismaClient());
}
