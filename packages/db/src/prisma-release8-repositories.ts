import { Prisma, PrismaClient } from "@prisma/client";

import type {
  ComplianceCaseNoteRecord,
  ComplianceCaseRecord,
  ComplianceCheckpointRecord,
  OperatorAccountRecord,
  OperatorAlertRecord,
  ProtocolProposalDraftRecord
} from "./records";
import type {
  ComplianceCaseNoteRepository,
  ComplianceCaseRepository,
  ComplianceCheckpointRepository,
  OperatorAccountRepository,
  OperatorAlertRepository,
  ProtocolProposalDraftRepository,
  Release8Repositories
} from "./repositories";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

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
  value: Prisma.InputJsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

function mapOperatorAccountRecord(record: {
  active: boolean;
  createdAt: Date;
  id: string;
  role: OperatorAccountRecord["role"];
  updatedAt: Date;
  userId: string;
  walletId: string;
}): OperatorAccountRecord {
  return {
    active: record.active,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    role: record.role,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    userId: record.userId,
    walletId: record.walletId
  };
}

function mapOperatorAlertRecord(record: {
  acknowledgedAt: Date | null;
  acknowledgedByOperatorAccountId: string | null;
  agreementAddress: string | null;
  assignedOperatorAccountId: string | null;
  dealVersionId: string | null;
  description: string;
  draftDealId: string | null;
  fingerprint: string;
  firstDetectedAt: Date;
  id: string;
  kind: OperatorAlertRecord["kind"];
  lastDetectedAt: Date;
  linkedComplianceCaseId: string | null;
  metadata: Prisma.JsonValue;
  organizationId: string | null;
  resolvedAt: Date | null;
  resolvedByOperatorAccountId: string | null;
  severity: OperatorAlertRecord["severity"];
  status: OperatorAlertRecord["status"];
  subjectId: string;
  subjectLabel: string | null;
  subjectType: OperatorAlertRecord["subjectType"];
}): OperatorAlertRecord {
  return {
    acknowledgedAt: toIsoTimestamp(record.acknowledgedAt),
    acknowledgedByOperatorAccountId: record.acknowledgedByOperatorAccountId,
    agreementAddress: record.agreementAddress as OperatorAlertRecord["agreementAddress"],
    assignedOperatorAccountId: record.assignedOperatorAccountId,
    dealVersionId: record.dealVersionId,
    description: record.description,
    draftDealId: record.draftDealId,
    fingerprint: record.fingerprint,
    firstDetectedAt: toRequiredIsoTimestamp(record.firstDetectedAt),
    id: record.id,
    kind: record.kind,
    lastDetectedAt: toRequiredIsoTimestamp(record.lastDetectedAt),
    linkedComplianceCaseId: record.linkedComplianceCaseId,
    metadata: (record.metadata ?? null) as OperatorAlertRecord["metadata"],
    organizationId: record.organizationId,
    resolvedAt: toIsoTimestamp(record.resolvedAt),
    resolvedByOperatorAccountId: record.resolvedByOperatorAccountId,
    severity: record.severity,
    status: record.status,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    subjectType: record.subjectType
  };
}

function mapComplianceCheckpointRecord(record: {
  agreementAddress: string | null;
  createdAt: Date;
  createdByOperatorAccountId: string;
  dealVersionId: string | null;
  decidedAt: Date | null;
  decidedByOperatorAccountId: string | null;
  decisionNote: string | null;
  draftDealId: string | null;
  id: string;
  kind: ComplianceCheckpointRecord["kind"];
  linkedComplianceCaseId: string | null;
  note: string;
  organizationId: string | null;
  status: ComplianceCheckpointRecord["status"];
  subjectId: string;
  subjectLabel: string | null;
  subjectType: ComplianceCheckpointRecord["subjectType"];
}): ComplianceCheckpointRecord {
  return {
    agreementAddress:
      record.agreementAddress as ComplianceCheckpointRecord["agreementAddress"],
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    dealVersionId: record.dealVersionId,
    decidedAt: toIsoTimestamp(record.decidedAt),
    decidedByOperatorAccountId: record.decidedByOperatorAccountId,
    decisionNote: record.decisionNote,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    linkedComplianceCaseId: record.linkedComplianceCaseId,
    note: record.note,
    organizationId: record.organizationId,
    status: record.status,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    subjectType: record.subjectType
  };
}

