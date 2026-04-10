import { Prisma, PrismaClient } from "@prisma/client";

import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  CostCenterRecord,
  FinanceExportArtifactRecord,
  FinanceExportJobRecord,
  StatementSnapshotRecord
} from "./records";
import type {
  ApprovalPolicyRepository,
  ApprovalPolicyStepRepository,
  ApprovalRequestRepository,
  ApprovalRequestStepRepository,
  CostCenterRepository,
  FinanceExportArtifactRepository,
  FinanceExportJobRepository,
  Release9Repositories,
  StatementSnapshotRepository
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

function mapCostCenterRecord(record: {
  code: string;
  createdAt: Date;
  createdByUserId: string;
  description: string | null;
  id: string;
  name: string;
  normalizedCode: string;
  organizationId: string;
  status: CostCenterRecord["status"];
  updatedAt: Date;
}): CostCenterRecord {
  return {
    code: record.code,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    description: record.description,
    id: record.id,
    name: record.name,
    normalizedCode: record.normalizedCode,
    organizationId: record.organizationId,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapApprovalPolicyRecord(record: {
  active: boolean;
  costCenterId: string | null;
  createdAt: Date;
  createdByUserId: string;
  description: string | null;
  id: string;
  kind: ApprovalPolicyRecord["kind"];
  name: string;
  organizationId: string;
  settlementCurrency: ApprovalPolicyRecord["settlementCurrency"];
  updatedAt: Date;
}): ApprovalPolicyRecord {
  return {
    active: record.active,
    costCenterId: record.costCenterId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    description: record.description,
    id: record.id,
    kind: record.kind,
    name: record.name,
    organizationId: record.organizationId,
    settlementCurrency: record.settlementCurrency,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapApprovalPolicyStepRecord(record: {
  approvalPolicyId: string;
  id: string;
  label: string;
  position: number;
  requiredRole: ApprovalPolicyStepRecord["requiredRole"];
}): ApprovalPolicyStepRecord {
  return {
    approvalPolicyId: record.approvalPolicyId,
    id: record.id,
    label: record.label,
    position: record.position,
    requiredRole: record.requiredRole
  };
}

function mapApprovalRequestRecord(record: {
  approvalPolicyId: string;
  costCenterId: string | null;
  decidedAt: Date | null;
  dealVersionId: string | null;
  dealVersionMilestoneId: string | null;
  draftDealId: string | null;
  id: string;
  kind: ApprovalRequestRecord["kind"];
  metadata: Prisma.JsonValue | null;
  note: string | null;
  organizationId: string;
  requestedAt: Date;
  requestedByUserId: string;
  settlementCurrency: ApprovalRequestRecord["settlementCurrency"];
  status: ApprovalRequestRecord["status"];
  subjectFingerprint: string;
  subjectId: string;
  subjectLabel: string | null;
  subjectType: ApprovalRequestRecord["subjectType"];
  title: string;
  totalAmountMinor: string | null;
}): ApprovalRequestRecord {
  return {
    approvalPolicyId: record.approvalPolicyId,
    costCenterId: record.costCenterId,
    decidedAt: toIsoTimestamp(record.decidedAt),
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    metadata: (record.metadata ?? null) as ApprovalRequestRecord["metadata"],
    note: record.note,
    organizationId: record.organizationId,
    requestedAt: toRequiredIsoTimestamp(record.requestedAt),
    requestedByUserId: record.requestedByUserId,
    settlementCurrency: record.settlementCurrency,
    status: record.status,
    subjectFingerprint: record.subjectFingerprint,
    subjectId: record.subjectId,
    subjectLabel: record.subjectLabel,
    subjectType: record.subjectType,
    title: record.title,
    totalAmountMinor: record.totalAmountMinor
  };
}

function mapApprovalRequestStepRecord(record: {
  approvalRequestId: string;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  id: string;
  label: string;
  note: string | null;
  position: number;
  requiredRole: ApprovalRequestStepRecord["requiredRole"];
  status: ApprovalRequestStepRecord["status"];
}): ApprovalRequestStepRecord {
  return {
    approvalRequestId: record.approvalRequestId,
    decidedAt: toIsoTimestamp(record.decidedAt),
    decidedByUserId: record.decidedByUserId,
    id: record.id,
    label: record.label,
    note: record.note,
    position: record.position,
    requiredRole: record.requiredRole,
    status: record.status
  };
}

function mapStatementSnapshotRecord(record: {
  approvalRequestId: string | null;
  asOf: Date;
  costCenterId: string | null;
  createdAt: Date;
  createdByUserId: string;
  dealVersionId: string;
  draftDealId: string;
  id: string;
  kind: StatementSnapshotRecord["kind"];
  note: string | null;
  organizationId: string;
  payload: Prisma.JsonValue;
}): StatementSnapshotRecord {
  return {
    approvalRequestId: record.approvalRequestId,
    asOf: toRequiredIsoTimestamp(record.asOf),
    costCenterId: record.costCenterId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    note: record.note,
    organizationId: record.organizationId,
    payload: (record.payload ?? null) as StatementSnapshotRecord["payload"]
  };
}

function mapFinanceExportJobRecord(record: {
  createdAt: Date;
  createdByUserId: string;
  errorMessage: string | null;
  failedAt: Date | null;
  filters: Prisma.JsonValue;
  finishedAt: Date | null;
  id: string;
  organizationId: string;
  startedAt: Date | null;
  status: FinanceExportJobRecord["status"];
}): FinanceExportJobRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    errorMessage: record.errorMessage,
    failedAt: toIsoTimestamp(record.failedAt),
    filters: (record.filters ?? null) as FinanceExportJobRecord["filters"],
    finishedAt: toIsoTimestamp(record.finishedAt),
    id: record.id,
    organizationId: record.organizationId,
    startedAt: toIsoTimestamp(record.startedAt),
    status: record.status
  };
}

function mapFinanceExportArtifactRecord(record: {
  body: string;
  createdAt: Date;
  fileId: string | null;
  filename: string;
  financeExportJobId: string;
  format: FinanceExportArtifactRecord["format"];
  id: string;
  mediaType: string;
  sizeBytes: number;
}): FinanceExportArtifactRecord {
  return {
    body: record.body,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    fileId: record.fileId,
    filename: record.filename,
    financeExportJobId: record.financeExportJobId,
    format: record.format,
    id: record.id,
    mediaType: record.mediaType,
    sizeBytes: record.sizeBytes
  };
}

export class PrismaCostCenterRepository implements CostCenterRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: CostCenterRecord): Promise<CostCenterRecord> {
    const created = await this.database.costCenter.create({
      data: {
        code: record.code,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        description: record.description,
        id: record.id,
        name: record.name,
        normalizedCode: record.normalizedCode,
        organizationId: record.organizationId,
        status: record.status,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapCostCenterRecord(created);
  }

  async findById(id: string): Promise<CostCenterRecord | null> {
    const record = await this.database.costCenter.findUnique({ where: { id } });
    return record ? mapCostCenterRecord(record) : null;
  }

  async findByOrganizationIdAndNormalizedCode(
    organizationId: string,
    normalizedCode: string
  ): Promise<CostCenterRecord | null> {
    const record = await this.database.costCenter.findUnique({
      where: {
        organizationId_normalizedCode: {
          normalizedCode,
          organizationId
        }
      }
    });

    return record ? mapCostCenterRecord(record) : null;
  }

  async listByOrganizationId(organizationId: string): Promise<CostCenterRecord[]> {
    const records = await this.database.costCenter.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { organizationId }
    });

    return records.map(mapCostCenterRecord);
  }
}

export class PrismaApprovalPolicyRepository implements ApprovalPolicyRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ApprovalPolicyRecord): Promise<ApprovalPolicyRecord> {
    const created = await this.database.approvalPolicy.create({
      data: {
        active: record.active,
        costCenterId: record.costCenterId,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        description: record.description,
        id: record.id,
        kind: record.kind,
        name: record.name,
        organizationId: record.organizationId,
        settlementCurrency: record.settlementCurrency,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapApprovalPolicyRecord(created);
  }

  async findById(id: string): Promise<ApprovalPolicyRecord | null> {
    const record = await this.database.approvalPolicy.findUnique({ where: { id } });
    return record ? mapApprovalPolicyRecord(record) : null;
  }

  async listActiveByOrganizationId(
    organizationId: string
  ): Promise<ApprovalPolicyRecord[]> {
    const records = await this.database.approvalPolicy.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      where: {
        active: true,
        organizationId
      }
    });

    return records.map(mapApprovalPolicyRecord);
  }

  async listByOrganizationId(organizationId: string): Promise<ApprovalPolicyRecord[]> {
    const records = await this.database.approvalPolicy.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { organizationId }
    });

    return records.map(mapApprovalPolicyRecord);
  }
}

