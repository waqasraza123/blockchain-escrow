import type {
  AuditAction,
  AuditEntityType,
  ChainId,
  DealPartyRole,
  DealPartySubjectType,
  DealState,
  EntityId,
  FileCategory,
  HexString,
  IndexedContractName,
  IndexedEventName,
  IsoTimestamp,
  JsonObject,
  OrganizationInviteStatus,
  OrganizationRole,
  SessionStatus,
  SettlementCurrency,
  TemplateSummary,
  TypedSignatureScheme,
  WalletAddress
} from "@blockchain-escrow/shared";

export interface UserRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  updatedAt: IsoTimestamp;
}

export interface WalletRecord {
  address: WalletAddress;
  chainId: ChainId | null;
  createdAt: IsoTimestamp;
  id: EntityId;
  isPrimary: boolean;
  updatedAt: IsoTimestamp;
  userId: EntityId;
}

export interface WalletNonceRecord {
  chainId: ChainId;
  consumedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
  id: EntityId;
  nonce: string;
  walletAddress: WalletAddress;
}

export interface SessionRecord {
  createdAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
  id: EntityId;
  lastSeenAt: IsoTimestamp | null;
  revokedAt: IsoTimestamp | null;
  status: SessionStatus;
  tokenHash: string;
  userId: EntityId;
  walletId: EntityId;
}

export interface OrganizationRecord {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  name: string;
  slug: string;
  updatedAt: IsoTimestamp;
}

export interface OrganizationMemberRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  updatedAt: IsoTimestamp;
  userId: EntityId;
}

export interface OrganizationInviteRecord {
  acceptedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  email: string;
  expiresAt: IsoTimestamp;
  id: EntityId;
  invitedByUserId: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  status: OrganizationInviteStatus;
  tokenHash: string;
  updatedAt: IsoTimestamp;
}

export interface AuditLogRecord {
  action: AuditAction;
  actorUserId: EntityId | null;
  entityId: EntityId;
  entityType: AuditEntityType;
  id: EntityId;
  ipAddress: string | null;
  metadata: JsonObject | null;
  occurredAt: IsoTimestamp;
  organizationId: EntityId | null;
  userAgent: string | null;
}

export interface CounterpartyRecord {
  contactEmail: string | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  legalName: string | null;
  name: string;
  normalizedName: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface FileRecord {
  byteSize: number;
  category: FileCategory;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  mediaType: string;
  organizationId: EntityId;
  originalFilename: string;
  sha256Hex: string;
  storageKey: string;
  updatedAt: IsoTimestamp;
}

export interface TemplateRecord {
  bodyMarkdown: TemplateSummary["bodyMarkdown"];
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  defaultCounterpartyId: EntityId | null;
  description: TemplateSummary["description"];
  id: EntityId;
  name: string;
  normalizedName: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface DraftDealRecord {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  state: DealState;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  updatedAt: IsoTimestamp;
}

export interface DraftDealPartyRecord {
  counterpartyId: EntityId | null;
  createdAt: IsoTimestamp;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
  updatedAt: IsoTimestamp;
}

export interface DealVersionRecord {
  bodyMarkdown: string;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  versionNumber: number;
}

export interface DealVersionPartyRecord {
  counterpartyId: EntityId | null;
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  displayName: string;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
}

export interface DealVersionMilestoneRecord {
  amountMinor: string;
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  description: string | null;
  dueAt: IsoTimestamp | null;
  id: EntityId;
  position: number;
  title: string;
}

export interface DealVersionFileRecord {
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  fileId: EntityId;
  id: EntityId;
}

export interface DealVersionAcceptanceRecord {
  acceptedAt: IsoTimestamp;
  acceptedByUserId: EntityId;
  dealVersionId: EntityId;
  dealVersionPartyId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  scheme: TypedSignatureScheme;
  signature: string;
  signerWalletAddress: WalletAddress;
  signerWalletId: EntityId;
  typedData: JsonObject;
}

export interface ChainCursorRecord {
  chainId: ChainId;
  cursorKey: string;
  lastProcessedBlockHash: HexString | null;
  lastProcessedBlockNumber: string | null;
  nextBlockNumber: string;
  updatedAt: IsoTimestamp;
}

export interface IndexedBlockRecord {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  indexedAt: IsoTimestamp;
  parentBlockHash: HexString;
  timestamp: IsoTimestamp;
}

export interface IndexedTransactionRecord {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  fromAddress: WalletAddress | null;
  indexedAt: IsoTimestamp;
  toAddress: WalletAddress | null;
  transactionHash: HexString;
  transactionIndex: number;
}

export interface IndexedContractEventRecord {
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

export interface ContractOwnershipRecord {
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

export interface TokenAllowlistEntryRecord {
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

export interface ArbitratorRegistryEntryRecord {
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

export interface ProtocolConfigStateRecord {
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

export interface FeeVaultStateRecord {
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

export interface EscrowAgreementRecord {
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