function mapComplianceCaseRecord(record: {
  agreementAddress: string | null;
  assignedOperatorAccountId: string | null;
  createdAt: Date;
  createdByOperatorAccountId: string;
  dealVersionId: string | null;
  draftDealId: string | null;
  id: string;
  linkedAlertId: string | null;
  linkedCheckpointId: string | null;
  organizationId: string | null;
  resolvedAt: Date | null;
  severity: ComplianceCaseRecord["severity"];
  status: ComplianceCaseRecord["status"];
  subjectId: string;
  subjectLabel: string | null;
  subjectType: ComplianceCaseRecord["subjectType"];
  summary: string;
  title: string;
  updatedAt: Date;
}): ComplianceCaseRecord {
  return {
    agreementAddress: record.agreementAddress as ComplianceCaseRecord["agreementAddress"],
    assignedOperatorAccountId: record.assignedOperatorAccountId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    id: record.id,
    linkedAlertId: record.linkedAlertId,
    linkedCheckpointId: record.linkedCheckpointId,
    organizationId: record.organizationId,
    resolvedAt: toIsoTimestamp(record.resolvedAt),
    severity: record.severity,
    status: record.status,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    subjectType: record.subjectType,
    summary: record.summary,
    title: record.title,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapComplianceCaseNoteRecord(record: {
  authorOperatorAccountId: string;
  bodyMarkdown: string;
  complianceCaseId: string;
  createdAt: Date;
  id: string;
}): ComplianceCaseNoteRecord {
  return {
    authorOperatorAccountId: record.authorOperatorAccountId,
    bodyMarkdown: record.bodyMarkdown,
    complianceCaseId: record.complianceCaseId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id
  };
}

function mapProtocolProposalDraftRecord(record: {
  action: ProtocolProposalDraftRecord["action"];
  calldata: string;
  chainId: number;
  createdAt: Date;
  createdByOperatorAccountId: string;
  description: string;
  id: string;
  input: Prisma.JsonValue;
  target: ProtocolProposalDraftRecord["target"];
  targetAddress: string;
  value: string;
}): ProtocolProposalDraftRecord {
  return {
    action: record.action,
    calldata: record.calldata as ProtocolProposalDraftRecord["calldata"],
    chainId: record.chainId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    description: record.description,
    id: record.id,
    input: record.input as ProtocolProposalDraftRecord["input"],
    target: record.target,
    targetAddress:
      record.targetAddress as ProtocolProposalDraftRecord["targetAddress"],
    value: record.value
  };
}

class PrismaOperatorAccountRepository implements OperatorAccountRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: OperatorAccountRecord): Promise<OperatorAccountRecord> {
    const persisted = await this.database.operatorAccount.create({
      data: {
        active: record.active,
        createdAt: toDate(record.createdAt),
        id: record.id,
        role: record.role,
        updatedAt: toDate(record.updatedAt),
        userId: record.userId,
        walletId: record.walletId
      }
    });

    return mapOperatorAccountRecord(persisted);
  }

  async findActiveByUserId(userId: string): Promise<OperatorAccountRecord | null> {
    const record = await this.database.operatorAccount.findFirst({
      where: { active: true, userId }
    });

    return record ? mapOperatorAccountRecord(record) : null;
  }

  async findActiveByWalletId(walletId: string): Promise<OperatorAccountRecord | null> {
    const record = await this.database.operatorAccount.findFirst({
      where: { active: true, walletId }
    });

    return record ? mapOperatorAccountRecord(record) : null;
  }

  async findById(id: string): Promise<OperatorAccountRecord | null> {
    const record = await this.database.operatorAccount.findUnique({ where: { id } });
    return record ? mapOperatorAccountRecord(record) : null;
  }
}

