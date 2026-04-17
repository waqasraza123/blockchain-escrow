import type {
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealRecord,
  FileRecord
} from "@blockchain-escrow/db";
import {
  assertProductionLaunchManifest,
  type JsonObject,
  isProductionLaunchMode
} from "@blockchain-escrow/shared";
import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import { keccak256, stringToHex } from "viem";

export { buildCanonicalDealId } from "@blockchain-escrow/shared";

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

export const counterpartyMilestoneSubmissionPrimaryType =
  "CounterpartyDealMilestoneSubmission";
export const counterpartyMilestoneSubmissionTypes = {
  CounterpartyDealMilestoneSubmission: [
    { name: "organizationId", type: "string" },
    { name: "draftDealId", type: "string" },
    { name: "dealVersionId", type: "string" },
    { name: "dealVersionMilestoneId", type: "string" },
    { name: "dealId", type: "bytes32" },
    { name: "dealVersionHash", type: "bytes32" },
    { name: "statementHash", type: "bytes32" },
    { name: "submissionNumber", type: "uint256" },
    { name: "intent", type: "string" }
  ]
} as const;

export const milestoneDisputeDecisionPrimaryType = "DealMilestoneDisputeDecision";
export const milestoneDisputeDecisionTypes = {
  DealMilestoneDisputeDecision: [
    { name: "organizationId", type: "string" },
    { name: "draftDealId", type: "string" },
    { name: "dealVersionId", type: "string" },
    { name: "dealVersionMilestoneId", type: "string" },
    { name: "dealMilestoneSubmissionId", type: "string" },
    { name: "dealMilestoneReviewId", type: "string" },
    { name: "dealMilestoneDisputeId", type: "string" },
    { name: "dealId", type: "bytes32" },
    { name: "dealVersionHash", type: "bytes32" },
    { name: "kind", type: "string" },
    { name: "statementHash", type: "bytes32" },
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
  const launchMode = isProductionLaunchMode(process.env.APP_LAUNCH_MODE);

  if (!raw) {
    if (launchMode) {
      throw new Error("BASE_CHAIN_ID must be configured when APP_LAUNCH_MODE=production.");
    }

    return DEFAULT_CHAIN_ID;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    if (launchMode) {
      throw new Error(
        `Invalid BASE_CHAIN_ID: expected a positive integer, received "${raw}".`
      );
    }

    return DEFAULT_CHAIN_ID;
  }

  if (launchMode) {
    const manifest = getDeploymentManifestByChainId(parsed);

    if (!manifest) {
      throw new Error(`No deployment manifest found for BASE_CHAIN_ID=${parsed}.`);
    }

    assertProductionLaunchManifest(manifest, parsed, "BASE_CHAIN_ID");
  }

  return parsed;
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

export function buildCounterpartyMilestoneSubmissionTypedData(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  dealVersionMilestoneId: string,
  dealId: `0x${string}`,
  dealVersionHash: `0x${string}`,
  submissionNumber: number,
  statementMarkdown: string
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
      dealVersionMilestoneId,
      draftDealId: draft.id,
      intent: "COUNTERPARTY_SUBMIT_DEAL_MILESTONE",
      organizationId: draft.organizationId,
      statementHash: keccak256(stringToHex(statementMarkdown)),
      submissionNumber: submissionNumber.toString()
    },
    primaryType: counterpartyMilestoneSubmissionPrimaryType,
    types: counterpartyMilestoneSubmissionTypes as unknown as JsonObject
  };
}

export function buildMilestoneDisputeDecisionTypedData(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  input: {
    dealId: `0x${string}`;
    dealMilestoneDisputeId: string;
    dealMilestoneReviewId: string;
    dealMilestoneSubmissionId: string;
    dealVersionHash: `0x${string}`;
    dealVersionMilestoneId: string;
    kind: "RELEASE" | "REFUND";
    statementMarkdown: string;
  }
): JsonObject {
  return {
    domain: {
      chainId: normalizeApiChainId(),
      name: "Blockchain Escrow",
      version: "1"
    },
    message: {
      dealId: input.dealId,
      dealMilestoneDisputeId: input.dealMilestoneDisputeId,
      dealMilestoneReviewId: input.dealMilestoneReviewId,
      dealMilestoneSubmissionId: input.dealMilestoneSubmissionId,
      dealVersionHash: input.dealVersionHash,
      dealVersionId: version.id,
      dealVersionMilestoneId: input.dealVersionMilestoneId,
      draftDealId: draft.id,
      intent: "ARBITRATOR_DECIDE_DEAL_MILESTONE_DISPUTE",
      kind: input.kind,
      organizationId: draft.organizationId,
      statementHash: keccak256(stringToHex(input.statementMarkdown))
    },
    primaryType: milestoneDisputeDecisionPrimaryType,
    types: milestoneDisputeDecisionTypes as unknown as JsonObject
  };
}