export class PrismaApprovalPolicyStepRepository
  implements ApprovalPolicyStepRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ApprovalPolicyStepRecord): Promise<ApprovalPolicyStepRecord> {
    const created = await this.database.approvalPolicyStep.create({
      data: {
        approvalPolicyId: record.approvalPolicyId,
        id: record.id,
        label: record.label,
        position: record.position,
        requiredRole: record.requiredRole
      }
    });

    return mapApprovalPolicyStepRecord(created);
  }

  async listByApprovalPolicyId(
    approvalPolicyId: string
  ): Promise<ApprovalPolicyStepRecord[]> {
    const records = await this.database.approvalPolicyStep.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      where: { approvalPolicyId }
    });

    return records.map(mapApprovalPolicyStepRecord);
  }
}

export class PrismaApprovalRequestRepository implements ApprovalRequestRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ApprovalRequestRecord): Promise<ApprovalRequestRecord> {
    const created = await this.database.approvalRequest.create({
      data: {
        approvalPolicyId: record.approvalPolicyId,
        costCenterId: record.costCenterId,
        decidedAt: record.decidedAt ? toDate(record.decidedAt) : null,
        dealVersionMilestoneId: record.dealVersionMilestoneId,
        dealVersionId: record.dealVersionId,
        draftDealId: record.draftDealId,
        id: record.id,
        kind: record.kind,
        metadata: toPrismaJsonInput(record.metadata as Prisma.InputJsonValue),
        note: record.note,
        organizationId: record.organizationId,
        requestedAt: toDate(record.requestedAt),
        requestedByUserId: record.requestedByUserId,
        settlementCurrency: record.settlementCurrency,
        status: record.status,
        subjectFingerprint: record.subjectFingerprint,
        subjectId: record.subjectId,
        subjectLabel: record.subjectLabel,
        subjectType: record.subjectType,
        title: record.title,
        totalAmountMinor: record.totalAmountMinor
      }
    });