class PrismaOperatorAlertRepository implements OperatorAlertRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: OperatorAlertRecord): Promise<OperatorAlertRecord> {
    const persisted = await this.database.operatorAlert.create({
      data: {
        acknowledgedAt: record.acknowledgedAt ? toDate(record.acknowledgedAt) : null,
        acknowledgedByOperatorAccountId: record.acknowledgedByOperatorAccountId,
        agreementAddress: record.agreementAddress,
        assignedOperatorAccountId: record.assignedOperatorAccountId,
        dealVersionId: record.dealVersionId,
        description: record.description,
        draftDealId: record.draftDealId,
        fingerprint: record.fingerprint,
        firstDetectedAt: toDate(record.firstDetectedAt),
        id: record.id,
        kind: record.kind,
        lastDetectedAt: toDate(record.lastDetectedAt),
        linkedComplianceCaseId: record.linkedComplianceCaseId,
        metadata: toPrismaJsonInput(
          record.metadata as Prisma.InputJsonValue | null
        ),
        organizationId: record.organizationId,
        resolvedAt: record.resolvedAt ? toDate(record.resolvedAt) : null,
        resolvedByOperatorAccountId: record.resolvedByOperatorAccountId,
        severity: record.severity,
        status: record.status,
        subjectId: record.subjectId,
        subjectLabel: record.subjectLabel,
        subjectType: record.subjectType
      }
    });

    return mapOperatorAlertRecord(persisted);
  }

  async findByFingerprint(fingerprint: string): Promise<OperatorAlertRecord | null> {
    const record = await this.database.operatorAlert.findUnique({
      where: { fingerprint }
    });

    return record ? mapOperatorAlertRecord(record) : null;
  }

  async findById(id: string): Promise<OperatorAlertRecord | null> {
    const record = await this.database.operatorAlert.findUnique({ where: { id } });
    return record ? mapOperatorAlertRecord(record) : null;
  }

  async listAll(): Promise<OperatorAlertRecord[]> {
    const records = await this.database.operatorAlert.findMany({
      orderBy: [{ status: "asc" }, { lastDetectedAt: "desc" }]
    });

    return records.map(mapOperatorAlertRecord);
  }

  async update(
    id: string,
    updates: Partial<Omit<OperatorAlertRecord, "id" | "fingerprint" | "firstDetectedAt">>
  ): Promise<OperatorAlertRecord> {
    const data = omitUndefined({
      acknowledgedAt:
        updates.acknowledgedAt === undefined
          ? undefined
          : updates.acknowledgedAt
            ? toDate(updates.acknowledgedAt)
            : null,
      acknowledgedByOperatorAccountId:
        updates.acknowledgedByOperatorAccountId,
      agreementAddress: updates.agreementAddress,
      assignedOperatorAccountId: updates.assignedOperatorAccountId,
      dealVersionId: updates.dealVersionId,
      description: updates.description,
      draftDealId: updates.draftDealId,
      kind: updates.kind,
      lastDetectedAt:
        updates.lastDetectedAt === undefined
          ? undefined
          : toDate(updates.lastDetectedAt),
      linkedComplianceCaseId: updates.linkedComplianceCaseId,
      metadata:
        updates.metadata === undefined
          ? undefined
          : toPrismaJsonInput(updates.metadata as Prisma.InputJsonValue | null),
      organizationId: updates.organizationId,
      resolvedAt:
        updates.resolvedAt === undefined
          ? undefined
          : updates.resolvedAt
            ? toDate(updates.resolvedAt)
            : null,
      resolvedByOperatorAccountId: updates.resolvedByOperatorAccountId,
      severity: updates.severity,
      status: updates.status,
      subjectId: updates.subjectId,
      subjectLabel: updates.subjectLabel,
      subjectType: updates.subjectType
    }) as Prisma.OperatorAlertUncheckedUpdateInput;

    const persisted = await this.database.operatorAlert.update({
      where: { id },
      data
    });

    return mapOperatorAlertRecord(persisted);
  }
}

