import type {
  FundingTransactionIndexedExecutionStatus,
  FundingTransactionReconciledStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus
} from "./funding";
import type { IsoTimestamp, WalletAddress } from "./primitives";

export interface SettlementExecutionTransactionObservation {
  indexedAt: IsoTimestamp | null;
  indexedBlockNumber: string | null;
  indexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
}

export interface SettlementExecutionTransactionStalePendingState {
  stalePending: boolean | null;
  stalePendingAt: IsoTimestamp | null;
  stalePendingEvaluation: FundingTransactionStalePendingEvaluation | null;
}

export interface ResolvedSettlementExecutionTransactionState {
  agreementAddress: WalletAddress | null;
  confirmedAt: IsoTimestamp | null;
  matchesTrackedAgreement: boolean | null;
  status: FundingTransactionStatus;
}

export interface DesiredSettlementExecutionTransactionReconciliationState {
  reconciledAgreementAddress: WalletAddress | null;
  reconciledConfirmedAt: IsoTimestamp | null;
  reconciledMatchesTrackedAgreement: boolean | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
}

export interface PersistedSettlementExecutionTransactionReconciliationState
  extends DesiredSettlementExecutionTransactionReconciliationState {
  reconciledAt: IsoTimestamp | null;
}

export interface SettlementExecutionTransactionForReconciliation {
  submittedAt: IsoTimestamp;
  supersededAt: IsoTimestamp | null;
}

export interface IndexedTransactionForSettlementExecutionReconciliation {
  blockNumber: string;
  executionStatus: FundingTransactionIndexedExecutionStatus;
  indexedAt: IsoTimestamp;
  toAddress: WalletAddress | null;
}

export interface ChainCursorForSettlementExecutionReconciliation {
  updatedAt: IsoTimestamp;
}

function toReconciledStatus(
  status: FundingTransactionStatus
): FundingTransactionReconciledStatus | null {
  switch (status) {
    case "CONFIRMED":
    case "FAILED":
    case "MISMATCHED":
      return status;
    default:
      return null;
  }
}

function addSeconds(timestamp: IsoTimestamp, seconds: number): IsoTimestamp {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}

export function buildSettlementExecutionTransactionObservation(
  indexedTransaction: IndexedTransactionForSettlementExecutionReconciliation | null
): SettlementExecutionTransactionObservation {
  return {
    indexedAt: indexedTransaction?.indexedAt ?? null,
    indexedBlockNumber: indexedTransaction?.blockNumber ?? null,
    indexedExecutionStatus: indexedTransaction?.executionStatus ?? null
  };
}

export function resolveSettlementExecutionTransactionStalePendingState(input: {
  currentStatus: FundingTransactionStatus;
  evaluatedAt: IsoTimestamp;
  release4ChainCursor: ChainCursorForSettlementExecutionReconciliation | null;
  settlementExecutionTransaction: SettlementExecutionTransactionForReconciliation;
  indexerFreshnessTtlSeconds: number;
  pendingStaleAfterSeconds: number;
}): SettlementExecutionTransactionStalePendingState {
  const {
    currentStatus,
    evaluatedAt,
    release4ChainCursor,
    settlementExecutionTransaction,
    indexerFreshnessTtlSeconds,
    pendingStaleAfterSeconds
  } = input;

  if (currentStatus !== "PENDING") {
    return {
      stalePending: false,
      stalePendingAt: null,
      stalePendingEvaluation: null
    };
  }

  if (!release4ChainCursor) {
    return {
      stalePending: null,
      stalePendingAt: null,
      stalePendingEvaluation: "INDEXER_CURSOR_MISSING"
    };
  }

  const cursorAgeMs = Date.parse(evaluatedAt) - Date.parse(release4ChainCursor.updatedAt);

  if (cursorAgeMs > indexerFreshnessTtlSeconds * 1000) {
    return {
      stalePending: null,
      stalePendingAt: null,
      stalePendingEvaluation: "INDEXER_CURSOR_STALE"
    };
  }

  const stalePendingAt = addSeconds(
    settlementExecutionTransaction.submittedAt,
    pendingStaleAfterSeconds
  );

  return {
    stalePending: Date.parse(evaluatedAt) > Date.parse(stalePendingAt),
    stalePendingAt,
    stalePendingEvaluation: "READY"
  };
}

