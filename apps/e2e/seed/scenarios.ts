import { createHash } from "node:crypto";

import { Prisma, type PrismaClient } from "@prisma/client";

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
  settlementAgreementProjectionId: "e2e-settlement-agreement-projection",
  settlementPendingAgreementProjectionId: "e2e-settlement-pending-agreement-projection",
  settlementPendingExecutionTransactionId: "e2e-settlement-pending-execution-transaction",
  settlementPendingReviewId: "e2e-settlement-pending-review",
  settlementPendingSettlementPreparationId: "e2e-settlement-pending-preparation",
  settlementPendingSettlementRequestId: "e2e-settlement-pending-request",
  settlementPendingSubmissionId: "e2e-settlement-pending-submission",
  settlementPendingVersionId: "e2e-settlement-pending-deal-version",
  settlementPendingVersionMilestoneId: "e2e-settlement-pending-deal-version-milestone",
  settlementPendingVersionPartyBuyerId: "e2e-settlement-pending-deal-version-party-buyer",
  settlementPendingVersionPartySellerId: "e2e-settlement-pending-deal-version-party-seller",
  settlementPendingDraftBuyerPartyId: "e2e-settlement-pending-draft-deal-party-buyer",
  settlementPendingDraftDealId: "e2e-settlement-pending-draft-deal",
  settlementPendingDraftSellerPartyId: "e2e-settlement-pending-draft-deal-party-seller",
  settlementDealMilestoneReviewId: "e2e-settlement-review",
  settlementDealMilestoneSettlementPreparationId: "e2e-settlement-preparation",
  settlementDealMilestoneSettlementRequestId: "e2e-settlement-request",
  settlementDealMilestoneSubmissionId: "e2e-settlement-submission",
  settlementDealVersionId: "e2e-settlement-deal-version",
  settlementDealVersionMilestoneId: "e2e-settlement-deal-version-milestone",
  settlementDealVersionPartyBuyerId: "e2e-settlement-deal-version-party-buyer",
  settlementDealVersionPartySellerId: "e2e-settlement-deal-version-party-seller",
  settlementDraftDealBuyerPartyId: "e2e-settlement-draft-deal-party-buyer",
  settlementDraftDealId: "e2e-settlement-draft-deal",
  settlementDraftDealSellerPartyId: "e2e-settlement-draft-deal-party-seller",
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

  await prisma.draftDeal.create({
    data: {
      createdAt,
      createdByUserId: seedIds.customerUserId,
      id: seedIds.settlementDraftDealId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      state: "ACTIVE",
      summary: "Settlement-ready seeded draft",
      title: "Settlement Ready Escrow",
      updatedAt
    }
  });

  await prisma.draftDealParty.createMany({
    data: [
      {
        createdAt,
        draftDealId: seedIds.settlementDraftDealId,
        id: seedIds.settlementDraftDealBuyerPartyId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION",
        updatedAt
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        draftDealId: seedIds.settlementDraftDealId,
        id: seedIds.settlementDraftDealSellerPartyId,
        role: "SELLER",
        subjectType: "COUNTERPARTY",
        updatedAt,
        walletAddress: "0x3333333333333333333333333333333333333333"
      }
    ]
  });

  await prisma.dealVersion.create({
    data: {
      bodyMarkdown: "Settlement-ready seeded e2e deal body.",
      createdAt,
      createdByUserId: seedIds.customerUserId,
      draftDealId: seedIds.settlementDraftDealId,
      id: seedIds.settlementDealVersionId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      summary: "Settlement-ready seeded e2e version",
      title: "Settlement Ready Escrow v1",
      versionNumber: 1
    }
  });

  await prisma.dealVersionParty.createMany({
    data: [
      {
        createdAt,
        dealVersionId: seedIds.settlementDealVersionId,
        displayName: "E2E Customer Org",
        id: seedIds.settlementDealVersionPartyBuyerId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION"
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        dealVersionId: seedIds.settlementDealVersionId,
        displayName: "Counterparty LLC",
        id: seedIds.settlementDealVersionPartySellerId,
        role: "SELLER",
        subjectType: "COUNTERPARTY"
      }
    ]
  });

  await prisma.dealVersionMilestone.create({
    data: {
      amountMinor: "1500000",
      createdAt,
      dealVersionId: seedIds.settlementDealVersionId,
      description: "Settlement execution milestone",
      dueAt: plusHours(createdAt, 96),
      id: seedIds.settlementDealVersionMilestoneId,
      position: 1,
      title: "Settlement milestone"
    }
  });

  await prisma.dealMilestoneSubmission.create({
    data: {
      dealVersionId: seedIds.settlementDealVersionId,
      dealVersionMilestoneId: seedIds.settlementDealVersionMilestoneId,
      draftDealId: seedIds.settlementDraftDealId,
      id: seedIds.settlementDealMilestoneSubmissionId,
      organizationId: seedIds.organizationId,
      reviewDeadlineAt: plusHours(createdAt, 120),
      scheme: null,
      signature: null,
      statementMarkdown: "Settlement milestone delivered.",
      submissionNumber: 1,
      submittedAt: plusHours(createdAt, 1),
      submittedByCounterpartyId: seedIds.counterpartyId,
      submittedByPartyRole: "SELLER",
      submittedByPartySubjectType: "COUNTERPARTY",
      submittedByUserId: null,
      typedData: Prisma.JsonNull
    }
  });

  await prisma.dealMilestoneReview.create({
    data: {
      decision: "APPROVED",
      dealMilestoneSubmissionId: seedIds.settlementDealMilestoneSubmissionId,
      dealVersionId: seedIds.settlementDealVersionId,
      dealVersionMilestoneId: seedIds.settlementDealVersionMilestoneId,
      draftDealId: seedIds.settlementDraftDealId,
      id: seedIds.settlementDealMilestoneReviewId,
      organizationId: seedIds.organizationId,
      reviewedAt: plusHours(createdAt, 2),
      reviewedByUserId: seedIds.customerUserId,
      statementMarkdown: "Release the settled milestone."
    }
  });

  await prisma.dealMilestoneSettlementRequest.create({
    data: {
      dealMilestoneReviewId: seedIds.settlementDealMilestoneReviewId,
      dealMilestoneSubmissionId: seedIds.settlementDealMilestoneSubmissionId,
      dealVersionId: seedIds.settlementDealVersionId,
      dealVersionMilestoneId: seedIds.settlementDealVersionMilestoneId,
      draftDealId: seedIds.settlementDraftDealId,
      id: seedIds.settlementDealMilestoneSettlementRequestId,
      kind: "RELEASE",
      organizationId: seedIds.organizationId,
      requestedAt: plusHours(createdAt, 3),
      requestedByArbitratorAddress: null,
      requestedByUserId: seedIds.customerUserId,
      source: "BUYER_REVIEW",
      statementMarkdown: "Release the milestone payout."
    }
  });

  await prisma.dealMilestoneSettlementPreparation.create({
    data: {
      agreementAddress: "0x7777777777777777777777777777777777777777",
      chainId: 84532,
      dealId: "e2e-settlement-deal",
      dealMilestoneReviewId: seedIds.settlementDealMilestoneReviewId,
      dealMilestoneSettlementRequestId: seedIds.settlementDealMilestoneSettlementRequestId,
      dealMilestoneSubmissionId: seedIds.settlementDealMilestoneSubmissionId,
      dealVersionHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      dealVersionId: seedIds.settlementDealVersionId,
      dealVersionMilestoneId: seedIds.settlementDealVersionMilestoneId,
      draftDealId: seedIds.settlementDraftDealId,
      id: seedIds.settlementDealMilestoneSettlementPreparationId,
      kind: "RELEASE",
      milestoneAmountMinor: "1500000",
      milestonePosition: 1,
      organizationId: seedIds.organizationId,
      preparedAt: plusHours(createdAt, 4),
      settlementTokenAddress: "0x1111111111111111111111111111111111111111",
      totalAmount: "1500000"
    }
  });

  await prisma.escrowAgreementProjection.create({
    data: {
      agreementAddress: "0x7777777777777777777777777777777777777777",
      arbitratorAddress: null,
      buyerAddress: customerAddress,
      chainId: 84532,
      createdBlockHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      createdBlockNumber: 10n,
      createdLogIndex: 0,
      createdTransactionHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      dealId: "e2e-settlement-deal",
      dealVersionHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      factoryAddress: "0x8888888888888888888888888888888888888888",
      feeVaultAddress: "0x9999999999999999999999999999999999999999",
      funded: true,
      fundedBlockHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      fundedBlockNumber: 11n,
      fundedLogIndex: 1,
      fundedPayerAddress: customerAddress,
      fundedTimestamp: plusHours(createdAt, 1),
      fundedTransactionHash:
        "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      id: seedIds.settlementAgreementProjectionId,
      initializedBlockHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      initializedBlockNumber: 10n,
      initializedLogIndex: 1,
      initializedTimestamp: createdAt,
      initializedTransactionHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      milestoneCount: 1,
      protocolConfigAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocolFeeBps: 100,
      sellerAddress: "0x3333333333333333333333333333333333333333",
      settlementTokenAddress: "0x1111111111111111111111111111111111111111",
      totalAmount: "1500000",
      updatedAt
    }
  });

  await prisma.draftDeal.create({
    data: {
      createdAt,
      createdByUserId: seedIds.customerUserId,
      id: seedIds.settlementPendingDraftDealId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      state: "ACTIVE",
      summary: "Settlement-pending seeded draft",
      title: "Settlement Pending Escrow",
      updatedAt
    }
  });

  await prisma.draftDealParty.createMany({
    data: [
      {
        createdAt,
        draftDealId: seedIds.settlementPendingDraftDealId,
        id: seedIds.settlementPendingDraftBuyerPartyId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION",
        updatedAt
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        draftDealId: seedIds.settlementPendingDraftDealId,
        id: seedIds.settlementPendingDraftSellerPartyId,
        role: "SELLER",
        subjectType: "COUNTERPARTY",
        updatedAt,
        walletAddress: "0x3333333333333333333333333333333333333333"
      }
    ]
  });

  await prisma.dealVersion.create({
    data: {
      bodyMarkdown: "Settlement-pending seeded e2e deal body.",
      createdAt,
      createdByUserId: seedIds.customerUserId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingVersionId,
      organizationId: seedIds.organizationId,
      settlementCurrency: "USDC",
      summary: "Settlement-pending seeded e2e version",
      title: "Settlement Pending Escrow v1",
      versionNumber: 1
    }
  });

  await prisma.dealVersionParty.createMany({
    data: [
      {
        createdAt,
        dealVersionId: seedIds.settlementPendingVersionId,
        displayName: "E2E Customer Org",
        id: seedIds.settlementPendingVersionPartyBuyerId,
        organizationId: seedIds.organizationId,
        role: "BUYER",
        subjectType: "ORGANIZATION"
      },
      {
        counterpartyId: seedIds.counterpartyId,
        createdAt,
        dealVersionId: seedIds.settlementPendingVersionId,
        displayName: "Counterparty LLC",
        id: seedIds.settlementPendingVersionPartySellerId,
        role: "SELLER",
        subjectType: "COUNTERPARTY"
      }
    ]
  });

  await prisma.dealVersionMilestone.create({
    data: {
      amountMinor: "1750000",
      createdAt,
      dealVersionId: seedIds.settlementPendingVersionId,
      description: "Pending settlement execution milestone",
      dueAt: plusHours(createdAt, 108),
      id: seedIds.settlementPendingVersionMilestoneId,
      position: 1,
      title: "Pending settlement milestone"
    }
  });

  await prisma.dealMilestoneSubmission.create({
    data: {
      dealVersionId: seedIds.settlementPendingVersionId,
      dealVersionMilestoneId: seedIds.settlementPendingVersionMilestoneId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingSubmissionId,
      organizationId: seedIds.organizationId,
      reviewDeadlineAt: plusHours(createdAt, 132),
      scheme: null,
      signature: null,
      statementMarkdown: "Pending settlement milestone delivered.",
      submissionNumber: 1,
      submittedAt: plusHours(createdAt, 1),
      submittedByCounterpartyId: seedIds.counterpartyId,
      submittedByPartyRole: "SELLER",
      submittedByPartySubjectType: "COUNTERPARTY",
      submittedByUserId: null,
      typedData: Prisma.JsonNull
    }
  });

  await prisma.dealMilestoneReview.create({
    data: {
      decision: "APPROVED",
      dealMilestoneSubmissionId: seedIds.settlementPendingSubmissionId,
      dealVersionId: seedIds.settlementPendingVersionId,
      dealVersionMilestoneId: seedIds.settlementPendingVersionMilestoneId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingReviewId,
      organizationId: seedIds.organizationId,
      reviewedAt: plusHours(createdAt, 2),
      reviewedByUserId: seedIds.customerUserId,
      statementMarkdown: "Release the pending milestone."
    }
  });

  await prisma.dealMilestoneSettlementRequest.create({
    data: {
      dealMilestoneReviewId: seedIds.settlementPendingReviewId,
      dealMilestoneSubmissionId: seedIds.settlementPendingSubmissionId,
      dealVersionId: seedIds.settlementPendingVersionId,
      dealVersionMilestoneId: seedIds.settlementPendingVersionMilestoneId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingSettlementRequestId,
      kind: "RELEASE",
      organizationId: seedIds.organizationId,
      requestedAt: plusHours(createdAt, 3),
      requestedByArbitratorAddress: null,
      requestedByUserId: seedIds.customerUserId,
      source: "BUYER_REVIEW",
      statementMarkdown: "Release the pending milestone payout."
    }
  });

  await prisma.dealMilestoneSettlementPreparation.create({
    data: {
      agreementAddress: "0x9999999999999999999999999999999999999998",
      chainId: 84532,
      dealId: "e2e-settlement-pending-deal",
      dealMilestoneReviewId: seedIds.settlementPendingReviewId,
      dealMilestoneSettlementRequestId: seedIds.settlementPendingSettlementRequestId,
      dealMilestoneSubmissionId: seedIds.settlementPendingSubmissionId,
      dealVersionHash:
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      dealVersionId: seedIds.settlementPendingVersionId,
      dealVersionMilestoneId: seedIds.settlementPendingVersionMilestoneId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingSettlementPreparationId,
      kind: "RELEASE",
      milestoneAmountMinor: "1750000",
      milestonePosition: 1,
      organizationId: seedIds.organizationId,
      preparedAt: plusHours(createdAt, 4),
      settlementTokenAddress: "0x1111111111111111111111111111111111111111",
      totalAmount: "1750000"
    }
  });

  await prisma.escrowAgreementProjection.create({
    data: {
      agreementAddress: "0x9999999999999999999999999999999999999998",
      arbitratorAddress: null,
      buyerAddress: customerAddress,
      chainId: 84532,
      createdBlockHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab",
      createdBlockNumber: 12n,
      createdLogIndex: 0,
      createdTransactionHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbc",
      dealId: "e2e-settlement-pending-deal",
      dealVersionHash:
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      factoryAddress: "0x8888888888888888888888888888888888888888",
      feeVaultAddress: "0x9999999999999999999999999999999999999999",
      funded: true,
      fundedBlockHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccd",
      fundedBlockNumber: 13n,
      fundedLogIndex: 1,
      fundedPayerAddress: customerAddress,
      fundedTimestamp: plusHours(createdAt, 1),
      fundedTransactionHash:
        "0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddde",
      id: seedIds.settlementPendingAgreementProjectionId,
      initializedBlockHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab",
      initializedBlockNumber: 12n,
      initializedLogIndex: 1,
      initializedTimestamp: createdAt,
      initializedTransactionHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbc",
      milestoneCount: 1,
      protocolConfigAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      protocolFeeBps: 100,
      sellerAddress: "0x3333333333333333333333333333333333333333",
      settlementTokenAddress: "0x1111111111111111111111111111111111111111",
      totalAmount: "1750000",
      updatedAt
    }
  });

  await prisma.dealMilestoneSettlementExecutionTransaction.create({
    data: {
      chainId: 84532,
      dealMilestoneReviewId: seedIds.settlementPendingReviewId,
      dealMilestoneSettlementRequestId: seedIds.settlementPendingSettlementRequestId,
      dealMilestoneSubmissionId: seedIds.settlementPendingSubmissionId,
      dealVersionId: seedIds.settlementPendingVersionId,
      dealVersionMilestoneId: seedIds.settlementPendingVersionMilestoneId,
      draftDealId: seedIds.settlementPendingDraftDealId,
      id: seedIds.settlementPendingExecutionTransactionId,
      organizationId: seedIds.organizationId,
      reconciledAgreementAddress: null,
      reconciledAt: null,
      reconciledConfirmedAt: null,
      reconciledMatchesTrackedAgreement: null,
      reconciledStatus: null,
      stalePendingEscalatedAt: null,
      submittedAt: plusHours(createdAt, 5),
      submittedByUserId: seedIds.customerUserId,
      submittedWalletAddress: customerAddress,
      submittedWalletId: seedIds.customerWalletId,
      supersededAt: null,
      supersededByDealMilestoneSettlementExecutionTransactionId: null,
      transactionHash:
        "0x5555555555555555555555555555555555555555555555555555555555555555"
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
    settlementPending: {
      dealMilestoneSettlementRequestId: seedIds.settlementPendingSettlementRequestId,
      dealVersionId: seedIds.settlementPendingVersionId,
      draftDealId: seedIds.settlementPendingDraftDealId
    },
    settlementReady: {
      dealMilestoneSettlementRequestId:
        seedIds.settlementDealMilestoneSettlementRequestId,
      dealVersionId: seedIds.settlementDealVersionId,
      dealVersionMilestoneId: seedIds.settlementDealVersionMilestoneId,
      draftDealId: seedIds.settlementDraftDealId
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