class PrismaComplianceCheckpointRepository
  implements ComplianceCheckpointRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async create(
    record: ComplianceCheckpointRecord
  ): Promise<ComplianceCheckpointRecord> {
    const persisted = await this.database.complianceCheckpoint.create({
      data: {
        agreementAddress: record.agreementAddress,
        createdAt: toDate(record.createdAt),
        createdByOperatorAccountId: record.createdByOperatorAccountId,
        dealVersionId: record.dealVersionId,
        decidedAt: record.decidedAt ? toDate(record.decidedAt) : null,
        decidedByOperatorAccountId: record.decidedByOperatorAccountId,
        decisionNote: record.decisionNote,
        draftDealId: record.draftDealId,
        id: record.id,
        kind: record.kind,
        linkedComplianceCaseId: record.linkedComplianceCaseId,
        note: record.note,
        organizationId: record.organizationId,
        status: record.status,
        subjectId: record.subjectId,
        subjectLabel: record.subjectLabel,
        subjectType: record.subjectType
      }
    });

    return mapComplianceCheckpointRecord(persisted);
  }

  async findById(id: string): Promise<ComplianceCheckpointRecord | null> {
    const record = await this.database.complianceCheckpoint.findUnique({ where: { id } });
    return record ? mapComplianceCheckpointRecord(record) : null;
  }

  async listAll(): Promise<ComplianceCheckpointRecord[]> {
    const records = await this.database.complianceCheckpoint.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return records.map(mapComplianceCheckpointRecord);
  }

  async update(
    id: string,
    updates: Partial<Omit<ComplianceCheckpointRecord, "id" | "createdAt" | "createdByOperatorAccountId">>
  ): Promise<ComplianceCheckpointRecord> {
    const data = omitUndefined({
      agreementAddress: updates.agreementAddress,
      dealVersionId: updates.dealVersionId,
      decidedAt:
        updates.decidedAt === undefined
          ? undefined
          : updates.decidedAt
            ? toDate(updates.decidedAt)
            : null,
      decidedByOperatorAccountId: updates.decidedByOperatorAccountId,
      decisionNote: updates.decisionNote,
      draftDealId: updates.draftDealId,
      kind: updates.kind,
      linkedComplianceCaseId: updates.linkedComplianceCaseId,
      note: updates.note,
      organizationId: updates.organizationId,
      status: updates.status,
      subjectId: updates.subjectId,
      subjectLabel: updates.subjectLabel,
      subjectType: updates.subjectType
    }) as Prisma.ComplianceCheckpointUncheckedUpdateInput;

    const persisted = await this.database.complianceCheckpoint.update({
      where: { id },
      data
    });

    return mapComplianceCheckpointRecord(persisted);
  }
}

class PrismaComplianceCaseRepository implements ComplianceCaseRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ComplianceCaseRecord): Promise<ComplianceCaseRecord> {
    const persisted = await this.database.complianceCase.create({
      data: {
        agreementAddress: record.agreementAddress,
        assignedOperatorAccountId: record.assignedOperatorAccountId,
        createdAt: toDate(record.createdAt),
        createdByOperatorAccountId: record.createdByOperatorAccountId,
        dealVersionId: record.dealVersionId,
        draftDealId: record.draftDealId,
        id: record.id,
        linkedAlertId: record.linkedAlertId,
        linkedCheckpointId: record.linkedCheckpointId,
        organizationId: record.organizationId,
        resolvedAt: record.resolvedAt ? toDate(record.resolvedAt) : null,
        severity: record.severity,
        status: record.status,
        subjectId: record.subjectId,
        subjectLabel: record.subjectLabel,
        subjectType: record.subjectType,
        summary: record.summary,
        title: record.title,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapComplianceCaseRecord(persisted);
  }

  async findById(id: string): Promise<ComplianceCaseRecord | null> {
    const record = await this.database.complianceCase.findUnique({ where: { id } });
    return record ? mapComplianceCaseRecord(record) : null;
  }

  async listAll(): Promise<ComplianceCaseRecord[]> {
    const records = await this.database.complianceCase.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    return records.map(mapComplianceCaseRecord);
  }

  async update(
    id: string,
    updates: Partial<Omit<ComplianceCaseRecord, "id" | "createdAt" | "createdByOperatorAccountId">>
  ): Promise<ComplianceCaseRecord> {
    const data = omitUndefined({
      agreementAddress: updates.agreementAddress,
      assignedOperatorAccountId: updates.assignedOperatorAccountId,
      dealVersionId: updates.dealVersionId,
      draftDealId: updates.draftDealId,
      linkedAlertId: updates.linkedAlertId,
      linkedCheckpointId: updates.linkedCheckpointId,
      organizationId: updates.organizationId,
      resolvedAt:
        updates.resolvedAt === undefined
          ? undefined
          : updates.resolvedAt
            ? toDate(updates.resolvedAt)
            : null,
      severity: updates.severity,
      status: updates.status,
      subjectId: updates.subjectId,
      subjectLabel: updates.subjectLabel,
      subjectType: updates.subjectType,
      summary: updates.summary,
      title: updates.title,
      updatedAt:
        updates.updatedAt === undefined ? undefined : toDate(updates.updatedAt)
    }) as Prisma.ComplianceCaseUncheckedUpdateInput;

    const persisted = await this.database.complianceCase.update({
      where: { id },
      data
    });

    return mapComplianceCaseRecord(persisted);
  }
}

class PrismaComplianceCaseNoteRepository implements ComplianceCaseNoteRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ComplianceCaseNoteRecord): Promise<ComplianceCaseNoteRecord> {
    const persisted = await this.database.complianceCaseNote.create({
      data: {
        authorOperatorAccountId: record.authorOperatorAccountId,
        bodyMarkdown: record.bodyMarkdown,
        complianceCaseId: record.complianceCaseId,
        createdAt: toDate(record.createdAt),
        id: record.id
      }
    });

