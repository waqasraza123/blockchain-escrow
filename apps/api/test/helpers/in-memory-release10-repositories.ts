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
  PartnerWebhookSubscriptionRecord,
  Release10Repositories
} from "@blockchain-escrow/db";

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class InMemoryRelease10Repositories implements Release10Repositories {
  readonly partnerAccountRecords: PartnerAccountRecord[] = [];
  readonly partnerApiKeyRecords: PartnerApiKeyRecord[] = [];
  readonly partnerHostedSessionRecords: PartnerHostedSessionRecord[] = [];
  readonly partnerIdempotencyKeyRecords: PartnerIdempotencyKeyRecord[] = [];
  readonly partnerLinkRecords: PartnerOrganizationLinkRecord[] = [];
  readonly partnerResourceReferenceRecords: PartnerResourceReferenceRecord[] = [];
  readonly partnerWebhookDeliveryAttemptRecords: PartnerWebhookDeliveryAttemptRecord[] = [];
  readonly partnerWebhookDeliveryRecords: PartnerWebhookDeliveryRecord[] = [];
  readonly partnerWebhookEventRecords: PartnerWebhookEventRecord[] = [];
  readonly partnerWebhookSubscriptionRecords: PartnerWebhookSubscriptionRecord[] = [];

  readonly partnerAccounts = {
    create: async (record: PartnerAccountRecord) => {
      this.partnerAccountRecords.push(record);
      return record;
    },
    findById: async (id: string) => this.partnerAccountRecords.find((record) => record.id === id) ?? null,
    findBySlug: async (slug: string) =>
      this.partnerAccountRecords.find((record) => record.slug === slug) ?? null,
    listAll: async () =>
      [...this.partnerAccountRecords].sort((left, right) =>
        compareIsoTimestamps(right.createdAt, left.createdAt)
      )
  };

  readonly partnerOrganizationLinks = {
    create: async (record: PartnerOrganizationLinkRecord) => {
      this.partnerLinkRecords.push(record);
      return record;
    },
    findById: async (id: string) => this.partnerLinkRecords.find((record) => record.id === id) ?? null,
    listByOrganizationId: async (organizationId: string) =>
      this.partnerLinkRecords.filter((record) => record.organizationId === organizationId),
    listByPartnerAccountId: async (partnerAccountId: string) =>
      this.partnerLinkRecords.filter((record) => record.partnerAccountId === partnerAccountId),
    update: async (id: string, updates: Partial<Omit<PartnerOrganizationLinkRecord, "id" | "partnerAccountId" | "organizationId" | "createdAt">>) => {
      const record = this.partnerLinkRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Partner link not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly partnerApiKeys = {
    create: async (record: PartnerApiKeyRecord) => {
      this.partnerApiKeyRecords.push(record);
      return record;
    },
    findActiveByKeyPrefix: async (keyPrefix: string) =>
      this.partnerApiKeyRecords.find(
        (record) => record.keyPrefix === keyPrefix && record.status === "ACTIVE"
      ) ?? null,
    findById: async (id: string) => this.partnerApiKeyRecords.find((record) => record.id === id) ?? null,
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId: string) =>
      this.partnerApiKeyRecords.filter((record) => record.partnerOrganizationLinkId === partnerOrganizationLinkId),
    update: async (id: string, updates: Partial<Omit<PartnerApiKeyRecord, "id" | "partnerOrganizationLinkId" | "createdAt" | "keyPrefix" | "secretHash">>) => {
      const record = this.partnerApiKeyRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Partner api key not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly partnerIdempotencyKeys = {
    create: async (record: PartnerIdempotencyKeyRecord) => {
      this.partnerIdempotencyKeyRecords.push(record);
      return record;
    },
    findByScope: async (input: {
      partnerApiKeyId: string;
      requestKey: string;
      requestMethod: string;
      requestPath: string;
    }) =>
      this.partnerIdempotencyKeyRecords.find(
        (record) =>
          record.partnerApiKeyId === input.partnerApiKeyId &&
          record.requestKey === input.requestKey &&
          record.requestMethod === input.requestMethod &&
          record.requestPath === input.requestPath
      ) ?? null
  };

  readonly partnerResourceReferences = {
    create: async (record: PartnerResourceReferenceRecord) => {
      this.partnerResourceReferenceRecords.push(record);
      return record;
    },
    findByPartnerReferenceId: async (input: {
      partnerOrganizationLinkId: string;
      partnerReferenceId: string;
    }) =>
      this.partnerResourceReferenceRecords.find(
        (record) =>
          record.partnerOrganizationLinkId === input.partnerOrganizationLinkId &&
          record.partnerReferenceId === input.partnerReferenceId
      ) ?? null,
    findByResource: async (input: {
      partnerOrganizationLinkId: string;
      resourceId: string;
      resourceType: PartnerResourceReferenceRecord["resourceType"];
    }) =>
      this.partnerResourceReferenceRecords.find(
        (record) =>
          record.partnerOrganizationLinkId === input.partnerOrganizationLinkId &&
          record.resourceId === input.resourceId &&
          record.resourceType === input.resourceType
      ) ?? null
  };

  readonly partnerHostedSessions = {
    create: async (record: PartnerHostedSessionRecord) => {
      this.partnerHostedSessionRecords.push(record);
      return record;
    },
    findById: async (id: string) => this.partnerHostedSessionRecords.find((record) => record.id === id) ?? null,
    findByLaunchTokenHash: async (launchTokenHash: string) =>
      this.partnerHostedSessionRecords.find((record) => record.launchTokenHash === launchTokenHash) ?? null,
    listByOrganizationId: async (organizationId: string) =>
      this.partnerHostedSessionRecords.filter((record) =>
        this.partnerLinkRecords.some(
          (link) => link.id === record.partnerOrganizationLinkId && link.organizationId === organizationId
        )
      ),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId: string) =>
      this.partnerHostedSessionRecords.filter((record) => record.partnerOrganizationLinkId === partnerOrganizationLinkId),
    update: async (id: string, updates: Partial<Omit<PartnerHostedSessionRecord, "id" | "partnerOrganizationLinkId" | "launchTokenHash" | "createdAt">>) => {
      const record = this.partnerHostedSessionRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Partner hosted session not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly partnerWebhookSubscriptions = {
    create: async (record: PartnerWebhookSubscriptionRecord) => {
      this.partnerWebhookSubscriptionRecords.push(record);
      return record;
    },
    findById: async (id: string) =>
      this.partnerWebhookSubscriptionRecords.find((record) => record.id === id) ?? null,
    listActiveByPartnerOrganizationLinkId: async (partnerOrganizationLinkId: string) =>
      this.partnerWebhookSubscriptionRecords.filter(
        (record) => record.partnerOrganizationLinkId === partnerOrganizationLinkId && record.status === "ACTIVE"
      ),
    listByPartnerOrganizationLinkIds: async (partnerOrganizationLinkIds: readonly string[]) =>
      this.partnerWebhookSubscriptionRecords.filter((record) =>
        partnerOrganizationLinkIds.includes(record.partnerOrganizationLinkId)
      ),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId: string) =>
      this.partnerWebhookSubscriptionRecords.filter((record) => record.partnerOrganizationLinkId === partnerOrganizationLinkId),
    update: async (id: string, updates: Partial<Omit<PartnerWebhookSubscriptionRecord, "id" | "partnerOrganizationLinkId" | "createdAt">>) => {
      const record = this.partnerWebhookSubscriptionRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Partner webhook subscription not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly partnerWebhookEvents = {
    create: async (record: PartnerWebhookEventRecord) => {
      this.partnerWebhookEventRecords.push(record);
      return record;
    },
    findById: async (id: string) => this.partnerWebhookEventRecords.find((record) => record.id === id) ?? null
  };

  readonly partnerWebhookDeliveries = {
    claimNextPending: async (now: string) => {
      const record =
        this.partnerWebhookDeliveryRecords.find(
          (entry) =>
            entry.status === "PENDING" ||
            (entry.status === "DELIVERING" &&
              Boolean(entry.nextAttemptAt) &&
              new Date(entry.nextAttemptAt!).getTime() <= new Date(now).getTime())
        ) ?? null;
      if (!record) return null;
      record.status = "DELIVERING";
      record.lastAttemptAt = now;
      return record;
    },
    create: async (record: PartnerWebhookDeliveryRecord) => {
      this.partnerWebhookDeliveryRecords.push(record);
      return record;
    },
    findById: async (id: string) =>
      this.partnerWebhookDeliveryRecords.find((record) => record.id === id) ?? null,
    listByPartnerOrganizationLinkIds: async (partnerOrganizationLinkIds: readonly string[]) =>
      this.partnerWebhookDeliveryRecords.filter((record) =>
        partnerOrganizationLinkIds.includes(record.partnerOrganizationLinkId)
      ),
    listByPartnerOrganizationLinkId: async (partnerOrganizationLinkId: string) =>
      this.partnerWebhookDeliveryRecords.filter((record) => record.partnerOrganizationLinkId === partnerOrganizationLinkId),
    update: async (id: string, updates: Partial<Omit<PartnerWebhookDeliveryRecord, "id" | "partnerWebhookEventId" | "partnerWebhookSubscriptionId" | "partnerOrganizationLinkId" | "createdAt">>) => {
      const record = this.partnerWebhookDeliveryRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Partner webhook delivery not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly partnerWebhookDeliveryAttempts = {
    create: async (record: PartnerWebhookDeliveryAttemptRecord) => {
      this.partnerWebhookDeliveryAttemptRecords.push(record);
      return record;
    },
    listByPartnerWebhookDeliveryId: async (partnerWebhookDeliveryId: string) =>
      this.partnerWebhookDeliveryAttemptRecords.filter(
        (record) => record.partnerWebhookDeliveryId === partnerWebhookDeliveryId
      )
  };
}
