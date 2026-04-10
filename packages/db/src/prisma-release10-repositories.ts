import { Prisma, PrismaClient } from "@prisma/client";

import type {
  PartnerAccountRecord,
  PartnerApiKeyRecord,
  PartnerHostedSessionRecord,
  PartnerIdempotencyKeyRecord,
  PartnerOrganizationLinkRecord,
  PartnerResourceReferenceRecord,
  PartnerWebhookDeliveryAttemptRecord,
  PartnerWebhookDeliveryRecord,
  PartnerWebhookEventRecord,
  PartnerWebhookSubscriptionRecord
} from "./records";
import type {
  PartnerAccountRepository,
  PartnerApiKeyRepository,
  PartnerHostedSessionRepository,
  PartnerIdempotencyKeyRepository,
  PartnerOrganizationLinkRepository,
  PartnerResourceReferenceRepository,
  PartnerWebhookDeliveryAttemptRepository,
  PartnerWebhookDeliveryRepository,
  PartnerWebhookEventRepository,
  PartnerWebhookSubscriptionRepository,
  Release10Repositories
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

function toPrismaJsonInput(
  value: Prisma.InputJsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

function mapPartnerAccountRecord(record: {
  createdAt: Date;
  id: string;
  metadata: Prisma.JsonValue | null;
  name: string;
  slug: string;
  status: PartnerAccountRecord["status"];
  updatedAt: Date;
}): PartnerAccountRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    metadata: (record.metadata ?? null) as PartnerAccountRecord["metadata"],
    name: record.name,
    slug: record.slug,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerOrganizationLinkRecord(record: {
  actingUserId: string;
  actingWalletId: string;
  createdAt: Date;
  externalReference: string | null;
  id: string;
  organizationId: string;
  partnerAccountId: string;
  status: PartnerOrganizationLinkRecord["status"];
  updatedAt: Date;
}): PartnerOrganizationLinkRecord {
  return {
    actingUserId: record.actingUserId,
    actingWalletId: record.actingWalletId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    externalReference: record.externalReference,
    id: record.id,
    organizationId: record.organizationId,
    partnerAccountId: record.partnerAccountId,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerApiKeyRecord(record: {
  createdAt: Date;
  displayName: string;
  expiresAt: Date | null;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  partnerOrganizationLinkId: string;
  revokedAt: Date | null;
  scopes: string[];
  secretHash: string;
  status: PartnerApiKeyRecord["status"];
  updatedAt: Date;
}): PartnerApiKeyRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    displayName: record.displayName,
    expiresAt: toIsoTimestamp(record.expiresAt),
    id: record.id,
    keyPrefix: record.keyPrefix,
    lastUsedAt: toIsoTimestamp(record.lastUsedAt),
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    revokedAt: toIsoTimestamp(record.revokedAt),
    scopes: record.scopes as PartnerApiKeyRecord["scopes"],
    secretHash: record.secretHash,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerIdempotencyKeyRecord(record: {
  createdAt: Date;
  id: string;
  partnerApiKeyId: string;
  requestHash: string;
  requestKey: string;
  requestMethod: string;
  requestPath: string;
  responseBody: Prisma.JsonValue;
  responseStatusCode: number;
}): PartnerIdempotencyKeyRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    partnerApiKeyId: record.partnerApiKeyId,
    requestHash: record.requestHash,
    requestKey: record.requestKey,
    requestMethod: record.requestMethod,
    requestPath: record.requestPath,
    responseBody: record.responseBody as PartnerIdempotencyKeyRecord["responseBody"],
    responseStatusCode: record.responseStatusCode
  };
}

function mapPartnerResourceReferenceRecord(record: {
  createdAt: Date;
  id: string;
  partnerOrganizationLinkId: string;
  partnerReferenceId: string;
  resourceId: string;
  resourceType: PartnerResourceReferenceRecord["resourceType"];
}): PartnerResourceReferenceRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    partnerReferenceId: record.partnerReferenceId,
    resourceId: record.resourceId,
    resourceType: record.resourceType
  };
}

