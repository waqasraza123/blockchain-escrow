import type {
  FundingTransactionIndexedExecutionStatus,
  FundingTransactionReconciledStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus
} from "./funding";
import type { HexString, IsoTimestamp, WalletAddress } from "./primitives";

export interface FundingTransactionObservation {
  indexedAt: IsoTimestamp | null;
  indexedBlockNumber: string | null;
  indexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
}

export interface FundingTransactionStalePendingState {
  stalePending: boolean | null;
  stalePendingAt: IsoTimestamp | null;
  stalePendingEvaluation: FundingTransactionStalePendingEvaluation | null;
}

export interface ResolvedFundingTransactionState {
  agreementAddress: WalletAddress | null;
  confirmedAt: IsoTimestamp | null;
  matchesTrackedVersion: boolean | null;
  status: FundingTransactionStatus;
}

export interface DesiredFundingTransactionReconciliationState {
  reconciledAgreementAddress: WalletAddress | null;
  reconciledConfirmedAt: IsoTimestamp | null;
  reconciledMatchesTrackedVersion: boolean | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
}

export interface PersistedFundingTransactionReconciliationState
  extends DesiredFundingTransactionReconciliationState {
  reconciledAt: IsoTimestamp | null;
}

export interface FundingTransactionForReconciliation {
  submittedAt: IsoTimestamp;
  supersededAt: IsoTimestamp | null;
}

export interface IndexedTransactionForReconciliation {
  blockNumber: string;
  executionStatus: FundingTransactionIndexedExecutionStatus;
  indexedAt: IsoTimestamp;
}

export interface ObservedAgreementForReconciliation {
  agreementAddress: WalletAddress;
  dealId: HexString;
  dealVersionHash: HexString;
  funded: boolean;
  fundedAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

export interface ChainCursorForReconciliation {
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

export function buildFundingTransactionObservation(
  indexedTransaction: IndexedTransactionForReconciliation | null
): FundingTransactionObservation {
  return {
    indexedAt: indexedTransaction?.indexedAt ?? null,
    indexedBlockNumber: indexedTransaction?.blockNumber ?? null,
    indexedExecutionStatus: indexedTransaction?.executionStatus ?? null
  };
}

function addSeconds(timestamp: IsoTimestamp, seconds: number): IsoTimestamp {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}

export function resolveFundingTransactionStalePendingState(input: {
  currentStatus: FundingTransactionStatus;
  evaluatedAt: IsoTimestamp;
  fundingTransaction: FundingTransactionForReconciliation;
  indexerFreshnessTtlSeconds: number;
  pendingStaleAfterSeconds: number;
  release4ChainCursor: ChainCursorForReconciliation | null;
}): FundingTransactionStalePendingState {
  const {
    currentStatus,
    evaluatedAt,
    fundingTransaction,
    indexerFreshnessTtlSeconds,
    pendingStaleAfterSeconds,
    release4ChainCursor
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
    fundingTransaction.submittedAt,
    pendingStaleAfterSeconds
  );

  return {
    stalePending: Date.parse(evaluatedAt) > Date.parse(stalePendingAt),
    stalePendingAt,
    stalePendingEvaluation: "READY"
  };
}

export function resolveFundingTransactionState(input: {
  dealId: HexString;
  dealVersionHash?: HexString | null;
  fundingTransaction: FundingTransactionForReconciliation;
  indexedTransaction: IndexedTransactionForReconciliation | null;
  observedAgreement: ObservedAgreementForReconciliation | null;
  requiresFundedAgreement?: boolean;
}): ResolvedFundingTransactionState {
  const {
    dealId,
    dealVersionHash,
    fundingTransaction,
    indexedTransaction,
    observedAgreement,
    requiresFundedAgreement = false
  } = input;

  if (observedAgreement && observedAgreement.dealId === dealId) {
    if (requiresFundedAgreement && !observedAgreement.funded) {
      return {
        agreementAddress: null,
        confirmedAt: null,
        matchesTrackedVersion: false,
        status: "MISMATCHED"
      };
    }

    return {
      agreementAddress: observedAgreement.agreementAddress,
      confirmedAt:
        (requiresFundedAgreement
          ? observedAgreement.fundedAt
          : observedAgreement.updatedAt) ?? observedAgreement.updatedAt,
      matchesTrackedVersion: dealVersionHash
        ? observedAgreement.dealVersionHash === dealVersionHash
        : null,
      status: "CONFIRMED"
    };
  }

  if (observedAgreement) {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedVersion: false,
      status: "MISMATCHED"
    };
  }

  if (indexedTransaction?.executionStatus === "REVERTED") {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedVersion: null,
      status: "FAILED"
    };
  }

  if (indexedTransaction?.executionStatus === "SUCCESS") {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedVersion: false,
      status: "MISMATCHED"
    };
  }

  if (fundingTransaction.supersededAt) {
    return {
      agreementAddress: null,
      confirmedAt: null,
      matchesTrackedVersion: null,
      status: "SUPERSEDED"
    };
  }

  return {
    agreementAddress: null,
    confirmedAt: null,
    matchesTrackedVersion: null,
    status: "PENDING"
  };
}

export function buildDesiredFundingTransactionReconciliationState(
  resolvedState: ResolvedFundingTransactionState
): DesiredFundingTransactionReconciliationState {
  const reconciledStatus = toReconciledStatus(resolvedState.status);

  if (!reconciledStatus) {
    return {
      reconciledAgreementAddress: null,
      reconciledConfirmedAt: null,
      reconciledMatchesTrackedVersion: null,
      reconciledStatus: null
    };
  }

  return {
    reconciledAgreementAddress: resolvedState.agreementAddress,
    reconciledConfirmedAt: resolvedState.confirmedAt,
    reconciledMatchesTrackedVersion: resolvedState.matchesTrackedVersion,
    reconciledStatus
  };
}

export function buildPersistedFundingTransactionReconciliationState(input: {
  desiredState: DesiredFundingTransactionReconciliationState;
  reconciledAt: IsoTimestamp;
}): PersistedFundingTransactionReconciliationState {
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

export function fundingTransactionReconciliationStateChanged(input: {
  currentState: PersistedFundingTransactionReconciliationState;
  desiredState: DesiredFundingTransactionReconciliationState;
}): boolean {
  const { currentState, desiredState } = input;

  return (
    (desiredState.reconciledStatus !== null && currentState.reconciledAt === null) ||
    (desiredState.reconciledStatus === null && currentState.reconciledAt !== null) ||
    currentState.reconciledAgreementAddress !==
      desiredState.reconciledAgreementAddress ||
    currentState.reconciledConfirmedAt !== desiredState.reconciledConfirmedAt ||
    currentState.reconciledMatchesTrackedVersion !==
      desiredState.reconciledMatchesTrackedVersion ||
    currentState.reconciledStatus !== desiredState.reconciledStatus
  );
}