    return mapComplianceCaseNoteRecord(persisted);
  }

  async listByComplianceCaseId(
    complianceCaseId: string
  ): Promise<ComplianceCaseNoteRecord[]> {
    const records = await this.database.complianceCaseNote.findMany({
      where: { complianceCaseId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapComplianceCaseNoteRecord);
  }
}

class PrismaProtocolProposalDraftRepository
  implements ProtocolProposalDraftRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async create(
    record: ProtocolProposalDraftRecord
  ): Promise<ProtocolProposalDraftRecord> {
    const persisted = await this.database.protocolProposalDraft.create({
      data: {
        action: record.action,
        calldata: record.calldata,
        chainId: record.chainId,
        createdAt: toDate(record.createdAt),
        createdByOperatorAccountId: record.createdByOperatorAccountId,
        description: record.description,
        id: record.id,
        input: record.input as Prisma.InputJsonValue,
        target: record.target,
        targetAddress: record.targetAddress,
        value: record.value
      }
    });

    return mapProtocolProposalDraftRecord(persisted);
  }

  async findById(id: string): Promise<ProtocolProposalDraftRecord | null> {
    const record = await this.database.protocolProposalDraft.findUnique({
      where: { id }
    });

    return record ? mapProtocolProposalDraftRecord(record) : null;
  }

  async listAll(): Promise<ProtocolProposalDraftRecord[]> {
    const records = await this.database.protocolProposalDraft.findMany({
      orderBy: { createdAt: "desc" }
    });

    return records.map(mapProtocolProposalDraftRecord);
  }
}

export class PrismaRelease8Repositories implements Release8Repositories {
  readonly complianceCaseNotes: ComplianceCaseNoteRepository;
  readonly complianceCases: ComplianceCaseRepository;
  readonly complianceCheckpoints: ComplianceCheckpointRepository;
  readonly operatorAccounts: OperatorAccountRepository;
  readonly operatorAlerts: OperatorAlertRepository;
  readonly protocolProposalDrafts: ProtocolProposalDraftRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.complianceCaseNotes = new PrismaComplianceCaseNoteRepository(prisma);
    this.complianceCases = new PrismaComplianceCaseRepository(prisma);
    this.complianceCheckpoints = new PrismaComplianceCheckpointRepository(prisma);
    this.operatorAccounts = new PrismaOperatorAccountRepository(prisma);
    this.operatorAlerts = new PrismaOperatorAlertRepository(prisma);
    this.protocolProposalDrafts = new PrismaProtocolProposalDraftRepository(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createRelease8Repositories(
  prismaClient?: PrismaClient
): PrismaRelease8Repositories {
  return new PrismaRelease8Repositories(prismaClient ?? new PrismaClient());
}