    return mapApprovalRequestRecord(created);
  }

  async findBySubjectFingerprint(input: {
    kind: ApprovalRequestRecord["kind"];
    organizationId: string;
    subjectFingerprint: string;
    subjectId: string;
    subjectType: ApprovalRequestRecord["subjectType"];
  }): Promise<ApprovalRequestRecord | null> {
    const record = await this.database.approvalRequest.findFirst({
      orderBy: [{ requestedAt: "desc" }, { id: "asc" }],
      where: {
        kind: input.kind,
        organizationId: input.organizationId,
        subjectFingerprint: input.subjectFingerprint,
        subjectId: input.subjectId,
        subjectType: input.subjectType
      }
    });

    return record ? mapApprovalRequestRecord(record) : null;
  }

  async findById(id: string): Promise<ApprovalRequestRecord | null> {
    const record = await this.database.approvalRequest.findUnique({ where: { id } });
    return record ? mapApprovalRequestRecord(record) : null;
  }

  async listByOrganizationId(
    organizationId: string
  ): Promise<ApprovalRequestRecord[]> {
    const records = await this.database.approvalRequest.findMany({
      orderBy: [{ requestedAt: "desc" }, { id: "asc" }],
      where: { organizationId }
    });

    return records.map(mapApprovalRequestRecord);
  }

  async listByDealVersionId(dealVersionId: string): Promise<ApprovalRequestRecord[]> {
    const records = await this.database.approvalRequest.findMany({
      orderBy: [{ requestedAt: "desc" }, { id: "asc" }],
      where: { dealVersionId }
    });

    return records.map(mapApprovalRequestRecord);
  }

  async update(
    id: string,
    updates: Partial<
      Omit<ApprovalRequestRecord, "id" | "organizationId" | "subjectFingerprint">
    >
  ): Promise<ApprovalRequestRecord> {
    const data: Prisma.ApprovalRequestUncheckedUpdateInput = {};

    if (updates.approvalPolicyId !== undefined) {
      data.approvalPolicyId = updates.approvalPolicyId;
    }
    if (updates.costCenterId !== undefined) {
      data.costCenterId = updates.costCenterId;
    }
    if (updates.decidedAt !== undefined) {
      data.decidedAt = updates.decidedAt ? toDate(updates.decidedAt) : null;
    }
    if (updates.dealVersionId !== undefined) {
      data.dealVersionId = updates.dealVersionId;
    }
    if (updates.dealVersionMilestoneId !== undefined) {
      data.dealVersionMilestoneId = updates.dealVersionMilestoneId;
    }
    if (updates.draftDealId !== undefined) {
      data.draftDealId = updates.draftDealId;
    }
    if (updates.kind !== undefined) {
      data.kind = updates.kind;
    }
    if (updates.metadata !== undefined) {
      data.metadata = toPrismaJsonInput(updates.metadata as Prisma.InputJsonValue);
    }
    if (updates.note !== undefined) {
      data.note = updates.note;
    }
    if (updates.requestedAt !== undefined) {
      data.requestedAt = toDate(updates.requestedAt);
    }
    if (updates.requestedByUserId !== undefined) {
      data.requestedByUserId = updates.requestedByUserId;
    }
    if (updates.settlementCurrency !== undefined) {
      data.settlementCurrency = updates.settlementCurrency;
    }
    if (updates.status !== undefined) {
      data.status = updates.status;
    }
    if (updates.subjectId !== undefined) {
      data.subjectId = updates.subjectId;
    }
    if (updates.subjectLabel !== undefined) {
      data.subjectLabel = updates.subjectLabel;
    }
    if (updates.subjectType !== undefined) {
      data.subjectType = updates.subjectType;
    }
    if (updates.title !== undefined) {
      data.title = updates.title;
    }
    if (updates.totalAmountMinor !== undefined) {
      data.totalAmountMinor = updates.totalAmountMinor;
    }

    const updated = await this.database.approvalRequest.update({
      data,
      where: { id }
    });

    return mapApprovalRequestRecord(updated);
  }
}

