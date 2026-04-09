import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  CostCenterRecord,
  Release9Repositories,
  StatementSnapshotRecord
} from "@blockchain-escrow/db";

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class InMemoryRelease9Repositories implements Release9Repositories {
  readonly approvalPolicyRecords: ApprovalPolicyRecord[] = [];
  readonly approvalPolicyStepRecords: ApprovalPolicyStepRecord[] = [];
  readonly approvalRequestRecords: ApprovalRequestRecord[] = [];
  readonly approvalRequestStepRecords: ApprovalRequestStepRecord[] = [];
  readonly costCenterRecords: CostCenterRecord[] = [];
  readonly statementSnapshotRecords: StatementSnapshotRecord[] = [];

  readonly costCenters = {
    create: async (record: CostCenterRecord): Promise<CostCenterRecord> => {
      this.costCenterRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<CostCenterRecord | null> =>
      this.costCenterRecords.find((record) => record.id === id) ?? null,
    findByOrganizationIdAndNormalizedCode: async (
      organizationId: string,
      normalizedCode: string
    ): Promise<CostCenterRecord | null> =>
      this.costCenterRecords.find(
        (record) =>
          record.organizationId === organizationId &&
          record.normalizedCode === normalizedCode
      ) ?? null,
    listByOrganizationId: async (organizationId: string): Promise<CostCenterRecord[]> =>
      this.costCenterRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly approvalPolicies = {
    create: async (record: ApprovalPolicyRecord): Promise<ApprovalPolicyRecord> => {
      this.approvalPolicyRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<ApprovalPolicyRecord | null> =>
      this.approvalPolicyRecords.find((record) => record.id === id) ?? null,
    listActiveByOrganizationId: async (
      organizationId: string
    ): Promise<ApprovalPolicyRecord[]> =>
      this.approvalPolicyRecords
        .filter((record) => record.organizationId === organizationId && record.active)
        .sort((left, right) => compareIsoTimestamps(right.updatedAt, left.updatedAt)),
    listByOrganizationId: async (
      organizationId: string
    ): Promise<ApprovalPolicyRecord[]> =>
      this.approvalPolicyRecords
        .filter((record) => record.organizationId === organizationId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly approvalPolicySteps = {
    create: async (
      record: ApprovalPolicyStepRecord
    ): Promise<ApprovalPolicyStepRecord> => {
      this.approvalPolicyStepRecords.push(record);
      return record;
    },
    listByApprovalPolicyId: async (
      approvalPolicyId: string
    ): Promise<ApprovalPolicyStepRecord[]> =>
      this.approvalPolicyStepRecords
        .filter((record) => record.approvalPolicyId === approvalPolicyId)
        .sort((left, right) => left.position - right.position)
  };

  readonly approvalRequests = {
    create: async (record: ApprovalRequestRecord): Promise<ApprovalRequestRecord> => {
      this.approvalRequestRecords.push(record);
      return record;
    },
    findByDealVersionIdAndKind: async (
      dealVersionId: string,
      kind: ApprovalRequestRecord["kind"]
    ): Promise<ApprovalRequestRecord | null> =>
      this.approvalRequestRecords.find(
        (record) => record.dealVersionId === dealVersionId && record.kind === kind
      ) ?? null,
    findById: async (id: string): Promise<ApprovalRequestRecord | null> =>
      this.approvalRequestRecords.find((record) => record.id === id) ?? null,
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<ApprovalRequestRecord[]> =>
      this.approvalRequestRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => compareIsoTimestamps(right.requestedAt, left.requestedAt)),
    update: async (
      id: string,
      updates: Partial<
        Omit<ApprovalRequestRecord, "id" | "organizationId" | "draftDealId" | "dealVersionId">
      >
    ): Promise<ApprovalRequestRecord> => {
      const record = this.approvalRequestRecords.find((entry) => entry.id === id) ?? null;

      if (!record) {
        throw new Error(`Approval request not found: ${id}`);
      }

      Object.assign(record, updates);
      return record;
    }
  };

  readonly approvalRequestSteps = {
    create: async (
      record: ApprovalRequestStepRecord
    ): Promise<ApprovalRequestStepRecord> => {
      this.approvalRequestStepRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<ApprovalRequestStepRecord | null> =>
      this.approvalRequestStepRecords.find((record) => record.id === id) ?? null,
    listByApprovalRequestId: async (
      approvalRequestId: string
    ): Promise<ApprovalRequestStepRecord[]> =>
      this.approvalRequestStepRecords
        .filter((record) => record.approvalRequestId === approvalRequestId)
        .sort((left, right) => left.position - right.position),
    update: async (
      id: string,
      updates: Partial<Omit<ApprovalRequestStepRecord, "id" | "approvalRequestId">>
    ): Promise<ApprovalRequestStepRecord> => {
      const record =
        this.approvalRequestStepRecords.find((entry) => entry.id === id) ?? null;

      if (!record) {
        throw new Error(`Approval request step not found: ${id}`);
      }

      Object.assign(record, updates);
      return record;
    }
  };

  readonly statementSnapshots = {
    create: async (
      record: StatementSnapshotRecord
    ): Promise<StatementSnapshotRecord> => {
      this.statementSnapshotRecords.push(record);
      return record;
    },
    listByDealVersionId: async (
      dealVersionId: string
    ): Promise<StatementSnapshotRecord[]> =>
      this.statementSnapshotRecords
        .filter((record) => record.dealVersionId === dealVersionId)
        .sort((left, right) => compareIsoTimestamps(right.createdAt, left.createdAt))
  };
}
