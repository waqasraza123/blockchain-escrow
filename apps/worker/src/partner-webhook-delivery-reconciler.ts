import { createHmac, randomUUID } from "node:crypto";

import type { Release1Repositories, Release10Repositories } from "@blockchain-escrow/db";

import type { WorkerPartnerWebhookConfiguration } from "./config";

export interface PartnerWebhookDeliveryReconciliationResult {
  readonly failedPartnerWebhookDeliveryCount: number;
  readonly processedPartnerWebhookDeliveryCount: number;
  readonly succeededPartnerWebhookDeliveryCount: number;
}

type FetchLike = typeof fetch;

function addSeconds(value: string, seconds: number): string {
  return new Date(new Date(value).getTime() + seconds * 1000).toISOString();
}

export class PartnerWebhookDeliveryReconciler {
  constructor(
    private readonly release1Repositories: Release1Repositories,
    private readonly release10Repositories: Release10Repositories,
    private readonly configuration: WorkerPartnerWebhookConfiguration,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<PartnerWebhookDeliveryReconciliationResult> {
    const claimed = await this.release10Repositories.partnerWebhookDeliveries.claimNextPending(
      this.now()
    );

    if (!claimed) {
      return {
        failedPartnerWebhookDeliveryCount: 0,
        processedPartnerWebhookDeliveryCount: 0,
        succeededPartnerWebhookDeliveryCount: 0
      };
    }

    const [event, subscription, attempts] = await Promise.all([
      this.release10Repositories.partnerWebhookEvents.findById(claimed.partnerWebhookEventId),
      this.release10Repositories.partnerWebhookSubscriptions.findById(
        claimed.partnerWebhookSubscriptionId
      ),
      this.release10Repositories.partnerWebhookDeliveryAttempts.listByPartnerWebhookDeliveryId(
        claimed.id
      )
    ]);

    if (!event || !subscription) {
      await this.release10Repositories.partnerWebhookDeliveries.update(claimed.id, {
        errorMessage: "webhook delivery dependencies are missing",
        nextAttemptAt: null,
        status: "FAILED"
      });

      return {
        failedPartnerWebhookDeliveryCount: 1,
        processedPartnerWebhookDeliveryCount: 1,
        succeededPartnerWebhookDeliveryCount: 0
      };
    }

    const startedAt = this.now();
    const payload = JSON.stringify({
      createdAt: event.createdAt,
      data: event.payload,
      id: event.id,
      organizationId: event.organizationId,
      type: event.eventType
    });
    const signature = createHmac("sha256", subscription.secretHash)
      .update(payload)
      .digest("hex");

    try {
      const response = await this.fetchImpl(subscription.endpointUrl, {
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "X-Blockchain-Escrow-Delivery-Id": claimed.id,
          "X-Blockchain-Escrow-Event-Id": event.id,
          "X-Blockchain-Escrow-Event-Type": event.eventType,
          "X-Blockchain-Escrow-Signature": signature
        },
        method: "POST",
        signal: AbortSignal.timeout(this.configuration.requestTimeoutMs)
      });
      const finishedAt = this.now();
      const durationMs =
        new Date(finishedAt).getTime() - new Date(startedAt).getTime();

      if (!response.ok) {
        return this.failDelivery(
          claimed.id,
          subscription.partnerOrganizationLinkId,
          event.organizationId,
          attempts.length + 1,
          `partner webhook responded with ${response.status}`,
          response.status,
          durationMs,
          startedAt,
          finishedAt
        );
      }

      await this.release10Repositories.partnerWebhookDeliveryAttempts.create({
        attemptedAt: startedAt,
        durationMs,
        errorMessage: null,
        finishedAt,
        id: randomUUID(),
        nextRetryAt: null,
        partnerWebhookDeliveryId: claimed.id,
        responseStatusCode: response.status
      });
      await this.release10Repositories.partnerWebhookDeliveries.update(claimed.id, {
        deliveredAt: finishedAt,
        errorMessage: null,
        lastAttemptAt: finishedAt,
        nextAttemptAt: null,
        status: "SUCCEEDED"
      });
      await this.release10Repositories.partnerWebhookSubscriptions.update(subscription.id, {
        lastDeliveryAt: finishedAt,
        updatedAt: finishedAt
      });
      await this.release1Repositories.auditLogs.append({
        action: "PARTNER_WEBHOOK_DELIVERY_SUCCEEDED",
        actorUserId: null,
        entityId: claimed.id,
        entityType: "PARTNER_WEBHOOK_DELIVERY",
        id: randomUUID(),
        ipAddress: null,
        metadata: {
          eventType: event.eventType,
          responseStatusCode: response.status
        },
        occurredAt: finishedAt,
        organizationId: event.organizationId,
        userAgent: "worker:partner-webhook-delivery-reconciler"
      });

      return {
        failedPartnerWebhookDeliveryCount: 0,
        processedPartnerWebhookDeliveryCount: 1,
        succeededPartnerWebhookDeliveryCount: 1
      };
    } catch (error) {
      const finishedAt = this.now();
      const durationMs =
        new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      const message =
        error instanceof Error ? error.message : "partner webhook delivery failed";

      return this.failDelivery(
        claimed.id,
        subscription.partnerOrganizationLinkId,
        event.organizationId,
        attempts.length + 1,
        message,
        null,
        durationMs,
        startedAt,
        finishedAt
      );
    }
  }

  private async failDelivery(
    deliveryId: string,
    partnerOrganizationLinkId: string,
    organizationId: string,
    attemptNumber: number,
    errorMessage: string,
    responseStatusCode: number | null,
    durationMs: number,
    attemptedAt: string,
    finishedAt: string
  ): Promise<PartnerWebhookDeliveryReconciliationResult> {
    const terminal = attemptNumber >= this.configuration.maxAttempts;
    const nextRetryAt = terminal
      ? null
      : addSeconds(
          finishedAt,
          this.configuration.retryBaseDelaySeconds * 2 ** (attemptNumber - 1)
        );

    await this.release10Repositories.partnerWebhookDeliveryAttempts.create({
      attemptedAt,
      durationMs,
      errorMessage,
      finishedAt,
      id: randomUUID(),
      nextRetryAt,
      partnerWebhookDeliveryId: deliveryId,
      responseStatusCode
    });
    await this.release10Repositories.partnerWebhookDeliveries.update(deliveryId, {
      errorMessage,
      lastAttemptAt: finishedAt,
      nextAttemptAt: nextRetryAt,
      status: terminal ? "FAILED" : "PENDING"
    });
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_WEBHOOK_DELIVERY_FAILED",
      actorUserId: null,
      entityId: deliveryId,
      entityType: "PARTNER_WEBHOOK_DELIVERY",
      id: randomUUID(),
      ipAddress: null,
      metadata: {
        attemptNumber,
        errorMessage,
        partnerOrganizationLinkId,
        responseStatusCode
      },
      occurredAt: finishedAt,
      organizationId,
      userAgent: "worker:partner-webhook-delivery-reconciler"
    });

    return {
      failedPartnerWebhookDeliveryCount: 1,
      processedPartnerWebhookDeliveryCount: 1,
      succeededPartnerWebhookDeliveryCount: 0
    };
  }
}
