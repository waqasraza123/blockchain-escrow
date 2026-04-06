import type {
  EscrowAgreementRecord,
  FundingTransactionRecord,
  IndexedTransactionRecord
} from "@blockchain-escrow/db";
import type {
  FundingTransactionStatus,
  HexString,
  IsoTimestamp,
  WalletAddress
} from "@blockchain-escrow/shared";

export interface ResolvedFundingTransactionState {
  agreementAddress: WalletAddress | null;
  confirmedAt: IsoTimestamp | null;
  matchesTrackedVersion: boolean | null;
  status: FundingTransactionStatus;
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
