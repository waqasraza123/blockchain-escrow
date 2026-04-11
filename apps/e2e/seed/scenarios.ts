import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { testWallets } from "../support/test-wallets";

export interface SeedResult {
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
  tenant: {
    displayName: string;
    entryHostname: string;
    hostedHostname: string;
    partnerAccountId: string;
    partnerSlug: string;
  };
}

export const seedIds = {
  billingFeeScheduleId: "e2e-billing-fee-schedule",
  billingPlanId: "e2e-billing-plan",
  counterpartyId: "e2e-counterparty",
  customerUserId: "e2e-customer-user",
  customerWalletId: "e2e-customer-wallet",
  dealVersionId: "e2e-deal-version",
  dealVersionMilestoneId: "e2e-deal-version-milestone",
  dealVersionPartyBuyerId: "e2e-deal-version-party-buyer",
  dealVersionPartySellerId: "e2e-deal-version-party-seller",
  draftDealBuyerPartyId: "e2e-draft-deal-party-buyer",
  draftDealId: "e2e-draft-deal",
  draftDealSellerPartyId: "e2e-draft-deal-party-seller",
  hostedSessionId: "e2e-hosted-session",
  operatorAccountId: "e2e-operator-account",
  operatorUserId: "e2e-operator-user",
  operatorWalletId: "e2e-operator-wallet",
  organizationId: "e2e-organization",
  organizationMemberId: "e2e-organization-member",
  partnerAccountId: "e2e-partner-account",
  partnerOrganizationLinkId: "e2e-partner-organization-link",
  tenantBillingAssignmentId: "e2e-tenant-billing-assignment",
  tenantEntryDomainId: "e2e-tenant-entry-domain",
  tenantHostedDomainId: "e2e-tenant-hosted-domain",
  tenantTierId: "e2e-billing-tier"
} as const;

const customerAddress = testWallets.customer.address.toLowerCase();
const operatorAddress = testWallets.operator.address.toLowerCase();

const entryHostname = "tenant-a.lvh.me";
const hostedHostname = "hosted-a.lvh.me";
const launchToken = "launch-token-e2e-review";
const partnerSlug = "tenant-a";
const tenantDisplayName = "Tenant A Embedded";

function now(): Date {
  return new Date("2026-04-11T09:00:00.000Z");
}

function plusHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function seedScenarios(prisma: PrismaClient): Promise<SeedResult> {
  const createdAt = now();
  const updatedAt = createdAt;
  const expiresAt = plusHours(createdAt, 8);

  await prisma.user.createMany({
    data: [
      {
        createdAt,
        id: seedIds.customerUserId,
        updatedAt
      },
      {
        createdAt,
        id: seedIds.operatorUserId,
        updatedAt
      }
    ]
  });

  await prisma.wallet.createMany({
    data: [
      {
        address: customerAddress,
        chainId: 84532,
        createdAt,
        id: seedIds.customerWalletId,
        isPrimary: true,
        updatedAt,
        userId: seedIds.customerUserId
      },
      {
        address: operatorAddress,
        chainId: 84532,
        createdAt,
        id: seedIds.operatorWalletId,
        isPrimary: true,
        updatedAt,
        userId: seedIds.operatorUserId
      }
    ]
  });

  await prisma.organization.create({
    data: {
      createdAt,
      createdByUserId: seedIds.customerUserId,
      id: seedIds.organizationId,
      name: "E2E Customer Org",
      slug: "e2e-customer-org",
      updatedAt
    }
  });

  await prisma.organizationMember.create({
    data: {
      createdAt,
      id: seedIds.organizationMemberId,
      organizationId: seedIds.organizationId,
      role: "OWNER",
      updatedAt,
      userId: seedIds.customerUserId
    }
  });

  await prisma.operatorAccount.create({
    data: {
      active: true,
      createdAt,
      id: seedIds.operatorAccountId,
      role: "SUPER_ADMIN",
      updatedAt,
      userId: seedIds.operatorUserId,
      walletId: seedIds.operatorWalletId
    }
  });

  await prisma.counterparty.create({
    data: {
      contactEmail: "counterparty@example.com",
      createdAt,
      createdByUserId: seedIds.customerUserId,
      id: seedIds.counterpartyId,
      legalName: "Counterparty LLC",
      name: "Counterparty LLC",
      normalizedName: "counterparty llc",
      organizationId: seedIds.organizationId,
      updatedAt
    }
  });

  await prisma.draftDeal.create({
    data: {
      createdAt,
      createdByUserId: seedIds.customerUserId,
      id: seedIds.draftDealId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      state: "DRAFT",
      summary: "E2E smoke draft",
      title: "Q2 Implementation Escrow",
      updatedAt
    }
  });

  await prisma.draftDealParty.createMany({
    data: [
      {
        createdAt,
        draftDealId: seedIds.draftDealId,
        id: seedIds.draftDealBuyerPartyId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION",
        updatedAt
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        draftDealId: seedIds.draftDealId,
        id: seedIds.draftDealSellerPartyId,
        role: "SELLER",
        subjectType: "COUNTERPARTY",
        updatedAt
      }
    ]
  });

  await prisma.dealVersion.create({
    data: {
      bodyMarkdown: "Seeded e2e deal body.",
      createdAt,
      createdByUserId: seedIds.customerUserId,
      draftDealId: seedIds.draftDealId,
      id: seedIds.dealVersionId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      summary: "Seeded e2e version",
      title: "Q2 Implementation Escrow v1",
      versionNumber: 1
    }
  });

  await prisma.dealVersionParty.createMany({
    data: [
      {
        createdAt,
        dealVersionId: seedIds.dealVersionId,
        displayName: "E2E Customer Org",
        id: seedIds.dealVersionPartyBuyerId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION"
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        dealVersionId: seedIds.dealVersionId,
        displayName: "Counterparty LLC",
        id: seedIds.dealVersionPartySellerId,
        role: "SELLER",
        subjectType: "COUNTERPARTY"
      }
    ]
  });

  await prisma.dealVersionMilestone.create({
    data: {
      amountMinor: "2500000",
      createdAt,
      dealVersionId: seedIds.dealVersionId,
      description: "Delivery and acceptance",
      dueAt: plusHours(createdAt, 72),
      id: seedIds.dealVersionMilestoneId,
      position: 1,
      title: "Delivery milestone"
    }
  });

  await prisma.partnerAccount.create({
    data: {
      createdAt,
      id: seedIds.partnerAccountId,
      metadata: {
        plan: "embedded"
      },
      name: "Tenant A Partner",
      slug: partnerSlug,
      status: "ACTIVE",
      updatedAt
    }
  });

  await prisma.partnerTenantSettings.create({
    data: {
      accentColorHex: "#7a2e1a",
      backgroundColorHex: "#f3e9d7",
      createdAt,
      displayName: tenantDisplayName,
      legalName: "Tenant A Partner LLC",
      partnerAccountId: seedIds.partnerAccountId,
      primaryColorHex: "#d9c49a",
      privacyPolicyUrl: "https://tenant-a.example.com/privacy",
      supportEmail: "support@tenant-a.example.com",
      supportUrl: "https://tenant-a.example.com/support",
      termsOfServiceUrl: "https://tenant-a.example.com/terms",
      textColorHex: "#1a1a1a",
      updatedAt
    }
  });

  await prisma.tenantDomain.createMany({
    data: [
      {
        createdAt,
        hostname: entryHostname,
        id: seedIds.tenantEntryDomainId,
        partnerAccountId: seedIds.partnerAccountId,
        status: "ACTIVE",
        surface: "ENTRYPOINT",
        updatedAt,
        verifiedAt: createdAt
      },
      {
        createdAt,
        hostname: hostedHostname,
        id: seedIds.tenantHostedDomainId,
        partnerAccountId: seedIds.partnerAccountId,
        status: "ACTIVE",
        surface: "HOSTED",
        updatedAt,
        verifiedAt: createdAt
      }
    ]
  });

  await prisma.partnerOrganizationLink.create({
    data: {
      actingUserId: seedIds.customerUserId,
      actingWalletId: seedIds.customerWalletId,
      createdAt,
      externalReference: "tenant-a-link",
      id: seedIds.partnerOrganizationLinkId,
      organizationId: seedIds.organizationId,
      partnerAccountId: seedIds.partnerAccountId,
      status: "ACTIVE",
      updatedAt
    }
  });

  await prisma.partnerHostedSession.create({
    data: {
      activatedAt: null,
      completedAt: null,
      createdAt,
      dealMilestoneDisputeId: null,
      dealVersionId: seedIds.dealVersionId,
      dealVersionMilestoneId: seedIds.dealVersionMilestoneId,
      draftDealId: seedIds.draftDealId,
      expiresAt,
      id: seedIds.hostedSessionId,
      launchTokenHash: createHash("sha256").update(launchToken).digest("hex"),
      partnerApiKeyId: null,
      partnerOrganizationLinkId: seedIds.partnerOrganizationLinkId,
      partnerReferenceId: "tenant-a-review",
      status: "PENDING",
      type: "DEAL_STATUS_REVIEW",
      updatedAt
    }
  });

  await prisma.billingPlan.create({
    data: {
      baseMonthlyFeeMinor: "15000",
      code: "EMBEDDED_STARTER",
      createdAt,
      currency: "USD",
      displayName: "Embedded Starter",
      id: seedIds.billingPlanId,
      invoiceDueDays: 15,
      status: "ACTIVE",
      updatedAt
    }
  });

  await prisma.billingFeeSchedule.create({
    data: {
      billingPlanId: seedIds.billingPlanId,
      createdAt,
      effectiveFrom: createdAt,
      id: seedIds.billingFeeScheduleId,
      updatedAt
    }
  });

  await prisma.billingFeeScheduleTier.create({
    data: {
      billingFeeScheduleId: seedIds.billingFeeScheduleId,
      id: seedIds.tenantTierId,
      includedUnits: "100",
      metric: "PARTNER_API_WRITE_REQUEST",
      position: 1,
      startsAtUnit: "101",
      unitPriceMinor: "25",
      upToUnit: "1000"
    }
  });

  await prisma.tenantBillingPlanAssignment.create({
    data: {
      billingFeeScheduleId: seedIds.billingFeeScheduleId,
      billingPlanId: seedIds.billingPlanId,
      createdAt,
      effectiveFrom: createdAt,
      id: seedIds.tenantBillingAssignmentId,
      partnerAccountId: seedIds.partnerAccountId
    }
  });

  return {
    billing: {
      billingFeeScheduleId: seedIds.billingFeeScheduleId,
      billingPlanId: seedIds.billingPlanId
    },
    customer: {
      dealVersionId: seedIds.dealVersionId,
      draftDealId: seedIds.draftDealId,
      organizationId: seedIds.organizationId,
      walletId: seedIds.customerWalletId
    },
    hosted: {
      launchToken,
      sessionId: seedIds.hostedSessionId
    },
    operator: {
      operatorAccountId: seedIds.operatorAccountId,
      walletId: seedIds.operatorWalletId
    },
    tenant: {
      displayName: tenantDisplayName,
      entryHostname,
      hostedHostname,
      partnerAccountId: seedIds.partnerAccountId,
      partnerSlug
    }
  };
}