function mapPartnerHostedSessionRecord(record: {
  activatedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  dealMilestoneDisputeId: string | null;
  dealVersionId: string | null;
  dealVersionMilestoneId: string | null;
  draftDealId: string | null;
  expiresAt: Date;
  id: string;
  launchTokenHash: string;
  partnerApiKeyId: string | null;
  partnerOrganizationLinkId: string;
  partnerReferenceId: string | null;
  status: PartnerHostedSessionRecord["status"];
  type: PartnerHostedSessionRecord["type"];
  updatedAt: Date;
}): PartnerHostedSessionRecord {
  return {
    activatedAt: toIsoTimestamp(record.activatedAt),
    completedAt: toIsoTimestamp(record.completedAt),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    dealMilestoneDisputeId: record.dealMilestoneDisputeId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    launchTokenHash: record.launchTokenHash,
    partnerApiKeyId: record.partnerApiKeyId,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    partnerReferenceId: record.partnerReferenceId,
    status: record.status,
    type: record.type,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerWebhookSubscriptionRecord(record: {
  createdAt: Date;
  displayName: string;
  endpointUrl: string;
  eventTypes: string[];
  id: string;
  lastDeliveryAt: Date | null;
  partnerOrganizationLinkId: string;
  secretHash: string;
  status: PartnerWebhookSubscriptionRecord["status"];
  updatedAt: Date;
}): PartnerWebhookSubscriptionRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    displayName: record.displayName,
    endpointUrl: record.endpointUrl,
    eventTypes: record.eventTypes as PartnerWebhookSubscriptionRecord["eventTypes"],
    id: record.id,
    lastDeliveryAt: toIsoTimestamp(record.lastDeliveryAt),
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    secretHash: record.secretHash,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerWebhookEventRecord(record: {
  createdAt: Date;
  draftDealId: string | null;
  eventType: string;
  hostedSessionId: string | null;
  id: string;
  organizationId: string;
  partnerOrganizationLinkId: string;
  payload: Prisma.JsonValue;
}): PartnerWebhookEventRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    draftDealId: record.draftDealId,
    eventType: record.eventType as PartnerWebhookEventRecord["eventType"],
    hostedSessionId: record.hostedSessionId,
    id: record.id,
    organizationId: record.organizationId,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    payload: record.payload as PartnerWebhookEventRecord["payload"]
  };
}

function mapPartnerWebhookDeliveryRecord(record: {
  createdAt: Date;
  deliveredAt: Date | null;
  errorMessage: string | null;
  id: string;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  partnerOrganizationLinkId: string;
  partnerWebhookEventId: string;
  partnerWebhookSubscriptionId: string;
  status: PartnerWebhookDeliveryRecord["status"];
}): PartnerWebhookDeliveryRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    deliveredAt: toIsoTimestamp(record.deliveredAt),
    errorMessage: record.errorMessage,
    id: record.id,
    lastAttemptAt: toIsoTimestamp(record.lastAttemptAt),
    nextAttemptAt: toIsoTimestamp(record.nextAttemptAt),
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    partnerWebhookEventId: record.partnerWebhookEventId,
    partnerWebhookSubscriptionId: record.partnerWebhookSubscriptionId,
    status: record.status
  };
}

function mapPartnerWebhookDeliveryAttemptRecord(record: {
  attemptedAt: Date;
  durationMs: number | null;
  errorMessage: string | null;
  finishedAt: Date | null;
  id: string;
  nextRetryAt: Date | null;
  partnerWebhookDeliveryId: string;
  responseStatusCode: number | null;
}): PartnerWebhookDeliveryAttemptRecord {
  return {
    attemptedAt: toRequiredIsoTimestamp(record.attemptedAt),
    durationMs: record.durationMs,
    errorMessage: record.errorMessage,
    finishedAt: toIsoTimestamp(record.finishedAt),
    id: record.id,
    nextRetryAt: toIsoTimestamp(record.nextRetryAt),
    partnerWebhookDeliveryId: record.partnerWebhookDeliveryId,
    responseStatusCode: record.responseStatusCode
  };
}

