import type {
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealRecord,
  FileRecord
} from "@blockchain-escrow/db";
import type { JsonObject } from "@blockchain-escrow/shared";
import { keccak256, stringToHex } from "viem";

const DEFAULT_CHAIN_ID = 84532;

export const counterpartyAcceptancePrimaryType = "CounterpartyDealVersionAcceptance";
export const counterpartyAcceptanceTypes = {
  CounterpartyDealVersionAcceptance: [
    { name: "organizationId", type: "string" },
    { name: "draftDealId", type: "string" },
    { name: "dealVersionId", type: "string" },
    { name: "dealId", type: "bytes32" },
    { name: "dealVersionHash", type: "bytes32" },
    { name: "intent", type: "string" }
  ]
} as const;

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)])
    );
  }

  return value;
}

export function normalizeApiChainId(): number {
  const raw = process.env.BASE_CHAIN_ID;

  if (!raw) {
    return DEFAULT_CHAIN_ID;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_CHAIN_ID;
}

export function buildCanonicalDealId(
  organizationId: string,
  draftDealId: string
): `0x${string}` {
  return keccak256(
    stringToHex(`blockchain-escrow:deal:${organizationId}:${draftDealId}`)
  );
}

export function buildCanonicalDealVersionHash(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  parties: readonly DealVersionPartyRecord[],
  milestones: readonly DealVersionMilestoneRecord[],
  files: readonly FileRecord[]
): `0x${string}` {
  return keccak256(
    stringToHex(
      JSON.stringify(
        sortObjectKeys({
          bodyMarkdown: version.bodyMarkdown,
          draftDealId: draft.id,
          files: files
            .map((file) => ({
              id: file.id,
              mediaType: file.mediaType,
              originalFilename: file.originalFilename,
              sha256Hex: file.sha256Hex
            }))
            .sort((left, right) => left.id.localeCompare(right.id)),
          milestones: milestones
            .map((milestone) => ({
              amountMinor: milestone.amountMinor,
              description: milestone.description,
              dueAt: milestone.dueAt,
              position: milestone.position,
              title: milestone.title
            }))
            .sort((left, right) => left.position - right.position),
          organizationId: draft.organizationId,
          parties: parties
            .map((party) => ({
              counterpartyId: party.counterpartyId,
              displayName: party.displayName,
              organizationId: party.organizationId,
              role: party.role,
              subjectType: party.subjectType
            }))
            .sort((left, right) => left.role.localeCompare(right.role)),
          settlementCurrency: version.settlementCurrency,
          summary: version.summary,
          templateId: version.templateId,
          title: version.title,
          versionId: version.id,
          versionNumber: version.versionNumber
        })
      )
    )
  );
}

export function buildCounterpartyAcceptanceTypedData(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  dealId: `0x${string}`,
  dealVersionHash: `0x${string}`
): JsonObject {
  return {
    domain: {
      chainId: normalizeApiChainId(),
      name: "Blockchain Escrow",
      version: "1"
    },
    message: {
      dealId,
      dealVersionHash,
      dealVersionId: version.id,
      draftDealId: draft.id,
      intent: "COUNTERPARTY_ACCEPT_DEAL_VERSION",
      organizationId: draft.organizationId
    },
    primaryType: counterpartyAcceptancePrimaryType,
    types: counterpartyAcceptanceTypes as unknown as JsonObject
  };
}
