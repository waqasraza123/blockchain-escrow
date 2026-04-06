import type {
  EscrowAgreementRecord,
  FundingTransactionRecord,
  IndexedTransactionRecord
} from "@blockchain-escrow/db";
import type {
  FundingTransactionIndexedExecutionStatus,
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

export function resolveFundingTransactionState(input: {
  dealId: HexString;
  dealVersionHash?: HexString | null;
  fundingTransaction: FundingTransactionRecord;
  indexedTransaction: IndexedTransactionRecord | null;
  observedAgreement: EscrowAgreementRecord | null;
}): ResolvedFundingTransactionState {
  const {
    dealId,
    dealVersionHash,
    fundingTransaction,
    indexedTransaction,
    observedAgreement
  } = input;

  if (observedAgreement && observedAgreement.dealId === dealId) {
    return {
      agreementAddress: observedAgreement.agreementAddress,
      confirmedAt: observedAgreement.updatedAt,
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
