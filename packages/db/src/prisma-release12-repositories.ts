import { PrismaClient } from "@prisma/client";

import { createRelease11Repositories } from "./prisma-release11-repositories";
import type {
  GasPolicyRecord,
  SponsoredTransactionRequestRecord,
  WalletProfileRecord
} from "./records";
import type {
  GasPolicyRepository,
  Release12Repositories,
  SponsoredTransactionRequestRepository,
  WalletProfileRepository
} from "./repositories";

type DatabaseClient = PrismaClient;

function toIsoTimestamp(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function toDate(value: string): Date {
  return new Date(value);
}

function mapWalletProfileRecord(record: {
  approvalNoteTemplate: string | null;
  createdAt: Date;
  defaultGasPolicyId: string | null;
  defaultOrganizationId: string | null;
  displayName: string;
  reviewNoteTemplate: string | null;
  sponsorTransactionsByDefault: boolean;
  updatedAt: Date;
  walletId: string;
}): WalletProfileRecord {
  return {
    approvalNoteTemplate: record.approvalNoteTemplate,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    defaultGasPolicyId: record.defaultGasPolicyId,
    defaultOrganizationId: record.defaultOrganizationId,
    displayName: record.displayName,
    reviewNoteTemplate: record.reviewNoteTemplate,
    sponsorTransactionsByDefault: record.sponsorTransactionsByDefault,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    walletId: record.walletId
  };
}

function mapGasPolicyRecord(record: {
  active: boolean;
  allowedApprovalPolicyKinds: GasPolicyRecord["allowedApprovalPolicyKinds"];
  allowedChainIds: number[];
  allowedTransactionKinds: GasPolicyRecord["allowedTransactionKinds"];
  createdAt: Date;
  createdByUserId: string;
  description: string | null;
  id: string;
  maxAmountMinor: string | null;
  maxRequestsPerDay: number;
  name: string;
  organizationId: string;
  sponsorWindowMinutes: number;
  updatedAt: Date;
}): GasPolicyRecord {
  return {
    active: record.active,
    allowedApprovalPolicyKinds: record.allowedApprovalPolicyKinds,
    allowedChainIds: record.allowedChainIds,
    allowedTransactionKinds: record.allowedTransactionKinds,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    description: record.description,
    id: record.id,
    maxAmountMinor: record.maxAmountMinor,
    maxRequestsPerDay: record.maxRequestsPerDay,
    name: record.name,
    organizationId: record.organizationId,
    sponsorWindowMinutes: record.sponsorWindowMinutes,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapSponsoredTransactionRequestRecord(record: {
  amountMinor: string;
  approvedAt: Date | null;
  chainId: number;
  createdAt: Date;
  data: string;
  dealMilestoneSettlementRequestId: string | null;
  dealVersionId: string | null;
  draftDealId: string | null;
  expiresAt: Date;
  gasPolicyId: string | null;
  id: string;
  kind: SponsoredTransactionRequestRecord["kind"];
  organizationId: string;
  reason: string | null;
  requestedByUserId: string;
  rejectedAt: Date | null;
  status: SponsoredTransactionRequestRecord["status"];
  subjectId: string;
  subjectType: string;
  submittedAt: Date | null;
  submittedTransactionHash: string | null;
  toAddress: string;
  updatedAt: Date;
  value: string;
  walletAddress: string;
  walletId: string;
}): SponsoredTransactionRequestRecord {
  return {
    amountMinor: record.amountMinor,
    approvedAt: toIsoTimestamp(record.approvedAt),
    chainId: record.chainId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    data: record.data as SponsoredTransactionRequestRecord["data"],
    dealMilestoneSettlementRequestId: record.dealMilestoneSettlementRequestId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    gasPolicyId: record.gasPolicyId,
    id: record.id,
    kind: record.kind,
    organizationId: record.organizationId,
    reason: record.reason,
    requestedByUserId: record.requestedByUserId,
    rejectedAt: toIsoTimestamp(record.rejectedAt),
    status: record.status,
    subjectId: record.subjectId,
    subjectType: record.subjectType as SponsoredTransactionRequestRecord["subjectType"],
    submittedAt: toIsoTimestamp(record.submittedAt),
    submittedTransactionHash:
      record.submittedTransactionHash as SponsoredTransactionRequestRecord["submittedTransactionHash"],
    toAddress: record.toAddress as SponsoredTransactionRequestRecord["toAddress"],
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    value: record.value,
    walletAddress: record.walletAddress as SponsoredTransactionRequestRecord["walletAddress"],
    walletId: record.walletId
  };
}

export function createRelease12Repositories(prisma: DatabaseClient): Release12Repositories {
  const release11 = createRelease11Repositories(prisma);

  const walletProfiles: WalletProfileRepository = {
    findByWalletId: async (walletId) => {
      const record = await prisma.walletProfile.findUnique({ where: { walletId } });
      return record ? mapWalletProfileRecord(record) : null;
    },
    listByWalletIds: async (walletIds) =>
      (
        await prisma.walletProfile.findMany({
          orderBy: { createdAt: "asc" },
          where: { walletId: { in: walletIds } }
        })
      ).map(mapWalletProfileRecord),
    upsert: async (record) =>
      mapWalletProfileRecord(
        await prisma.walletProfile.upsert({
          create: {
            approvalNoteTemplate: record.approvalNoteTemplate,
            createdAt: toDate(record.createdAt),
            defaultGasPolicyId: record.defaultGasPolicyId,
            defaultOrganizationId: record.defaultOrganizationId,
            displayName: record.displayName,
            reviewNoteTemplate: record.reviewNoteTemplate,
            sponsorTransactionsByDefault: record.sponsorTransactionsByDefault,
            updatedAt: toDate(record.updatedAt),
            walletId: record.walletId
          },
          update: {
            approvalNoteTemplate: record.approvalNoteTemplate,
            defaultGasPolicyId: record.defaultGasPolicyId,
            defaultOrganizationId: record.defaultOrganizationId,
            displayName: record.displayName,
            reviewNoteTemplate: record.reviewNoteTemplate,
            sponsorTransactionsByDefault: record.sponsorTransactionsByDefault,
            updatedAt: toDate(record.updatedAt)
          },
          where: { walletId: record.walletId }
        })
      )
  };

  const gasPolicies: GasPolicyRepository = {
    create: async (record) =>
      mapGasPolicyRecord(
        await prisma.gasPolicy.create({
          data: {
            active: record.active,
            allowedApprovalPolicyKinds: record.allowedApprovalPolicyKinds,
            allowedChainIds: record.allowedChainIds,
            allowedTransactionKinds: record.allowedTransactionKinds,
            createdAt: toDate(record.createdAt),
            createdByUserId: record.createdByUserId,
            description: record.description,
            id: record.id,
            maxAmountMinor: record.maxAmountMinor,
            maxRequestsPerDay: record.maxRequestsPerDay,
            name: record.name,
            organizationId: record.organizationId,
            sponsorWindowMinutes: record.sponsorWindowMinutes,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.gasPolicy.findUnique({ where: { id } });
      return record ? mapGasPolicyRecord(record) : null;
    },
    listActiveByOrganizationId: async (organizationId) =>
      (
        await prisma.gasPolicy.findMany({
          orderBy: { createdAt: "asc" },
          where: { active: true, organizationId }
        })
      ).map(mapGasPolicyRecord),
    listByOrganizationId: async (organizationId) =>
      (
        await prisma.gasPolicy.findMany({
          orderBy: { createdAt: "asc" },
          where: { organizationId }
        })
      ).map(mapGasPolicyRecord),
    update: async (id, updates) =>
      mapGasPolicyRecord(
        await prisma.gasPolicy.update({
          data: {
            ...(updates.active === undefined ? {} : { active: updates.active }),
            ...(updates.allowedApprovalPolicyKinds === undefined
              ? {}
              : { allowedApprovalPolicyKinds: updates.allowedApprovalPolicyKinds }),
            ...(updates.allowedChainIds === undefined
              ? {}
              : { allowedChainIds: updates.allowedChainIds }),
            ...(updates.allowedTransactionKinds === undefined
              ? {}
              : { allowedTransactionKinds: updates.allowedTransactionKinds }),
            ...(updates.description === undefined ? {} : { description: updates.description }),
            ...(updates.maxAmountMinor === undefined
              ? {}
              : { maxAmountMinor: updates.maxAmountMinor }),
            ...(updates.maxRequestsPerDay === undefined
              ? {}
              : { maxRequestsPerDay: updates.maxRequestsPerDay }),
            ...(updates.name === undefined ? {} : { name: updates.name }),
            ...(updates.sponsorWindowMinutes === undefined
              ? {}
              : { sponsorWindowMinutes: updates.sponsorWindowMinutes }),
            ...(updates.updatedAt === undefined ? {} : { updatedAt: toDate(updates.updatedAt) })
          },
          where: { id }
        })
      )
  };

  const sponsoredTransactionRequests: SponsoredTransactionRequestRepository = {
    countApprovedCreatedSince: async (input) =>
      prisma.sponsoredTransactionRequest.count({
        where: {
          approvedAt: { not: null },
          createdAt: { gte: toDate(input.since) },
          gasPolicyId: input.gasPolicyId,
          organizationId: input.organizationId
        }
      }),
    create: async (record) =>
      mapSponsoredTransactionRequestRecord(
        await prisma.sponsoredTransactionRequest.create({
          data: {
            amountMinor: record.amountMinor,
            approvedAt: record.approvedAt ? toDate(record.approvedAt) : null,
            chainId: record.chainId,
            createdAt: toDate(record.createdAt),
            data: record.data,
            dealMilestoneSettlementRequestId: record.dealMilestoneSettlementRequestId,
            dealVersionId: record.dealVersionId,
            draftDealId: record.draftDealId,
            expiresAt: toDate(record.expiresAt),
            gasPolicyId: record.gasPolicyId,
            id: record.id,
            kind: record.kind,
            organizationId: record.organizationId,
            reason: record.reason,
            requestedByUserId: record.requestedByUserId,
            rejectedAt: record.rejectedAt ? toDate(record.rejectedAt) : null,
            status: record.status,
            subjectId: record.subjectId,
            subjectType: record.subjectType,
            submittedAt: record.submittedAt ? toDate(record.submittedAt) : null,
            submittedTransactionHash: record.submittedTransactionHash,
            toAddress: record.toAddress,
            updatedAt: toDate(record.updatedAt),
            value: record.value,
            walletAddress: record.walletAddress,
            walletId: record.walletId
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.sponsoredTransactionRequest.findUnique({ where: { id } });
      return record ? mapSponsoredTransactionRequestRecord(record) : null;
    },
    findLatestApprovedBySubjectAndWallet: async (input) => {
      const record = await prisma.sponsoredTransactionRequest.findFirst({
        orderBy: { createdAt: "desc" },
        where: {
          kind: input.kind,
          status: "APPROVED",
          subjectId: input.subjectId,
          submittedAt: null,
          walletId: input.walletId
        }
      });
      return record ? mapSponsoredTransactionRequestRecord(record) : null;
    },
    listByOrganizationId: async (organizationId) =>
      (
        await prisma.sponsoredTransactionRequest.findMany({
          orderBy: { createdAt: "desc" },
          where: { organizationId }
        })
      ).map(mapSponsoredTransactionRequestRecord),
    update: async (id, updates) =>
      mapSponsoredTransactionRequestRecord(
        await prisma.sponsoredTransactionRequest.update({
          data: {
            ...(updates.amountMinor === undefined ? {} : { amountMinor: updates.amountMinor }),
            ...(updates.approvedAt === undefined
              ? {}
              : { approvedAt: updates.approvedAt ? toDate(updates.approvedAt) : null }),
            ...(updates.chainId === undefined ? {} : { chainId: updates.chainId }),
            ...(updates.data === undefined ? {} : { data: updates.data }),
            ...(updates.dealMilestoneSettlementRequestId === undefined
              ? {}
              : { dealMilestoneSettlementRequestId: updates.dealMilestoneSettlementRequestId }),
            ...(updates.dealVersionId === undefined ? {} : { dealVersionId: updates.dealVersionId }),
            ...(updates.draftDealId === undefined ? {} : { draftDealId: updates.draftDealId }),
            ...(updates.expiresAt === undefined ? {} : { expiresAt: toDate(updates.expiresAt) }),
            ...(updates.gasPolicyId === undefined ? {} : { gasPolicyId: updates.gasPolicyId }),
            ...(updates.kind === undefined ? {} : { kind: updates.kind }),
            ...(updates.reason === undefined ? {} : { reason: updates.reason }),
            ...(updates.rejectedAt === undefined
              ? {}
              : { rejectedAt: updates.rejectedAt ? toDate(updates.rejectedAt) : null }),
            ...(updates.status === undefined ? {} : { status: updates.status }),
            ...(updates.subjectId === undefined ? {} : { subjectId: updates.subjectId }),
            ...(updates.subjectType === undefined ? {} : { subjectType: updates.subjectType }),
            ...(updates.submittedAt === undefined
              ? {}
              : { submittedAt: updates.submittedAt ? toDate(updates.submittedAt) : null }),
            ...(updates.submittedTransactionHash === undefined
              ? {}
              : { submittedTransactionHash: updates.submittedTransactionHash }),
            ...(updates.toAddress === undefined ? {} : { toAddress: updates.toAddress }),
            ...(updates.updatedAt === undefined ? {} : { updatedAt: toDate(updates.updatedAt) }),
            ...(updates.value === undefined ? {} : { value: updates.value }),
            ...(updates.walletAddress === undefined
              ? {}
              : { walletAddress: updates.walletAddress })
          },
          where: { id }
        })
      )
  };

  return {
    ...release11,
    gasPolicies,
    sponsoredTransactionRequests,
    walletProfiles
  };
}
