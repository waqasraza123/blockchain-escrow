import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuditLogRecord,
  PartnerWebhookDeliveryAttemptRecord,
  PartnerWebhookDeliveryRecord,
  PartnerWebhookEventRecord,
  PartnerWebhookSubscriptionRecord,
  Release1Repositories,
  Release10Repositories
} from "@blockchain-escrow/db";

import type { WorkerPartnerWebhookConfiguration } from "../src/config";
import {
  PartnerWebhookDeliveryReconciler,
  type PartnerWebhookDeliveryReconciliationResult
} from "../src/partner-webhook-delivery-reconciler";

const configuration: WorkerPartnerWebhookConfiguration = {
  maxAttempts: 3,
  requestTimeoutMs: 1000,
  retryBaseDelaySeconds: 60
};

function createRelease1Repositories(auditLogs: AuditLogRecord[]) {
  return {
    repositories: {
      auditLogs: {
        append: async (record: AuditLogRecord) => {
          auditLogs.push(record);
          return record;
        }
      }
    } as unknown as Release1Repositories
  };
}

function createRelease10Repositories(input?: {
  attempts?: PartnerWebhookDeliveryAttemptRecord[];
  delivery?: PartnerWebhookDeliveryRecord | null;
  event?: PartnerWebhookEventRecord | null;
  subscription?: PartnerWebhookSubscriptionRecord | null;
}) {
  const attempts = [...(input?.attempts ?? [])];
  const delivery = input?.delivery ?? null;
  const event = input?.event ?? null;
  const subscription = input?.subscription ?? null;

  return {
    attempts,
    delivery,
    repositories: {
      partnerWebhookDeliveries: {
        claimNextPending: async () => delivery,
        update: async (_id: string, updates: Partial<PartnerWebhookDeliveryRecord>) => {
          if (!delivery) {
            throw new Error("missing delivery");
          }
          Object.assign(delivery, updates);
          return delivery;
        }
      },
      partnerWebhookDeliveryAttempts: {
        create: async (record: PartnerWebhookDeliveryAttemptRecord) => {
          attempts.push(record);
          return record;
        },
        listByPartnerWebhookDeliveryId: async () => attempts
      },
      partnerWebhookEvents: {
        findById: async () => event
      },
      partnerWebhookSubscriptions: {
        findById: async () => subscription,
        update: async (_id: string, updates: Partial<PartnerWebhookSubscriptionRecord>) => {
          if (!subscription) {
            throw new Error("missing subscription");
          }
          Object.assign(subscription, updates);
          return subscription;
        }
      }
    } as unknown as Release10Repositories
  };
}

test("PartnerWebhookDeliveryReconciler marks successful deliveries", async () => {
  const now = "2026-04-10T10:00:00.000Z";
  const auditLogs: AuditLogRecord[] = [];
  const release1 = createRelease1Repositories(auditLogs);
  const release10 = createRelease10Repositories({
    delivery: {
      createdAt: "2026-04-10T09:59:00.000Z",
      deliveredAt: null,
      errorMessage: null,
      id: "delivery-1",
      lastAttemptAt: null,
      nextAttemptAt: now,
      partnerOrganizationLinkId: "link-1",
      partnerWebhookEventId: "event-1",
      partnerWebhookSubscriptionId: "subscription-1",
      status: "DELIVERING"
    },
    event: {
      createdAt: "2026-04-10T09:58:00.000Z",
      draftDealId: "draft-1",
      eventType: "draft.deal.created",
      hostedSessionId: null,
      id: "event-1",
      organizationId: "org-1",
      partnerOrganizationLinkId: "link-1",
      payload: { draftDealId: "draft-1" }
    },
    subscription: {
      createdAt: "2026-04-10T09:57:00.000Z",
      displayName: "Primary",
      endpointUrl: "https://partner.test/webhooks",
      eventTypes: ["draft.deal.created"],
      id: "subscription-1",
      lastDeliveryAt: null,
      partnerOrganizationLinkId: "link-1",
      secretHash: "secret",
      status: "ACTIVE",
      updatedAt: "2026-04-10T09:57:00.000Z"
    }
  });

  const reconciler = new PartnerWebhookDeliveryReconciler(
    release1.repositories,
    release10.repositories,
    configuration,
    (async () => new Response(null, { status: 202 })) as typeof fetch,
    () => now
  );

  const summary = await reconciler.reconcileOnce();

  assert.deepEqual(summary, {
    failedPartnerWebhookDeliveryCount: 0,
    processedPartnerWebhookDeliveryCount: 1,
    succeededPartnerWebhookDeliveryCount: 1
  } satisfies PartnerWebhookDeliveryReconciliationResult);
  assert.equal(release10.delivery?.status, "SUCCEEDED");
  assert.equal(release10.attempts.length, 1);
  assert.equal(auditLogs[0]?.action, "PARTNER_WEBHOOK_DELIVERY_SUCCEEDED");
});

test("PartnerWebhookDeliveryReconciler schedules retries on delivery failures", async () => {
  const now = "2026-04-10T10:00:00.000Z";
  const auditLogs: AuditLogRecord[] = [];
  const release1 = createRelease1Repositories(auditLogs);
  const release10 = createRelease10Repositories({
    attempts: [],
    delivery: {
      createdAt: "2026-04-10T09:59:00.000Z",
      deliveredAt: null,
      errorMessage: null,
      id: "delivery-1",
      lastAttemptAt: null,
      nextAttemptAt: now,
      partnerOrganizationLinkId: "link-1",
      partnerWebhookEventId: "event-1",
      partnerWebhookSubscriptionId: "subscription-1",
      status: "DELIVERING"
    },
    event: {
      createdAt: "2026-04-10T09:58:00.000Z",
      draftDealId: "draft-1",
      eventType: "draft.deal.created",
      hostedSessionId: null,
      id: "event-1",
      organizationId: "org-1",
      partnerOrganizationLinkId: "link-1",
      payload: { draftDealId: "draft-1" }
    },
    subscription: {
      createdAt: "2026-04-10T09:57:00.000Z",
      displayName: "Primary",
      endpointUrl: "https://partner.test/webhooks",
      eventTypes: ["draft.deal.created"],
      id: "subscription-1",
      lastDeliveryAt: null,
      partnerOrganizationLinkId: "link-1",
      secretHash: "secret",
      status: "ACTIVE",
      updatedAt: "2026-04-10T09:57:00.000Z"
    }
  });

  const reconciler = new PartnerWebhookDeliveryReconciler(
    release1.repositories,
    release10.repositories,
    configuration,
    (async () => new Response(null, { status: 500 })) as typeof fetch,
    () => now
  );

  const summary = await reconciler.reconcileOnce();

  assert.deepEqual(summary, {
    failedPartnerWebhookDeliveryCount: 1,
    processedPartnerWebhookDeliveryCount: 1,
    succeededPartnerWebhookDeliveryCount: 0
  } satisfies PartnerWebhookDeliveryReconciliationResult);
  assert.equal(release10.delivery?.status, "PENDING");
  assert.equal(release10.attempts.length, 1);
  assert.equal(release10.attempts[0]?.responseStatusCode, 500);
  assert.equal(auditLogs[0]?.action, "PARTNER_WEBHOOK_DELIVERY_FAILED");
});