export function resolveSettlementExecutionTransactionState(input: {
  agreementAddress: WalletAddress | null;
  indexedTransaction: IndexedTransactionForSettlementExecutionReconciliation | null;
  settlementExecutionTransaction: SettlementExecutionTransactionForReconciliation;
}): ResolvedSettlementExecutionTransactionState {
  const { agreementAddress, indexedTransaction, settlementExecutionTransaction } = input;

  if (
    indexedTransaction?.executionStatus === "SUCCESS" &&
    agreementAddress &&
    indexedTransaction.toAddress === agreementAddress
  ) {
    return {
      agreementAddress,
      confirmedAt: indexedTransaction.indexedAt,
      matchesTrackedAgreement: true,
      status: "CONFIRMED"
    };
  }

  if (indexedTransaction?.executionStatus === "REVERTED") {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedAgreement: agreementAddress ? null : false,
      status: "FAILED"
    };
  }

  if (indexedTransaction?.executionStatus === "SUCCESS") {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedAgreement: agreementAddress ? false : null,
      status: "MISMATCHED"
    };
  }

  if (settlementExecutionTransaction.supersededAt) {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedAgreement: null,
      status: "SUPERSEDED"
    };
  }

  return {
    agreementAddress: null,
    confirmedAt: null,
    matchesTrackedAgreement: null,
    status: "PENDING"
  };
}

export function buildDesiredSettlementExecutionTransactionReconciliationState(
  resolvedState: ResolvedSettlementExecutionTransactionState
): DesiredSettlementExecutionTransactionReconciliationState {
  const reconciledStatus = toReconciledStatus(resolvedState.status);

  if (!reconciledStatus) {
    return {
      reconciledAgreementAddress: null,
      reconciledConfirmedAt: null,
      reconciledMatchesTrackedAgreement: null,
      reconciledStatus: null
    };
  }

  return {
    reconciledAgreementAddress: resolvedState.agreementAddress,
    reconciledConfirmedAt: resolvedState.confirmedAt,
    reconciledMatchesTrackedAgreement: resolvedState.matchesTrackedAgreement,
    reconciledStatus
  };
}

export function buildPersistedSettlementExecutionTransactionReconciliationState(input: {
  desiredState: DesiredSettlementExecutionTransactionReconciliationState;
  reconciledAt: IsoTimestamp;
}): PersistedSettlementExecutionTransactionReconciliationState {
  const { desiredState, reconciledAt } = input;

  if (!desiredState.reconciledStatus) {
    return {
      ...desiredState,
      reconciledAt: null
    };
  }

  return {
    ...desiredState,
    reconciledAt
  };
}

export function settlementExecutionTransactionReconciliationStateChanged(input: {
  currentState: PersistedSettlementExecutionTransactionReconciliationState;
  desiredState: DesiredSettlementExecutionTransactionReconciliationState;
}): boolean {
  const { currentState, desiredState } = input;

  return (
    (desiredState.reconciledStatus !== null && currentState.reconciledAt === null) ||
    (desiredState.reconciledStatus === null && currentState.reconciledAt !== null) ||
    currentState.reconciledAgreementAddress !==
      desiredState.reconciledAgreementAddress ||
    currentState.reconciledConfirmedAt !== desiredState.reconciledConfirmedAt ||
    currentState.reconciledMatchesTrackedAgreement !==
      desiredState.reconciledMatchesTrackedAgreement ||
    currentState.reconciledStatus !== desiredState.reconciledStatus
  );
}
