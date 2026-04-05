import { z } from "zod";

import type { ChainId, HexString, IsoTimestamp, JsonObject, WalletAddress } from "./primitives";

export const indexedContractNameSchema = z.enum([
  "TokenAllowlist",
  "ArbitratorRegistry",
  "ProtocolConfig",
  "FeeVault",
  "EscrowAgreement",
  "EscrowFactory"
]);
export type IndexedContractName = z.infer<typeof indexedContractNameSchema>;

export const indexedEventNameSchema = z.enum([
  "OwnershipTransferStarted",
  "OwnershipTransferred",
  "TokenStatusUpdated",
  "ArbitratorApprovalUpdated",
  "ArbitratorRegistryUpdated",
  "CreateEscrowPauseUpdated",
  "FeeVaultUpdated",
  "FundingPauseUpdated",
  "ProtocolFeeBpsUpdated",
  "TokenAllowlistUpdated",
  "TreasuryUpdated",
  "NativeFeesWithdrawn",
  "TokenFeesWithdrawn",
  "AgreementCreated",
  "AgreementInitialized"
]);
export type IndexedEventName = z.infer<typeof indexedEventNameSchema>;

export interface ChainCursorSummary {
  chainId: ChainId;
  cursorKey: string;
  lastProcessedBlockHash: HexString | null;
  lastProcessedBlockNumber: string | null;
  nextBlockNumber: string;
  updatedAt: IsoTimestamp;
}

export interface IndexedBlockSummary {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  indexedAt: IsoTimestamp;
  parentBlockHash: HexString;
  timestamp: IsoTimestamp;
}

export interface IndexedTransactionSummary {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  fromAddress: WalletAddress | null;
  indexedAt: IsoTimestamp;
  toAddress: WalletAddress | null;
  transactionHash: HexString;
  transactionIndex: number;
}

export interface IndexedContractEventSummary {
  blockHash: HexString;
  blockNumber: string;
  blockTimestamp: IsoTimestamp;
  chainId: ChainId;
  contractAddress: WalletAddress;
  contractName: IndexedContractName;
  data: JsonObject;
  eventName: IndexedEventName;
  indexedAt: IsoTimestamp;
  logIndex: number;
  topic0: HexString;
  topics: HexString[];
  transactionHash: HexString;
  transactionIndex: number;
}

export interface ContractOwnershipSummary {
  chainId: ChainId;
  contractAddress: WalletAddress;
  contractName: IndexedContractName;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface TokenAllowlistEntrySummary {
  chainId: ChainId;
  isAllowed: boolean;
  token: WalletAddress;
  tokenAllowlistAddress: WalletAddress;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface ArbitratorRegistryEntrySummary {
  arbitrator: WalletAddress;
  arbitratorRegistryAddress: WalletAddress;
  chainId: ChainId;
  isApproved: boolean;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface ProtocolConfigStateSummary {
  arbitratorRegistryAddress: WalletAddress | null;
  chainId: ChainId;
  createEscrowPaused: boolean;
  feeVaultAddress: WalletAddress | null;
  fundingPaused: boolean;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  protocolConfigAddress: WalletAddress;
  protocolFeeBps: number;
  tokenAllowlistAddress: WalletAddress | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface FeeVaultStateSummary {
  chainId: ChainId;
  feeVaultAddress: WalletAddress;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface EscrowAgreementSummary {
  agreementAddress: WalletAddress;
  arbitratorAddress: WalletAddress | null;
  buyerAddress: WalletAddress;
  chainId: ChainId;
  createdBlockHash: HexString;
  createdBlockNumber: string;
  createdLogIndex: number;
  createdTransactionHash: HexString;
  dealId: HexString;
  dealVersionHash: HexString;
  factoryAddress: WalletAddress;
  feeVaultAddress: WalletAddress;
  initializedBlockHash: HexString;
  initializedBlockNumber: string;
  initializedLogIndex: number;
  initializedTimestamp: IsoTimestamp;
  initializedTransactionHash: HexString;
  milestoneCount: number;
  protocolConfigAddress: WalletAddress;
  protocolFeeBps: number;
  sellerAddress: WalletAddress;
  settlementTokenAddress: WalletAddress;
  totalAmount: string;
  updatedAt: IsoTimestamp;
}
