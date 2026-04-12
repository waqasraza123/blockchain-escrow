import fs from "node:fs";

import { seedOutputPath } from "./paths";

export interface SeedMetadata {
  billing: {
    billingFeeScheduleId: string;
    billingPlanId: string;
  };
  customer: {
    dealVersionId: string;
    draftDealId: string;
    organizationId: string;
    walletId: string;
  };
  hosted: {
    launchToken: string;
    sessionId: string;
  };
  operator: {
    operatorAccountId: string;
    walletId: string;
  };
  settlementPending: {
    dealMilestoneSettlementRequestId: string;
    dealVersionId: string;
    draftDealId: string;
  };
  settlementReady: {
    dealMilestoneSettlementRequestId: string;
    dealVersionId: string;
    dealVersionMilestoneId: string;
    draftDealId: string;
  };
  tenant: {
    displayName: string;
    entryHostname: string;
    hostedHostname: string;
    partnerAccountId: string;
    partnerSlug: string;
  };
}

export function readSeedMetadata(): SeedMetadata {
  if (!fs.existsSync(seedOutputPath)) {
    throw new Error(
      `Seed metadata not found at ${seedOutputPath}. Run the e2e seed step first.`
    );
  }

  return JSON.parse(fs.readFileSync(seedOutputPath, "utf8")) as SeedMetadata;
}
