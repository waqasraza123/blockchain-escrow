import type {
  ChainCursorRecord,
  EscrowAgreementRecord,
  FundingTransactionRecord,
  IndexedTransactionRecord
} from "@blockchain-escrow/db";
import type {
  FundingTransactionIndexedExecutionStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus,
  HexString,
  IsoTimestamp,
  WalletAddress
} from "@blockchain-escrow/shared";

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

export function buildFundingTransactionObservation(
  indexedTransaction: IndexedTransactionRecord | null
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
  fundingTransaction: FundingTransactionRecord;
  indexerFreshnessTtlSeconds: number;
  pendingStaleAfterSeconds: number;
  release4ChainCursor: ChainCursorRecord | null;
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
  fundingTransaction: FundingTransactionRecord;
  indexedTransaction: IndexedTransactionRecord | null;
  observedAgreement: EscrowAgreementRecord | null;
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
