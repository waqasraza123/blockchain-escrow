import { Prisma, PrismaClient } from "@prisma/client";

import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  CostCenterRecord,
  StatementSnapshotRecord
} from "./records";
import type {
  ApprovalPolicyRepository,
  ApprovalPolicyStepRepository,
  ApprovalRequestRepository,
  ApprovalRequestStepRepository,
  CostCenterRepository,
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
  dealVersionId: string;
  draftDealId: string;
  id: string;
  kind: ApprovalRequestRecord["kind"];
  note: string | null;
  organizationId: string;
  requestedAt: Date;
  requestedByUserId: string;
  settlementCurrency: ApprovalRequestRecord["settlementCurrency"];
  status: ApprovalRequestRecord["status"];
  title: string;
  totalAmountMinor: string;
}): ApprovalRequestRecord {
  return {
    approvalPolicyId: record.approvalPolicyId,
    costCenterId: record.costCenterId,
    decidedAt: toIsoTimestamp(record.decidedAt),
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    note: record.note,
    organizationId: record.organizationId,
    requestedAt: toRequiredIsoTimestamp(record.requestedAt),
    requestedByUserId: record.requestedByUserId,
    settlementCurrency: record.settlementCurrency,
    status: record.status,
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
        dealVersionId: record.dealVersionId,
        draftDealId: record.draftDealId,
        id: record.id,
        kind: record.kind,
        note: record.note,
        organizationId: record.organizationId,
        requestedAt: toDate(record.requestedAt),
        requestedByUserId: record.requestedByUserId,
        settlementCurrency: record.settlementCurrency,
        status: record.status,
        title: record.title,
        totalAmountMinor: record.totalAmountMinor
      }
    });

    return mapApprovalRequestRecord(created);
  }

  async findByDealVersionIdAndKind(
    dealVersionId: string,
    kind: ApprovalRequestRecord["kind"]
  ): Promise<ApprovalRequestRecord | null> {
    const record = await this.database.approvalRequest.findUnique({
      where: {
        dealVersionId_kind: {
          dealVersionId,
          kind
        }
      }
    });

    return record ? mapApprovalRequestRecord(record) : null;
  }

  async findById(id: string): Promise<ApprovalRequestRecord | null> {
    const record = await this.database.approvalRequest.findUnique({ where: { id } });
    return record ? mapApprovalRequestRecord(record) : null;
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
      Omit<ApprovalRequestRecord, "id" | "organizationId" | "draftDealId" | "dealVersionId">
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
    if (updates.kind !== undefined) {
      data.kind = updates.kind;
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
}

export class PrismaRelease9Repositories implements Release9Repositories {
  readonly approvalPolicies: ApprovalPolicyRepository;
  readonly approvalPolicySteps: ApprovalPolicyStepRepository;
  readonly approvalRequests: ApprovalRequestRepository;
  readonly approvalRequestSteps: ApprovalRequestStepRepository;
  readonly costCenters: CostCenterRepository;
  readonly statementSnapshots: StatementSnapshotRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.approvalPolicies = new PrismaApprovalPolicyRepository(prisma);
    this.approvalPolicySteps = new PrismaApprovalPolicyStepRepository(prisma);
    this.approvalRequests = new PrismaApprovalRequestRepository(prisma);
    this.approvalRequestSteps = new PrismaApprovalRequestStepRepository(prisma);
    this.costCenters = new PrismaCostCenterRepository(prisma);
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