export class PrismaApprovalRequestStepRepository
  implements ApprovalRequestStepRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async create(record: ApprovalRequestStepRecord): Promise<ApprovalRequestStepRecord> {
    const created = await this.database.approvalRequestStep.create({
      data: {
        approvalRequestId: record.approvalRequestId,
        decidedAt: record.decidedAt ? toDate(record.decidedAt) : null,
        decidedByUserId: record.decidedByUserId,
        id: record.id,
        label: record.label,
        note: record.note,
        position: record.position,
        requiredRole: record.requiredRole,
        status: record.status
      }
    });

    return mapApprovalRequestStepRecord(created);
  }

  async findById(id: string): Promise<ApprovalRequestStepRecord | null> {
    const record = await this.database.approvalRequestStep.findUnique({ where: { id } });
    return record ? mapApprovalRequestStepRecord(record) : null;
  }

  async listByApprovalRequestId(
    approvalRequestId: string
  ): Promise<ApprovalRequestStepRecord[]> {
    const records = await this.database.approvalRequestStep.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      where: { approvalRequestId }
    });

    return records.map(mapApprovalRequestStepRecord);
  }

  async update(
    id: string,
    updates: Partial<Omit<ApprovalRequestStepRecord, "id" | "approvalRequestId">>
  ): Promise<ApprovalRequestStepRecord> {
    const data: Prisma.ApprovalRequestStepUncheckedUpdateInput = {};

    if (updates.decidedAt !== undefined) {
      data.decidedAt = updates.decidedAt ? toDate(updates.decidedAt) : null;
    }
    if (updates.decidedByUserId !== undefined) {
      data.decidedByUserId = updates.decidedByUserId;
    }
    if (updates.label !== undefined) {
      data.label = updates.label;
    }
    if (updates.note !== undefined) {
      data.note = updates.note;
    }
    if (updates.position !== undefined) {
      data.position = updates.position;
    }
    if (updates.requiredRole !== undefined) {
      data.requiredRole = updates.requiredRole;
    }
    if (updates.status !== undefined) {
      data.status = updates.status;
    }

    const updated = await this.database.approvalRequestStep.update({
      data,
      where: { id }
    });

    return mapApprovalRequestStepRecord(updated);
  }
}