export function createRelease10Repositories(prisma: DatabaseClient): Release10Repositories {
  const partnerAccounts: PartnerAccountRepository = {
    create: async (record) =>
      mapPartnerAccountRecord(
        await prisma.partnerAccount.create({
          data: {
            createdAt: toDate(record.createdAt),
            id: record.id,
            metadata: toPrismaJsonInput(record.metadata),
            name: record.name,
            slug: record.slug,
            status: record.status,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerAccount.findUnique({ where: { id } });
      return record ? mapPartnerAccountRecord(record) : null;
    },
    findBySlug: async (slug) => {
      const record = await prisma.partnerAccount.findUnique({ where: { slug } });
      return record ? mapPartnerAccountRecord(record) : null;
    },
    listAll: async () =>
      (await prisma.partnerAccount.findMany({ orderBy: { createdAt: "asc" } })).map(
        mapPartnerAccountRecord
      )
  };

  const partnerOrganizationLinks: PartnerOrganizationLinkRepository = {
    create: async (record) =>
      mapPartnerOrganizationLinkRecord(
        await prisma.partnerOrganizationLink.create({
          data: {
            actingUserId: record.actingUserId,
            actingWalletId: record.actingWalletId,
            createdAt: toDate(record.createdAt),
            externalReference: record.externalReference,
            id: record.id,
            organizationId: record.organizationId,
            partnerAccountId: record.partnerAccountId,
            status: record.status,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerOrganizationLink.findUnique({ where: { id } });
      return record ? mapPartnerOrganizationLinkRecord(record) : null;
    },
    listByOrganizationId: async (organizationId) =>
      (
        await prisma.partnerOrganizationLink.findMany({
          orderBy: { createdAt: "asc" },
          where: { organizationId }
        })
      ).map(mapPartnerOrganizationLinkRecord),
    listByPartnerAccountId: async (partnerAccountId) =>
      (
        await prisma.partnerOrganizationLink.findMany({
          orderBy: { createdAt: "asc" },
          where: { partnerAccountId }
        })
      ).map(mapPartnerOrganizationLinkRecord),
    update: async (id, updates) =>
      mapPartnerOrganizationLinkRecord(
        await prisma.partnerOrganizationLink.update({
          data: {
            ...(updates.actingUserId ? { actingUserId: updates.actingUserId } : {}),
            ...(updates.actingWalletId ? { actingWalletId: updates.actingWalletId } : {}),
            ...(updates.externalReference !== undefined
              ? { externalReference: updates.externalReference }
              : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const partnerApiKeys: PartnerApiKeyRepository = {
    create: async (record) =>
      mapPartnerApiKeyRecord(
        await prisma.partnerApiKey.create({
          data: {
            createdAt: toDate(record.createdAt),
            displayName: record.displayName,
            expiresAt: record.expiresAt ? toDate(record.expiresAt) : null,
            id: record.id,
            keyPrefix: record.keyPrefix,
            lastUsedAt: record.lastUsedAt ? toDate(record.lastUsedAt) : null,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            revokedAt: record.revokedAt ? toDate(record.revokedAt) : null,
            scopes: record.scopes,
            secretHash: record.secretHash,
            status: record.status,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findActiveByKeyPrefix: async (keyPrefix) => {
      const record = await prisma.partnerApiKey.findFirst({
        where: {
          keyPrefix,
          status: "ACTIVE"
        }
      });
      return record ? mapPartnerApiKeyRecord(record) : null;
    },
    findById: async (id) => {
      const record = await prisma.partnerApiKey.findUnique({ where: { id } });
      return record ? mapPartnerApiKeyRecord(record) : null;
    },
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId) =>
      (
        await prisma.partnerApiKey.findMany({
          orderBy: { createdAt: "asc" },
          where: { partnerOrganizationLinkId }
        })
      ).map(mapPartnerApiKeyRecord),
    update: async (id, updates) =>
      mapPartnerApiKeyRecord(
        await prisma.partnerApiKey.update({
          data: {
            ...(updates.displayName ? { displayName: updates.displayName } : {}),
            ...(updates.expiresAt !== undefined
              ? { expiresAt: updates.expiresAt ? toDate(updates.expiresAt) : null }
              : {}),
            ...(updates.lastUsedAt !== undefined
              ? { lastUsedAt: updates.lastUsedAt ? toDate(updates.lastUsedAt) : null }
              : {}),
            ...(updates.revokedAt !== undefined
              ? { revokedAt: updates.revokedAt ? toDate(updates.revokedAt) : null }
              : {}),
            ...(updates.scopes ? { scopes: updates.scopes } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const partnerIdempotencyKeys: PartnerIdempotencyKeyRepository = {
    create: async (record) =>
      mapPartnerIdempotencyKeyRecord(
        await prisma.partnerIdempotencyKey.create({
          data: {
            createdAt: toDate(record.createdAt),
            id: record.id,
            partnerApiKeyId: record.partnerApiKeyId,
            requestHash: record.requestHash,
            requestKey: record.requestKey,
            requestMethod: record.requestMethod,
            requestPath: record.requestPath,
            responseBody: record.responseBody,
            responseStatusCode: record.responseStatusCode
          }
        })
      ),
    findByScope: async (input) => {
      const record = await prisma.partnerIdempotencyKey.findUnique({
        where: {
          partnerApiKeyId_requestMethod_requestPath_requestKey: {
            partnerApiKeyId: input.partnerApiKeyId,
            requestKey: input.requestKey,
            requestMethod: input.requestMethod,
            requestPath: input.requestPath
          }
        }
      });
      return record ? mapPartnerIdempotencyKeyRecord(record) : null;
    }
  };

  const partnerResourceReferences: PartnerResourceReferenceRepository = {
    create: async (record) =>
      mapPartnerResourceReferenceRecord(
        await prisma.partnerResourceReference.create({
          data: {
            createdAt: toDate(record.createdAt),
            id: record.id,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            partnerReferenceId: record.partnerReferenceId,
            resourceId: record.resourceId,
            resourceType: record.resourceType
          }
        })
      ),
    findByPartnerReferenceId: async (input) => {
      const record = await prisma.partnerResourceReference.findUnique({
        where: {
          partnerOrganizationLinkId_partnerReferenceId: {
            partnerOrganizationLinkId: input.partnerOrganizationLinkId,
            partnerReferenceId: input.partnerReferenceId
          }
        }
      });
      return record ? mapPartnerResourceReferenceRecord(record) : null;
    },
    findByResource: async (input) => {
      const record = await prisma.partnerResourceReference.findUnique({
        where: {
          partnerOrganizationLinkId_resourceType_resourceId: {
            partnerOrganizationLinkId: input.partnerOrganizationLinkId,
            resourceId: input.resourceId,
            resourceType: input.resourceType
          }
        }
      });
      return record ? mapPartnerResourceReferenceRecord(record) : null;
    }
  };

  const partnerHostedSessions: PartnerHostedSessionRepository = {
    create: async (record) =>
      mapPartnerHostedSessionRecord(
        await prisma.partnerHostedSession.create({
          data: {
            activatedAt: record.activatedAt ? toDate(record.activatedAt) : null,
            completedAt: record.completedAt ? toDate(record.completedAt) : null,
            createdAt: toDate(record.createdAt),
            dealMilestoneDisputeId: record.dealMilestoneDisputeId,
            dealVersionId: record.dealVersionId,
            dealVersionMilestoneId: record.dealVersionMilestoneId,
            draftDealId: record.draftDealId,
            expiresAt: toDate(record.expiresAt),
            id: record.id,
            launchTokenHash: record.launchTokenHash,
            partnerApiKeyId: record.partnerApiKeyId,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            partnerReferenceId: record.partnerReferenceId,
            status: record.status,
            type: record.type,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerHostedSession.findUnique({ where: { id } });
      return record ? mapPartnerHostedSessionRecord(record) : null;
    },
    findByLaunchTokenHash: async (launchTokenHash) => {
      const record = await prisma.partnerHostedSession.findFirst({
        where: { launchTokenHash }
      });
      return record ? mapPartnerHostedSessionRecord(record) : null;
    },
    listByOrganizationId: async (organizationId) =>
      (
        await prisma.partnerHostedSession.findMany({
          orderBy: { createdAt: "desc" },
          where: {
            partnerOrganizationLink: {
              organizationId
            }
          }
        })
      ).map(mapPartnerHostedSessionRecord),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId) =>
      (
        await prisma.partnerHostedSession.findMany({
          orderBy: { createdAt: "desc" },
          where: { partnerOrganizationLinkId }
        })
      ).map(mapPartnerHostedSessionRecord),
    update: async (id, updates) =>
      mapPartnerHostedSessionRecord(
        await prisma.partnerHostedSession.update({
          data: {
            ...(updates.activatedAt !== undefined
              ? { activatedAt: updates.activatedAt ? toDate(updates.activatedAt) : null }
              : {}),
            ...(updates.completedAt !== undefined
              ? { completedAt: updates.completedAt ? toDate(updates.completedAt) : null }
              : {}),
            ...(updates.dealMilestoneDisputeId !== undefined
              ? { dealMilestoneDisputeId: updates.dealMilestoneDisputeId }
              : {}),
            ...(updates.dealVersionId !== undefined
              ? { dealVersionId: updates.dealVersionId }
              : {}),
            ...(updates.dealVersionMilestoneId !== undefined
              ? { dealVersionMilestoneId: updates.dealVersionMilestoneId }
              : {}),
            ...(updates.draftDealId !== undefined
              ? { draftDealId: updates.draftDealId }
              : {}),
            ...(updates.expiresAt ? { expiresAt: toDate(updates.expiresAt) } : {}),
            ...(updates.partnerApiKeyId !== undefined
              ? { partnerApiKeyId: updates.partnerApiKeyId }
              : {}),
            ...(updates.partnerReferenceId !== undefined
              ? { partnerReferenceId: updates.partnerReferenceId }
              : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.type ? { type: updates.type } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const partnerWebhookSubscriptions: PartnerWebhookSubscriptionRepository = {
    create: async (record) =>
      mapPartnerWebhookSubscriptionRecord(
        await prisma.partnerWebhookSubscription.create({
          data: {
            createdAt: toDate(record.createdAt),
            displayName: record.displayName,
            endpointUrl: record.endpointUrl,
            eventTypes: record.eventTypes,
            id: record.id,
            lastDeliveryAt: record.lastDeliveryAt ? toDate(record.lastDeliveryAt) : null,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            secretHash: record.secretHash,
            status: record.status,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerWebhookSubscription.findUnique({ where: { id } });
      return record ? mapPartnerWebhookSubscriptionRecord(record) : null;
    },
    listActiveByPartnerOrganizationLinkId: async (partnerOrganizationLinkId) =>
      (
        await prisma.partnerWebhookSubscription.findMany({
          orderBy: { createdAt: "asc" },
          where: { partnerOrganizationLinkId, status: "ACTIVE" }
        })
      ).map(mapPartnerWebhookSubscriptionRecord),
    listByPartnerOrganizationLinkIds: async (partnerOrganizationLinkIds) =>
      (
        await prisma.partnerWebhookSubscription.findMany({
          orderBy: { createdAt: "desc" },
          where: { partnerOrganizationLinkId: { in: [...partnerOrganizationLinkIds] } }
        })
      ).map(mapPartnerWebhookSubscriptionRecord),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId) =>
      (
        await prisma.partnerWebhookSubscription.findMany({
          orderBy: { createdAt: "desc" },
          where: { partnerOrganizationLinkId }
        })
      ).map(mapPartnerWebhookSubscriptionRecord),
    update: async (id, updates) =>
      mapPartnerWebhookSubscriptionRecord(
        await prisma.partnerWebhookSubscription.update({
          data: {
            ...(updates.displayName ? { displayName: updates.displayName } : {}),
            ...(updates.endpointUrl ? { endpointUrl: updates.endpointUrl } : {}),
            ...(updates.eventTypes ? { eventTypes: updates.eventTypes } : {}),
            ...(updates.lastDeliveryAt !== undefined
              ? {
                  lastDeliveryAt: updates.lastDeliveryAt ? toDate(updates.lastDeliveryAt) : null
                }
              : {}),
            ...(updates.secretHash ? { secretHash: updates.secretHash } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const partnerWebhookEvents: PartnerWebhookEventRepository = {
    create: async (record) =>
      mapPartnerWebhookEventRecord(
        await prisma.partnerWebhookEvent.create({
          data: {
            createdAt: toDate(record.createdAt),
            draftDealId: record.draftDealId,
            eventType: record.eventType,
            hostedSessionId: record.hostedSessionId,
            id: record.id,
            organizationId: record.organizationId,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            payload: record.payload
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerWebhookEvent.findUnique({ where: { id } });
      return record ? mapPartnerWebhookEventRecord(record) : null;
    }
  };

  const partnerWebhookDeliveries: PartnerWebhookDeliveryRepository = {
    claimNextPending: async (now) => {
      const claimed = await prisma.$transaction(async (tx) => {
        const record = await tx.partnerWebhookDelivery.findFirst({
          orderBy: { createdAt: "asc" },
          where: {
            OR: [
              { status: "PENDING" },
              {
                status: "DELIVERING",
                nextAttemptAt: {
                  lte: toDate(now)
                }
              }
            ]
          }
        });

        if (!record) {
          return null;
        }

        return tx.partnerWebhookDelivery.update({
          data: {
            lastAttemptAt: toDate(now),
            status: "DELIVERING"
          },
          where: { id: record.id }
        });
      });

      return claimed ? mapPartnerWebhookDeliveryRecord(claimed) : null;
    },
    create: async (record) =>
      mapPartnerWebhookDeliveryRecord(
        await prisma.partnerWebhookDelivery.create({
          data: {
            createdAt: toDate(record.createdAt),
            deliveredAt: record.deliveredAt ? toDate(record.deliveredAt) : null,
            errorMessage: record.errorMessage,
            id: record.id,
            lastAttemptAt: record.lastAttemptAt ? toDate(record.lastAttemptAt) : null,
            nextAttemptAt: record.nextAttemptAt ? toDate(record.nextAttemptAt) : null,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            partnerWebhookEventId: record.partnerWebhookEventId,
            partnerWebhookSubscriptionId: record.partnerWebhookSubscriptionId,
            status: record.status
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerWebhookDelivery.findUnique({ where: { id } });
      return record ? mapPartnerWebhookDeliveryRecord(record) : null;
    },
    listByPartnerOrganizationLinkIds: async (partnerOrganizationLinkIds) =>
      (
        await prisma.partnerWebhookDelivery.findMany({
          orderBy: { createdAt: "desc" },
          where: { partnerOrganizationLinkId: { in: [...partnerOrganizationLinkIds] } }
        })
      ).map(mapPartnerWebhookDeliveryRecord),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId) =>
      (
        await prisma.partnerWebhookDelivery.findMany({
          orderBy: { createdAt: "desc" },
          where: { partnerOrganizationLinkId }
        })
      ).map(mapPartnerWebhookDeliveryRecord),
    update: async (id, updates) =>
      mapPartnerWebhookDeliveryRecord(
        await prisma.partnerWebhookDelivery.update({
          data: {
            ...(updates.deliveredAt !== undefined
              ? { deliveredAt: updates.deliveredAt ? toDate(updates.deliveredAt) : null }
              : {}),
            ...(updates.errorMessage !== undefined
              ? { errorMessage: updates.errorMessage }
              : {}),
            ...(updates.lastAttemptAt !== undefined
              ? { lastAttemptAt: updates.lastAttemptAt ? toDate(updates.lastAttemptAt) : null }
              : {}),
            ...(updates.nextAttemptAt !== undefined
              ? { nextAttemptAt: updates.nextAttemptAt ? toDate(updates.nextAttemptAt) : null }
              : {}),
            ...(updates.status ? { status: updates.status } : {})
          },
          where: { id }
        })
      )
  };

  const partnerWebhookDeliveryAttempts: PartnerWebhookDeliveryAttemptRepository = {
    create: async (record) =>
      mapPartnerWebhookDeliveryAttemptRecord(
        await prisma.partnerWebhookDeliveryAttempt.create({
          data: {
            attemptedAt: toDate(record.attemptedAt),
            durationMs: record.durationMs,
            errorMessage: record.errorMessage,
            finishedAt: record.finishedAt ? toDate(record.finishedAt) : null,
            id: record.id,
            nextRetryAt: record.nextRetryAt ? toDate(record.nextRetryAt) : null,
            partnerWebhookDeliveryId: record.partnerWebhookDeliveryId,
            responseStatusCode: record.responseStatusCode
          }
        })
      ),
    listByPartnerWebhookDeliveryId: async (partnerWebhookDeliveryId) =>
      (
        await prisma.partnerWebhookDeliveryAttempt.findMany({
          orderBy: { attemptedAt: "asc" },
          where: { partnerWebhookDeliveryId }
        })
      ).map(mapPartnerWebhookDeliveryAttemptRecord)
  };

  return {
    partnerAccounts,
    partnerApiKeys,
    partnerHostedSessions,
    partnerIdempotencyKeys,
    partnerOrganizationLinks,
    partnerResourceReferences,
    partnerWebhookDeliveries,
    partnerWebhookDeliveryAttempts,
    partnerWebhookEvents,
    partnerWebhookSubscriptions
  };
}
