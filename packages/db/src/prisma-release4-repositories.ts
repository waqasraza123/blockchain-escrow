import {
  IndexedContractName as PrismaIndexedContractName,
  IndexedEventName as PrismaIndexedEventName,
  Prisma,
  PrismaClient
} from "@prisma/client";

import type {
  ArbitratorRegistryEntryRecord,
  ChainCursorRecord,
  ContractOwnershipRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  ProtocolConfigStateRecord,
  TokenAllowlistEntryRecord
} from "./records";
import type { Release4Repositories } from "./repositories";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function toIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function toDate(value: string): Date {
  return new Date(value);
}

function toBigIntString(value: bigint | number): string {
  return BigInt(value).toString();
}

function toPrismaJson(value: IndexedContractEventRecord["data"]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapChainCursorRecord(record: {
  chainId: number;
  cursorKey: string;
  lastProcessedBlockHash: string | null;
  lastProcessedBlockNumber: bigint | null;
  nextBlockNumber: bigint;
  updatedAt: Date;
}): ChainCursorRecord {
  return {
    chainId: record.chainId,
    cursorKey: record.cursorKey,
    lastProcessedBlockHash:
      record.lastProcessedBlockHash as ChainCursorRecord["lastProcessedBlockHash"],
    lastProcessedBlockNumber:
      record.lastProcessedBlockNumber == null
        ? null
        : toBigIntString(record.lastProcessedBlockNumber),
    nextBlockNumber: toBigIntString(record.nextBlockNumber),
    updatedAt: toIsoTimestamp(record.updatedAt)
  };
}

function mapIndexedBlockRecord(record: {
  blockHash: string;
  blockNumber: bigint;
  chainId: number;
  indexedAt: Date;
  parentBlockHash: string;
  timestamp: Date;
}): IndexedBlockRecord {
  return {
    blockHash: record.blockHash as IndexedBlockRecord["blockHash"],
    blockNumber: toBigIntString(record.blockNumber),
    chainId: record.chainId,
    indexedAt: toIsoTimestamp(record.indexedAt),
    parentBlockHash: record.parentBlockHash as IndexedBlockRecord["parentBlockHash"],
    timestamp: toIsoTimestamp(record.timestamp)
  };
}

function mapIndexedContractEventRecord(record: {
  blockHash: string;
  blockNumber: bigint;
  blockTimestamp: Date;
  chainId: number;
  contractAddress: string;
  contractName: PrismaIndexedContractName;
  data: Prisma.JsonValue;
  eventName: PrismaIndexedEventName;
  indexedAt: Date;
  logIndex: number;
  topic0: string;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}): IndexedContractEventRecord {
  return {
    blockHash: record.blockHash as IndexedContractEventRecord["blockHash"],
    blockNumber: toBigIntString(record.blockNumber),
    blockTimestamp: toIsoTimestamp(record.blockTimestamp),
    chainId: record.chainId,
    contractAddress:
      record.contractAddress as IndexedContractEventRecord["contractAddress"],
    contractName: record.contractName,
    data: record.data as IndexedContractEventRecord["data"],
    eventName: record.eventName,
    indexedAt: toIsoTimestamp(record.indexedAt),
    logIndex: record.logIndex,
    topic0: record.topic0 as IndexedContractEventRecord["topic0"],
    topics: record.topics as IndexedContractEventRecord["topics"],
    transactionHash:
      record.transactionHash as IndexedContractEventRecord["transactionHash"],
    transactionIndex: record.transactionIndex
  };
}

function mapContractOwnershipRecord(record: {
  chainId: number;
  contractAddress: string;
  contractName: PrismaIndexedContractName;
  owner: string;
  pendingOwner: string | null;
  updatedAt: Date;
  updatedBlockHash: string;
  updatedBlockNumber: bigint;
  updatedLogIndex: number;
  updatedTransactionHash: string;
}): ContractOwnershipRecord {
  return {
    chainId: record.chainId,
    contractAddress: record.contractAddress as ContractOwnershipRecord["contractAddress"],
    contractName: record.contractName,
    owner: record.owner as ContractOwnershipRecord["owner"],
    pendingOwner: record.pendingOwner as ContractOwnershipRecord["pendingOwner"],
    updatedAt: toIsoTimestamp(record.updatedAt),
    updatedBlockHash: record.updatedBlockHash as ContractOwnershipRecord["updatedBlockHash"],
    updatedBlockNumber: toBigIntString(record.updatedBlockNumber),
    updatedLogIndex: record.updatedLogIndex,
    updatedTransactionHash:
      record.updatedTransactionHash as ContractOwnershipRecord["updatedTransactionHash"]
  };
}

function mapTokenAllowlistEntryRecord(record: {
  chainId: number;
  isAllowed: boolean;
  token: string;
  tokenAllowlistAddress: string;
  updatedAt: Date;
  updatedBlockHash: string;
  updatedBlockNumber: bigint;
  updatedLogIndex: number;
  updatedTransactionHash: string;
}): TokenAllowlistEntryRecord {
  return {
    chainId: record.chainId,
    isAllowed: record.isAllowed,
    token: record.token as TokenAllowlistEntryRecord["token"],
    tokenAllowlistAddress:
      record.tokenAllowlistAddress as TokenAllowlistEntryRecord["tokenAllowlistAddress"],
    updatedAt: toIsoTimestamp(record.updatedAt),
    updatedBlockHash:
      record.updatedBlockHash as TokenAllowlistEntryRecord["updatedBlockHash"],
    updatedBlockNumber: toBigIntString(record.updatedBlockNumber),
    updatedLogIndex: record.updatedLogIndex,
    updatedTransactionHash:
      record.updatedTransactionHash as TokenAllowlistEntryRecord["updatedTransactionHash"]
  };
}

function mapArbitratorRegistryEntryRecord(record: {
  arbitrator: string;
  arbitratorRegistryAddress: string;
  chainId: number;
  isApproved: boolean;
  updatedAt: Date;
  updatedBlockHash: string;
  updatedBlockNumber: bigint;
  updatedLogIndex: number;
  updatedTransactionHash: string;
}): ArbitratorRegistryEntryRecord {
  return {
    arbitrator: record.arbitrator as ArbitratorRegistryEntryRecord["arbitrator"],
    arbitratorRegistryAddress:
      record.arbitratorRegistryAddress as ArbitratorRegistryEntryRecord["arbitratorRegistryAddress"],
    chainId: record.chainId,
    isApproved: record.isApproved,
    updatedAt: toIsoTimestamp(record.updatedAt),
    updatedBlockHash:
      record.updatedBlockHash as ArbitratorRegistryEntryRecord["updatedBlockHash"],
    updatedBlockNumber: toBigIntString(record.updatedBlockNumber),
    updatedLogIndex: record.updatedLogIndex,
    updatedTransactionHash:
      record.updatedTransactionHash as ArbitratorRegistryEntryRecord["updatedTransactionHash"]
  };
}

function mapProtocolConfigStateRecord(record: {
  arbitratorRegistryAddress: string | null;
  chainId: number;
  createEscrowPaused: boolean;
  feeVaultAddress: string | null;
  fundingPaused: boolean;
  owner: string;
  pendingOwner: string | null;
  protocolConfigAddress: string;
  protocolFeeBps: number;
  tokenAllowlistAddress: string | null;
  treasuryAddress: string | null;
  updatedAt: Date;
  updatedBlockHash: string;
  updatedBlockNumber: bigint;
  updatedLogIndex: number;
  updatedTransactionHash: string;
}): ProtocolConfigStateRecord {
  return {
    arbitratorRegistryAddress:
      record.arbitratorRegistryAddress as ProtocolConfigStateRecord["arbitratorRegistryAddress"],
    chainId: record.chainId,
    createEscrowPaused: record.createEscrowPaused,
    feeVaultAddress: record.feeVaultAddress as ProtocolConfigStateRecord["feeVaultAddress"],
    fundingPaused: record.fundingPaused,
    owner: record.owner as ProtocolConfigStateRecord["owner"],
    pendingOwner: record.pendingOwner as ProtocolConfigStateRecord["pendingOwner"],
    protocolConfigAddress:
      record.protocolConfigAddress as ProtocolConfigStateRecord["protocolConfigAddress"],
    protocolFeeBps: record.protocolFeeBps,
    tokenAllowlistAddress:
      record.tokenAllowlistAddress as ProtocolConfigStateRecord["tokenAllowlistAddress"],
    treasuryAddress: record.treasuryAddress as ProtocolConfigStateRecord["treasuryAddress"],
    updatedAt: toIsoTimestamp(record.updatedAt),
    updatedBlockHash:
      record.updatedBlockHash as ProtocolConfigStateRecord["updatedBlockHash"],
    updatedBlockNumber: toBigIntString(record.updatedBlockNumber),
    updatedLogIndex: record.updatedLogIndex,
    updatedTransactionHash:
      record.updatedTransactionHash as ProtocolConfigStateRecord["updatedTransactionHash"]
  };
}

function mapFeeVaultStateRecord(record: {
  chainId: number;
  feeVaultAddress: string;
  owner: string;
  pendingOwner: string | null;
  treasuryAddress: string | null;
  updatedAt: Date;
  updatedBlockHash: string;
  updatedBlockNumber: bigint;
  updatedLogIndex: number;
  updatedTransactionHash: string;
}): FeeVaultStateRecord {
  return {
    chainId: record.chainId,
    feeVaultAddress: record.feeVaultAddress as FeeVaultStateRecord["feeVaultAddress"],
    owner: record.owner as FeeVaultStateRecord["owner"],
    pendingOwner: record.pendingOwner as FeeVaultStateRecord["pendingOwner"],
    treasuryAddress: record.treasuryAddress as FeeVaultStateRecord["treasuryAddress"],
    updatedAt: toIsoTimestamp(record.updatedAt),
    updatedBlockHash: record.updatedBlockHash as FeeVaultStateRecord["updatedBlockHash"],
    updatedBlockNumber: toBigIntString(record.updatedBlockNumber),
    updatedLogIndex: record.updatedLogIndex,
    updatedTransactionHash:
      record.updatedTransactionHash as FeeVaultStateRecord["updatedTransactionHash"]
  };
}

function mapEscrowAgreementRecord(record: {
  agreementAddress: string;
  arbitratorAddress: string | null;
  buyerAddress: string;
  chainId: number;
  createdBlockHash: string;
  createdBlockNumber: bigint;
  createdLogIndex: number;
  createdTransactionHash: string;
  dealId: string;
  dealVersionHash: string;
  factoryAddress: string;
  feeVaultAddress: string;
  initializedBlockHash: string;
  initializedBlockNumber: bigint;
  initializedLogIndex: number;
  initializedTimestamp: Date;
  initializedTransactionHash: string;
  milestoneCount: number;
  protocolConfigAddress: string;
  protocolFeeBps: number;
  sellerAddress: string;
  settlementTokenAddress: string;
  totalAmount: string;
  updatedAt: Date;
}): EscrowAgreementRecord {
  return {
    agreementAddress: record.agreementAddress as EscrowAgreementRecord["agreementAddress"],
    arbitratorAddress:
      record.arbitratorAddress as EscrowAgreementRecord["arbitratorAddress"],
    buyerAddress: record.buyerAddress as EscrowAgreementRecord["buyerAddress"],
    chainId: record.chainId,
    createdBlockHash: record.createdBlockHash as EscrowAgreementRecord["createdBlockHash"],
    createdBlockNumber: toBigIntString(record.createdBlockNumber),
    createdLogIndex: record.createdLogIndex,
    createdTransactionHash:
      record.createdTransactionHash as EscrowAgreementRecord["createdTransactionHash"],
    dealId: record.dealId as EscrowAgreementRecord["dealId"],
    dealVersionHash: record.dealVersionHash as EscrowAgreementRecord["dealVersionHash"],
    factoryAddress: record.factoryAddress as EscrowAgreementRecord["factoryAddress"],
    feeVaultAddress: record.feeVaultAddress as EscrowAgreementRecord["feeVaultAddress"],
    initializedBlockHash:
      record.initializedBlockHash as EscrowAgreementRecord["initializedBlockHash"],
    initializedBlockNumber: toBigIntString(record.initializedBlockNumber),
    initializedLogIndex: record.initializedLogIndex,
    initializedTimestamp: toIsoTimestamp(record.initializedTimestamp),
    initializedTransactionHash:
      record.initializedTransactionHash as EscrowAgreementRecord["initializedTransactionHash"],
    milestoneCount: record.milestoneCount,
    protocolConfigAddress:
      record.protocolConfigAddress as EscrowAgreementRecord["protocolConfigAddress"],
    protocolFeeBps: record.protocolFeeBps,
    sellerAddress: record.sellerAddress as EscrowAgreementRecord["sellerAddress"],
    settlementTokenAddress:
      record.settlementTokenAddress as EscrowAgreementRecord["settlementTokenAddress"],
    totalAmount: record.totalAmount,
    updatedAt: toIsoTimestamp(record.updatedAt)
  };
}

function buildRelease4Repositories(database: DatabaseClient): Release4Repositories {
  return {
    arbitratorRegistryEntries: {
      async listApprovedByChainIdAndContract(chainId, arbitratorRegistryAddress) {
        const records = await database.arbitratorRegistryEntryProjection.findMany({
          where: { arbitratorRegistryAddress, chainId, isApproved: true },
          orderBy: [{ arbitrator: "asc" }]
        });

        return records.map(mapArbitratorRegistryEntryRecord);
      },
      async listByChainId(chainId) {
        const records = await database.arbitratorRegistryEntryProjection.findMany({
          where: { chainId },
          orderBy: [{ arbitratorRegistryAddress: "asc" }, { arbitrator: "asc" }]
        });

        return records.map(mapArbitratorRegistryEntryRecord);
      },
      async resetByChainId(chainId) {
        await database.arbitratorRegistryEntryProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.arbitratorRegistryEntryProjection.upsert({
          where: {
            chainId_arbitratorRegistryAddress_arbitrator: {
              arbitrator: record.arbitrator,
              arbitratorRegistryAddress: record.arbitratorRegistryAddress,
              chainId: record.chainId
            }
          },
          update: {
            isApproved: record.isApproved,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          },
          create: {
            id: `${record.chainId}:${record.arbitratorRegistryAddress}:${record.arbitrator}`,
            arbitrator: record.arbitrator,
            arbitratorRegistryAddress: record.arbitratorRegistryAddress,
            chainId: record.chainId,
            isApproved: record.isApproved,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          }
        });

        return mapArbitratorRegistryEntryRecord(persisted);
      }
    },
    chainCursors: {
      async findByChainIdAndCursorKey(chainId, cursorKey) {
        const record = await database.chainCursor.findUnique({
          where: { chainId_cursorKey: { chainId, cursorKey } }
        });

        return record ? mapChainCursorRecord(record) : null;
      },
      async upsert(record) {
        const persisted = await database.chainCursor.upsert({
          where: {
            chainId_cursorKey: { chainId: record.chainId, cursorKey: record.cursorKey }
          },
          update: {
            lastProcessedBlockHash: record.lastProcessedBlockHash,
            lastProcessedBlockNumber:
              record.lastProcessedBlockNumber == null
                ? null
                : BigInt(record.lastProcessedBlockNumber),
            nextBlockNumber: BigInt(record.nextBlockNumber),
            updatedAt: toDate(record.updatedAt)
          },
          create: {
            id: `${record.chainId}:${record.cursorKey}`,
            chainId: record.chainId,
            cursorKey: record.cursorKey,
            lastProcessedBlockHash: record.lastProcessedBlockHash,
            lastProcessedBlockNumber:
              record.lastProcessedBlockNumber == null
                ? null
                : BigInt(record.lastProcessedBlockNumber),
            nextBlockNumber: BigInt(record.nextBlockNumber),
            updatedAt: toDate(record.updatedAt)
          }
        });

        return mapChainCursorRecord(persisted);
      }
    },
    contractOwnerships: {
      async listByChainId(chainId) {
        const records = await database.contractOwnershipProjection.findMany({
          where: { chainId },
          orderBy: [{ contractName: "asc" }, { contractAddress: "asc" }]
        });

        return records.map(mapContractOwnershipRecord);
      },
      async resetByChainId(chainId) {
        await database.contractOwnershipProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.contractOwnershipProjection.upsert({
          where: {
            chainId_contractAddress: {
              chainId: record.chainId,
              contractAddress: record.contractAddress
            }
          },
          update: {
            contractName: record.contractName,
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          },
          create: {
            id: `${record.chainId}:${record.contractAddress}`,
            chainId: record.chainId,
            contractAddress: record.contractAddress,
            contractName: record.contractName,
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          }
        });

        return mapContractOwnershipRecord(persisted);
      }
    },
    escrowAgreements: {
      async findByChainIdAndAddress(chainId, agreementAddress) {
        const record = await database.escrowAgreementProjection.findUnique({
          where: { chainId_agreementAddress: { agreementAddress, chainId } }
        });

        return record ? mapEscrowAgreementRecord(record) : null;
      },
      async listByChainId(chainId) {
        const records = await database.escrowAgreementProjection.findMany({
          where: { chainId },
          orderBy: [{ createdBlockNumber: "asc" }, { createdLogIndex: "asc" }]
        });

        return records.map(mapEscrowAgreementRecord);
      },
      async resetByChainId(chainId) {
        await database.escrowAgreementProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.escrowAgreementProjection.upsert({
          where: {
            chainId_agreementAddress: {
              agreementAddress: record.agreementAddress,
              chainId: record.chainId
            }
          },
          update: {
            arbitratorAddress: record.arbitratorAddress,
            buyerAddress: record.buyerAddress,
            createdBlockHash: record.createdBlockHash,
            createdBlockNumber: BigInt(record.createdBlockNumber),
            createdLogIndex: record.createdLogIndex,
            createdTransactionHash: record.createdTransactionHash,
            dealId: record.dealId,
            dealVersionHash: record.dealVersionHash,
            factoryAddress: record.factoryAddress,
            feeVaultAddress: record.feeVaultAddress,
            initializedBlockHash: record.initializedBlockHash,
            initializedBlockNumber: BigInt(record.initializedBlockNumber),
            initializedLogIndex: record.initializedLogIndex,
            initializedTimestamp: toDate(record.initializedTimestamp),
            initializedTransactionHash: record.initializedTransactionHash,
            milestoneCount: record.milestoneCount,
            protocolConfigAddress: record.protocolConfigAddress,
            protocolFeeBps: record.protocolFeeBps,
            sellerAddress: record.sellerAddress,
            settlementTokenAddress: record.settlementTokenAddress,
            totalAmount: record.totalAmount,
            updatedAt: toDate(record.updatedAt)
          },
          create: {
            id: `${record.chainId}:${record.agreementAddress}`,
            agreementAddress: record.agreementAddress,
            arbitratorAddress: record.arbitratorAddress,
            buyerAddress: record.buyerAddress,
            chainId: record.chainId,
            createdBlockHash: record.createdBlockHash,
            createdBlockNumber: BigInt(record.createdBlockNumber),
            createdLogIndex: record.createdLogIndex,
            createdTransactionHash: record.createdTransactionHash,
            dealId: record.dealId,
            dealVersionHash: record.dealVersionHash,
            factoryAddress: record.factoryAddress,
            feeVaultAddress: record.feeVaultAddress,
            initializedBlockHash: record.initializedBlockHash,
            initializedBlockNumber: BigInt(record.initializedBlockNumber),
            initializedLogIndex: record.initializedLogIndex,
            initializedTimestamp: toDate(record.initializedTimestamp),
            initializedTransactionHash: record.initializedTransactionHash,
            milestoneCount: record.milestoneCount,
            protocolConfigAddress: record.protocolConfigAddress,
            protocolFeeBps: record.protocolFeeBps,
            sellerAddress: record.sellerAddress,
            settlementTokenAddress: record.settlementTokenAddress,
            totalAmount: record.totalAmount,
            updatedAt: toDate(record.updatedAt)
          }
        });

        return mapEscrowAgreementRecord(persisted);
      }
    },
    feeVaultStates: {
      async findByChainIdAndAddress(chainId, feeVaultAddress) {
        const record = await database.feeVaultProjection.findUnique({
          where: { chainId_feeVaultAddress: { chainId, feeVaultAddress } }
        });

        return record ? mapFeeVaultStateRecord(record) : null;
      },
      async listByChainId(chainId) {
        const records = await database.feeVaultProjection.findMany({
          where: { chainId },
          orderBy: [{ feeVaultAddress: "asc" }]
        });

        return records.map(mapFeeVaultStateRecord);
      },
      async resetByChainId(chainId) {
        await database.feeVaultProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.feeVaultProjection.upsert({
          where: {
            chainId_feeVaultAddress: { chainId: record.chainId, feeVaultAddress: record.feeVaultAddress }
          },
          update: {
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            treasuryAddress: record.treasuryAddress,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          },
          create: {
            id: `${record.chainId}:${record.feeVaultAddress}`,
            chainId: record.chainId,
            feeVaultAddress: record.feeVaultAddress,
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            treasuryAddress: record.treasuryAddress,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          }
        });

        return mapFeeVaultStateRecord(persisted);
      }
    },
    indexedBlocks: {
      async deleteFromBlockNumber(chainId, fromBlockNumber) {
        await database.indexedBlock.deleteMany({
          where: { chainId, blockNumber: { gte: BigInt(fromBlockNumber) } }
        });
      },
      async findByChainIdAndBlockNumber(chainId, blockNumber) {
        const record = await database.indexedBlock.findUnique({
          where: { chainId_blockNumber: { chainId, blockNumber: BigInt(blockNumber) } }
        });

        return record ? mapIndexedBlockRecord(record) : null;
      },
      async listByChainId(chainId) {
        const records = await database.indexedBlock.findMany({
          where: { chainId },
          orderBy: [{ blockNumber: "asc" }]
        });

        return records.map(mapIndexedBlockRecord);
      },
      async upsertMany(records) {
        for (const record of records) {
          await database.indexedBlock.upsert({
            where: {
              chainId_blockNumber: {
                chainId: record.chainId,
                blockNumber: BigInt(record.blockNumber)
              }
            },
            update: {
              blockHash: record.blockHash,
              indexedAt: toDate(record.indexedAt),
              parentBlockHash: record.parentBlockHash,
              timestamp: toDate(record.timestamp)
            },
            create: {
              id: `${record.chainId}:${record.blockNumber}`,
              blockHash: record.blockHash,
              blockNumber: BigInt(record.blockNumber),
              chainId: record.chainId,
              indexedAt: toDate(record.indexedAt),
              parentBlockHash: record.parentBlockHash,
              timestamp: toDate(record.timestamp)
            }
          });
        }
      }
    },
    indexedContractEvents: {
      async deleteFromBlockNumber(chainId, fromBlockNumber) {
        await database.indexedContractEvent.deleteMany({
          where: { chainId, blockNumber: { gte: BigInt(fromBlockNumber) } }
        });
      },
      async listByChainId(chainId) {
        const records = await database.indexedContractEvent.findMany({
          where: { chainId },
          orderBy: [
            { blockNumber: "asc" },
            { transactionIndex: "asc" },
            { logIndex: "asc" }
          ]
        });

        return records.map(mapIndexedContractEventRecord);
      },
      async upsertMany(records) {
        for (const record of records) {
          await database.indexedContractEvent.upsert({
            where: {
              chainId_transactionHash_logIndex: {
                chainId: record.chainId,
                transactionHash: record.transactionHash,
                logIndex: record.logIndex
              }
            },
            update: {
              blockHash: record.blockHash,
              blockNumber: BigInt(record.blockNumber),
              blockTimestamp: toDate(record.blockTimestamp),
              contractAddress: record.contractAddress,
              contractName: record.contractName,
              data: toPrismaJson(record.data),
              eventName: record.eventName,
              indexedAt: toDate(record.indexedAt),
              topic0: record.topic0,
              topics: record.topics,
              transactionIndex: record.transactionIndex
            },
            create: {
              id: `${record.chainId}:${record.transactionHash}:${record.logIndex}`,
              blockHash: record.blockHash,
              blockNumber: BigInt(record.blockNumber),
              blockTimestamp: toDate(record.blockTimestamp),
              chainId: record.chainId,
              contractAddress: record.contractAddress,
              contractName: record.contractName,
              data: toPrismaJson(record.data),
              eventName: record.eventName,
              indexedAt: toDate(record.indexedAt),
              logIndex: record.logIndex,
              topic0: record.topic0,
              topics: record.topics,
              transactionHash: record.transactionHash,
              transactionIndex: record.transactionIndex
            }
          });
        }
      }
    },
    indexedTransactions: {
      async deleteFromBlockNumber(chainId, fromBlockNumber) {
        await database.indexedTransaction.deleteMany({
          where: { chainId, blockNumber: { gte: BigInt(fromBlockNumber) } }
        });
      },
      async upsertMany(records) {
        for (const record of records) {
          await database.indexedTransaction.upsert({
            where: {
              chainId_transactionHash: {
                chainId: record.chainId,
                transactionHash: record.transactionHash
              }
            },
            update: {
              blockHash: record.blockHash,
              blockNumber: BigInt(record.blockNumber),
              fromAddress: record.fromAddress,
              indexedAt: toDate(record.indexedAt),
              toAddress: record.toAddress,
              transactionIndex: record.transactionIndex
            },
            create: {
              id: `${record.chainId}:${record.transactionHash}`,
              blockHash: record.blockHash,
              blockNumber: BigInt(record.blockNumber),
              chainId: record.chainId,
              fromAddress: record.fromAddress,
              indexedAt: toDate(record.indexedAt),
              toAddress: record.toAddress,
              transactionHash: record.transactionHash,
              transactionIndex: record.transactionIndex
            }
          });
        }
      }
    },
    protocolConfigStates: {
      async findByChainIdAndAddress(chainId, protocolConfigAddress) {
        const record = await database.protocolConfigProjection.findUnique({
          where: { chainId_protocolConfigAddress: { chainId, protocolConfigAddress } }
        });

        return record ? mapProtocolConfigStateRecord(record) : null;
      },
      async listByChainId(chainId) {
        const records = await database.protocolConfigProjection.findMany({
          where: { chainId },
          orderBy: [{ protocolConfigAddress: "asc" }]
        });

        return records.map(mapProtocolConfigStateRecord);
      },
      async resetByChainId(chainId) {
        await database.protocolConfigProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.protocolConfigProjection.upsert({
          where: {
            chainId_protocolConfigAddress: {
              chainId: record.chainId,
              protocolConfigAddress: record.protocolConfigAddress
            }
          },
          update: {
            arbitratorRegistryAddress: record.arbitratorRegistryAddress,
            createEscrowPaused: record.createEscrowPaused,
            feeVaultAddress: record.feeVaultAddress,
            fundingPaused: record.fundingPaused,
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            protocolFeeBps: record.protocolFeeBps,
            tokenAllowlistAddress: record.tokenAllowlistAddress,
            treasuryAddress: record.treasuryAddress,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          },
          create: {
            id: `${record.chainId}:${record.protocolConfigAddress}`,
            arbitratorRegistryAddress: record.arbitratorRegistryAddress,
            chainId: record.chainId,
            createEscrowPaused: record.createEscrowPaused,
            feeVaultAddress: record.feeVaultAddress,
            fundingPaused: record.fundingPaused,
            owner: record.owner,
            pendingOwner: record.pendingOwner,
            protocolConfigAddress: record.protocolConfigAddress,
            protocolFeeBps: record.protocolFeeBps,
            tokenAllowlistAddress: record.tokenAllowlistAddress,
            treasuryAddress: record.treasuryAddress,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          }
        });

        return mapProtocolConfigStateRecord(persisted);
      }
    },
    tokenAllowlistEntries: {
      async listAllowedByChainIdAndContract(chainId, tokenAllowlistAddress) {
        const records = await database.tokenAllowlistEntryProjection.findMany({
          where: { chainId, isAllowed: true, tokenAllowlistAddress },
          orderBy: [{ token: "asc" }]
        });

        return records.map(mapTokenAllowlistEntryRecord);
      },
      async listByChainId(chainId) {
        const records = await database.tokenAllowlistEntryProjection.findMany({
          where: { chainId },
          orderBy: [{ tokenAllowlistAddress: "asc" }, { token: "asc" }]
        });

        return records.map(mapTokenAllowlistEntryRecord);
      },
      async resetByChainId(chainId) {
        await database.tokenAllowlistEntryProjection.deleteMany({ where: { chainId } });
      },
      async upsert(record) {
        const persisted = await database.tokenAllowlistEntryProjection.upsert({
          where: {
            chainId_tokenAllowlistAddress_token: {
              chainId: record.chainId,
              tokenAllowlistAddress: record.tokenAllowlistAddress,
              token: record.token
            }
          },
          update: {
            isAllowed: record.isAllowed,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          },
          create: {
            id: `${record.chainId}:${record.tokenAllowlistAddress}:${record.token}`,
            chainId: record.chainId,
            isAllowed: record.isAllowed,
            token: record.token,
            tokenAllowlistAddress: record.tokenAllowlistAddress,
            updatedAt: toDate(record.updatedAt),
            updatedBlockHash: record.updatedBlockHash,
            updatedBlockNumber: BigInt(record.updatedBlockNumber),
            updatedLogIndex: record.updatedLogIndex,
            updatedTransactionHash: record.updatedTransactionHash
          }
        });

        return mapTokenAllowlistEntryRecord(persisted);
      }
    }
  };
}

export function createPrismaRelease4Repositories(
  prisma: PrismaClient
): Release4Repositories {
  return buildRelease4Repositories(prisma);
}

export async function runInRelease4Transaction<T>(
  prisma: PrismaClient,
  callback: (repositories: Release4Repositories) => Promise<T>
): Promise<T> {
  return prisma.$transaction((transaction) => callback(buildRelease4Repositories(transaction)));
}