export class PrismaStatementSnapshotRepository implements StatementSnapshotRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: StatementSnapshotRecord): Promise<StatementSnapshotRecord> {
    const created = await this.database.statementSnapshot.create({
      data: {
        approvalRequestId: record.approvalRequestId,
        asOf: toDate(record.asOf),
        costCenterId: record.costCenterId,
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        dealVersionId: record.dealVersionId,
        draftDealId: record.draftDealId,
        id: record.id,
        kind: record.kind,
        note: record.note,
        organizationId: record.organizationId,
        payload: toPrismaJsonInput(record.payload as Prisma.InputJsonValue)
      }
    });

    return mapStatementSnapshotRecord(created);
  }

  async listByDealVersionId(
    dealVersionId: string
  ): Promise<StatementSnapshotRecord[]> {
    const records = await this.database.statementSnapshot.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      where: { dealVersionId }
    });

    return records.map(mapStatementSnapshotRecord);
  }

  async listByOrganizationId(
    organizationId: string
  ): Promise<StatementSnapshotRecord[]> {
    const records = await this.database.statementSnapshot.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      where: { organizationId }
    });

    return records.map(mapStatementSnapshotRecord);
  }
}

export class PrismaFinanceExportJobRepository implements FinanceExportJobRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(record: FinanceExportJobRecord): Promise<FinanceExportJobRecord> {
    const created = await this.database.financeExportJob.create({
      data: {
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        errorMessage: record.errorMessage,
        failedAt: record.failedAt ? toDate(record.failedAt) : null,
        filters: toPrismaJsonInput(record.filters as Prisma.InputJsonValue),
        finishedAt: record.finishedAt ? toDate(record.finishedAt) : null,
        id: record.id,
        organizationId: record.organizationId,
        startedAt: record.startedAt ? toDate(record.startedAt) : null,
        status: record.status
      }
    });

