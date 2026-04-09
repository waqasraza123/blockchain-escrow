import type {
  ComplianceCaseNoteRecord,
  ComplianceCaseRecord,
  ComplianceCheckpointRecord,
  OperatorAccountRecord,
  OperatorAlertRecord,
  ProtocolProposalDraftRecord,
  Release8Repositories
} from "@blockchain-escrow/db";

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class InMemoryRelease8Repositories implements Release8Repositories {
  readonly complianceCaseNoteRecords: ComplianceCaseNoteRecord[] = [];
  readonly complianceCaseRecords: ComplianceCaseRecord[] = [];
  readonly complianceCheckpointRecords: ComplianceCheckpointRecord[] = [];
  readonly operatorAccountRecords: OperatorAccountRecord[] = [];
  readonly operatorAlertRecords: OperatorAlertRecord[] = [];
  readonly protocolProposalDraftRecords: ProtocolProposalDraftRecord[] = [];

  readonly operatorAccounts = {
    create: async (record: OperatorAccountRecord): Promise<OperatorAccountRecord> => {
      this.operatorAccountRecords.push(record);
      return record;
    },
    findActiveByUserId: async (userId: string): Promise<OperatorAccountRecord | null> =>
      this.operatorAccountRecords.find(
        (record) => record.userId === userId && record.active
      ) ?? null,
    findActiveByWalletId: async (
      walletId: string
    ): Promise<OperatorAccountRecord | null> =>
      this.operatorAccountRecords.find(
        (record) => record.walletId === walletId && record.active
      ) ?? null,
    findById: async (id: string): Promise<OperatorAccountRecord | null> =>
      this.operatorAccountRecords.find((record) => record.id === id) ?? null
  };

  readonly operatorAlerts = {
    create: async (record: OperatorAlertRecord): Promise<OperatorAlertRecord> => {
      this.operatorAlertRecords.push(record);
      return record;
    },
    findByFingerprint: async (
      fingerprint: string
    ): Promise<OperatorAlertRecord | null> =>
      this.operatorAlertRecords.find((record) => record.fingerprint === fingerprint) ??
      null,
    findById: async (id: string): Promise<OperatorAlertRecord | null> =>
      this.operatorAlertRecords.find((record) => record.id === id) ?? null,
    listAll: async (): Promise<OperatorAlertRecord[]> =>
      [...this.operatorAlertRecords].sort((left, right) =>
        compareIsoTimestamps(right.lastDetectedAt, left.lastDetectedAt)
      ),
    update: async (
      id: string,
      updates: Partial<Omit<OperatorAlertRecord, "id" | "fingerprint" | "firstDetectedAt">>
    ): Promise<OperatorAlertRecord> => {
      const record = this.operatorAlertRecords.find((entry) => entry.id === id) ?? null;

      if (!record) {
        throw new Error(`Operator alert not found: ${id}`);
      }

      Object.assign(record, updates);
      return record;
    }
  };

  readonly complianceCheckpoints = {
    create: async (
      record: ComplianceCheckpointRecord
    ): Promise<ComplianceCheckpointRecord> => {
      this.complianceCheckpointRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<ComplianceCheckpointRecord | null> =>
      this.complianceCheckpointRecords.find((record) => record.id === id) ?? null,
    listAll: async (): Promise<ComplianceCheckpointRecord[]> =>
      [...this.complianceCheckpointRecords].sort((left, right) =>
        compareIsoTimestamps(right.createdAt, left.createdAt)
      ),
    update: async (
      id: string,
      updates: Partial<
        Omit<ComplianceCheckpointRecord, "id" | "createdAt" | "createdByOperatorAccountId">
      >
    ): Promise<ComplianceCheckpointRecord> => {
      const record =
        this.complianceCheckpointRecords.find((entry) => entry.id === id) ?? null;

      if (!record) {
        throw new Error(`Compliance checkpoint not found: ${id}`);
      }

      Object.assign(record, updates);
      return record;
    }
  };

  readonly complianceCases = {
    create: async (record: ComplianceCaseRecord): Promise<ComplianceCaseRecord> => {
      this.complianceCaseRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<ComplianceCaseRecord | null> =>
      this.complianceCaseRecords.find((record) => record.id === id) ?? null,
    listAll: async (): Promise<ComplianceCaseRecord[]> =>
      [...this.complianceCaseRecords].sort((left, right) =>
        compareIsoTimestamps(right.updatedAt, left.updatedAt)
      ),
    update: async (
      id: string,
      updates: Partial<Omit<ComplianceCaseRecord, "id" | "createdAt" | "createdByOperatorAccountId">>
    ): Promise<ComplianceCaseRecord> => {
      const record = this.complianceCaseRecords.find((entry) => entry.id === id) ?? null;

      if (!record) {
        throw new Error(`Compliance case not found: ${id}`);
      }

      Object.assign(record, updates);
      return record;
    }
  };

  readonly complianceCaseNotes = {
    create: async (
      record: ComplianceCaseNoteRecord
    ): Promise<ComplianceCaseNoteRecord> => {
      this.complianceCaseNoteRecords.push(record);
      return record;
    },
    listByComplianceCaseId: async (
      complianceCaseId: string
    ): Promise<ComplianceCaseNoteRecord[]> =>
      this.complianceCaseNoteRecords
        .filter((record) => record.complianceCaseId === complianceCaseId)
        .sort((left, right) => compareIsoTimestamps(left.createdAt, right.createdAt))
  };

  readonly protocolProposalDrafts = {
    create: async (
      record: ProtocolProposalDraftRecord
    ): Promise<ProtocolProposalDraftRecord> => {
      this.protocolProposalDraftRecords.push(record);
      return record;
    },
    findById: async (id: string): Promise<ProtocolProposalDraftRecord | null> =>
      this.protocolProposalDraftRecords.find((record) => record.id === id) ?? null,
    listAll: async (): Promise<ProtocolProposalDraftRecord[]> =>
      [...this.protocolProposalDraftRecords].sort((left, right) =>
        compareIsoTimestamps(right.createdAt, left.createdAt)
      )
  };
}
