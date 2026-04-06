import {
  getContractArtifact,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  HexString,
  IndexedContractEventSummary,
  IndexedContractName,
  IndexedEventName,
  IsoTimestamp,
  JsonObject,
  JsonValue,
  WalletAddress
} from "@blockchain-escrow/shared";
import { decodeEventLog, type Abi, type Log, type TransactionReceipt } from "viem";

const trackedContractNames = [
  "TokenAllowlist",
  "ArbitratorRegistry",
  "ProtocolConfig",
  "FeeVault",
  "EscrowFactory"
] as const satisfies readonly IndexedContractName[];

export interface TrackedContracts {
  readonly addressByContractName: ReadonlyMap<IndexedContractName, WalletAddress>;
  readonly baseAddresses: readonly WalletAddress[];
}

function normalizeHex(value: string): HexString {
  return value.toLowerCase() as HexString;
}

function normalizeAddress(value: string): WalletAddress {
  return value.toLowerCase() as WalletAddress;
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return typeof value === "string" && value.startsWith("0x")
      ? value.toLowerCase()
      : value;
  }

  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (typeof value === "object") {
    const normalized: JsonObject = {};

    for (const [key, entry] of Object.entries(value)) {
      normalized[key] = normalizeJsonValue(entry);
    }

    return normalized;
  }

  throw new Error(`Unsupported decoded event value: ${String(value)}`);
}

function normalizeEventData(args: unknown): JsonObject {
  const normalized = normalizeJsonValue(args);

  if (!normalized || Array.isArray(normalized) || typeof normalized !== "object") {
    throw new Error("Expected decoded event args to be an object");
  }

  return normalized;
}

function requireLogField<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`Missing ${label} on indexed log`);
  }

  return value;
}

function decodeLogWithContract(
  contractName: IndexedContractName,
  contractAddress: WalletAddress,
  chainId: number,
  log: Log,
  blockTimestamp: IsoTimestamp,
  indexedAt: IsoTimestamp
): IndexedContractEventSummary {
  const abi = getContractArtifact(contractName).abi as Abi;
  const decoded = decodeEventLog({
    abi,
    data: requireLogField(log.data, "log data"),
    strict: false,
    topics: requireLogField(log.topics, "log topics")
  });

  if (!decoded.eventName) {
    throw new Error(`Unable to decode event for ${contractName} at ${contractAddress}`);
  }

  return {
    blockHash: normalizeHex(requireLogField(log.blockHash, "block hash")),
    blockNumber: requireLogField(log.blockNumber, "block number").toString(),
    blockTimestamp,
    chainId,
    contractAddress,
    contractName,
    data: normalizeEventData(decoded.args),
    eventName: decoded.eventName as unknown as IndexedEventName,
    indexedAt,
    logIndex: requireLogField(log.logIndex, "log index"),
    topic0: normalizeHex(requireLogField(log.topics[0], "topic0")),
    topics: requireLogField(log.topics, "log topics").map((topic) => normalizeHex(topic)),
    transactionHash: normalizeHex(requireLogField(log.transactionHash, "transaction hash")),
    transactionIndex: requireLogField(log.transactionIndex, "transaction index")
  };
}

export function getTrackedContracts(chainId: number): TrackedContracts {
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest) {
    throw new Error(`No deployment manifest found for chain ${chainId}`);
  }

  const entries = trackedContractNames.map((contractName) => {
    const address = manifest.contracts[contractName];

    if (!address) {
      throw new Error(`Missing ${contractName} address in deployment manifest for chain ${chainId}`);
    }

    return [contractName, normalizeAddress(address)] as const;
  });

  return {
    addressByContractName: new Map(entries),
    baseAddresses: entries.map(([, address]) => address)
  };
}

export function decodeTrackedContractLog(
  chainId: number,
  trackedContracts: TrackedContracts,
  log: Log,
  blockTimestamp: IsoTimestamp,
  indexedAt: IsoTimestamp
): IndexedContractEventSummary {
  const contractAddress = normalizeAddress(requireLogField(log.address, "contract address"));
  const contractName = [...trackedContracts.addressByContractName.entries()].find(
    ([, address]) => address === contractAddress
  )?.[0];

  if (!contractName) {
    throw new Error(`Received log for untracked contract address ${contractAddress}`);
  }

  return decodeLogWithContract(
    contractName,
    contractAddress,
    chainId,
    log,
    blockTimestamp,
    indexedAt
  );
}

export function decodeAgreementReceiptEventsFromReceipt(
  chainId: number,
  receipt: TransactionReceipt,
  agreementAddresses: ReadonlySet<WalletAddress>,
  indexedAt: IsoTimestamp,
  blockTimestamp: IsoTimestamp
): IndexedContractEventSummary[] {
  return receipt.logs
    .filter((log) => agreementAddresses.has(normalizeAddress(log.address)))
    .map((log) =>
      decodeLogWithContract(
        "EscrowAgreement",
        normalizeAddress(log.address),
        chainId,
        log,
        blockTimestamp,
        indexedAt
      )
    )
    .filter(
      (event) =>
        event.eventName === "AgreementInitialized" ||
        event.eventName === "AgreementFunded"
    );
}