    return mapFinanceExportJobRecord(created);
  }

  async findById(id: string): Promise<FinanceExportJobRecord | null> {
    const record = await this.database.financeExportJob.findUnique({ where: { id } });
    return record ? mapFinanceExportJobRecord(record) : null;
  }

  async claimNextPending(startedAt: string): Promise<FinanceExportJobRecord | null> {
    if (!("$transaction" in this.database)) {
      const record = await this.database.financeExportJob.findFirst({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        where: { status: "PENDING" }
      });

      if (!record) {
        return null;
      }

      const claimed = await this.database.financeExportJob.update({
        data: {
          errorMessage: null,
          failedAt: null,
          finishedAt: null,
          startedAt: toDate(startedAt),
          status: "PROCESSING"
        },
        where: { id: record.id }
      });

      return mapFinanceExportJobRecord(claimed);
    }

    const database = this.database as PrismaClient;

    return database.$transaction(async (transaction) => {
      const record = await transaction.financeExportJob.findFirst({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        where: { status: "PENDING" }
      });

      if (!record) {
        return null;
      }

      const claimed = await transaction.financeExportJob.update({
        data: {
          errorMessage: null,
          failedAt: null,
          finishedAt: null,
          startedAt: toDate(startedAt),
          status: "PROCESSING"
        },
        where: { id: record.id }
      });

      return mapFinanceExportJobRecord(claimed);
    });
  }

  async listByOrganizationId(
    organizationId: string
  ): Promise<FinanceExportJobRecord[]> {
    const records = await this.database.financeExportJob.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      where: { organizationId }
    });

    return records.map(mapFinanceExportJobRecord);
  }

  async update(
    id: string,
    updates: Partial<
      Omit<
        FinanceExportJobRecord,
        "id" | "organizationId" | "createdAt" | "createdByUserId" | "filters"
      >
    >
  ): Promise<FinanceExportJobRecord> {
    const data: Prisma.FinanceExportJobUncheckedUpdateInput = {};

    if (updates.errorMessage !== undefined) {
      data.errorMessage = updates.errorMessage;
    }
    if (updates.failedAt !== undefined) {
      data.failedAt = updates.failedAt ? toDate(updates.failedAt) : null;
    }
    if (updates.finishedAt !== undefined) {
      data.finishedAt = updates.finishedAt ? toDate(updates.finishedAt) : null;
    }
    if (updates.startedAt !== undefined) {
      data.startedAt = updates.startedAt ? toDate(updates.startedAt) : null;
    }
    if (updates.status !== undefined) {
      data.status = updates.status;
    }

    const updated = await this.database.financeExportJob.update({
      data,
      where: { id }
    });

    return mapFinanceExportJobRecord(updated);
  }
}

export class PrismaFinanceExportArtifactRepository
  implements FinanceExportArtifactRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async create(
    record: FinanceExportArtifactRecord
  ): Promise<FinanceExportArtifactRecord> {
    const created = await this.database.financeExportArtifact.create({
      data: {
        body: record.body,
        createdAt: toDate(record.createdAt),
        fileId: record.fileId,
        filename: record.filename,
        financeExportJobId: record.financeExportJobId,
        format: record.format,
        id: record.id,
        mediaType: record.mediaType,
        sizeBytes: record.sizeBytes
      }
    });

    return mapFinanceExportArtifactRecord(created);
  }

  async listByFinanceExportJobId(
    financeExportJobId: string
  ): Promise<FinanceExportArtifactRecord[]> {
    const records = await this.database.financeExportArtifact.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: { financeExportJobId }
    });

    return records.map(mapFinanceExportArtifactRecord);
  }
}

export class PrismaRelease9Repositories implements Release9Repositories {
  readonly approvalPolicies: ApprovalPolicyRepository;
  readonly approvalPolicySteps: ApprovalPolicyStepRepository;
  readonly approvalRequests: ApprovalRequestRepository;
  readonly approvalRequestSteps: ApprovalRequestStepRepository;
  readonly costCenters: CostCenterRepository;
  readonly financeExportArtifacts: FinanceExportArtifactRepository;
  readonly financeExportJobs: FinanceExportJobRepository;
  readonly statementSnapshots: StatementSnapshotRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.approvalPolicies = new PrismaApprovalPolicyRepository(prisma);
    this.approvalPolicySteps = new PrismaApprovalPolicyStepRepository(prisma);
    this.approvalRequests = new PrismaApprovalRequestRepository(prisma);
    this.approvalRequestSteps = new PrismaApprovalRequestStepRepository(prisma);
    this.costCenters = new PrismaCostCenterRepository(prisma);
    this.financeExportArtifacts = new PrismaFinanceExportArtifactRepository(prisma);
    this.financeExportJobs = new PrismaFinanceExportJobRepository(prisma);
    this.statementSnapshots = new PrismaStatementSnapshotRepository(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createRelease9Repositories(
  prismaClient?: PrismaClient
): PrismaRelease9Repositories {
  return new PrismaRelease9Repositories(prismaClient ?? new PrismaClient());
}
