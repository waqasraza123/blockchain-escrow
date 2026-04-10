import { randomBytes, randomUUID } from "node:crypto";

import type { Release10Repositories } from "@blockchain-escrow/db";
import type {
  JsonObject,
  PartnerWebhookEventType,
  PartnerWebhookSubscriptionSummary
} from "@blockchain-escrow/shared";
import { Inject, Injectable } from "@nestjs/common";

import { RELEASE10_REPOSITORIES } from "../../infrastructure/tokens";

function randomSecret(): string {
  return randomBytes(24).toString("hex");
}

@Injectable()
export class PartnerEventsService {
  constructor(
    @Inject(RELEASE10_REPOSITORIES)
    private readonly release10Repositories: Release10Repositories
  ) {}

  createWebhookSecret(): string {
    return randomSecret();
  }

  async emitEvent(input: {
    draftDealId?: string | null;
    eventType: PartnerWebhookEventType;
    hostedSessionId?: string | null;
    organizationId: string;
    partnerOrganizationLinkId: string;
    payload: unknown;
  }): Promise<void> {
    const now = new Date().toISOString();
    const event = await this.release10Repositories.partnerWebhookEvents.create({
      createdAt: now,
      draftDealId: input.draftDealId ?? null,
      eventType: input.eventType,
      hostedSessionId: input.hostedSessionId ?? null,
      id: randomUUID(),
      organizationId: input.organizationId,
      partnerOrganizationLinkId: input.partnerOrganizationLinkId,
      payload: input.payload as JsonObject
    });
    const subscriptions =
      await this.release10Repositories.partnerWebhookSubscriptions.listActiveByPartnerOrganizationLinkId(
        input.partnerOrganizationLinkId
      );

    await Promise.all(
      subscriptions
        .filter((subscription) => subscription.eventTypes.includes(input.eventType))
        .map((subscription) =>
          this.release10Repositories.partnerWebhookDeliveries.create({
            createdAt: now,
            deliveredAt: null,
            errorMessage: null,
            id: randomUUID(),
            lastAttemptAt: null,
            nextAttemptAt: now,
            partnerOrganizationLinkId: input.partnerOrganizationLinkId,
            partnerWebhookEventId: event.id,
            partnerWebhookSubscriptionId: subscription.id,
            status: "PENDING"
          })
        )
    );
  }

  async listSubscriptionsForOrganization(
    organizationId: string
  ): Promise<PartnerWebhookSubscriptionSummary[]> {
    const links =
      await this.release10Repositories.partnerOrganizationLinks.listByOrganizationId(
        organizationId
      );
    const subscriptions =
      await this.release10Repositories.partnerWebhookSubscriptions.listByPartnerOrganizationLinkIds(
        links.map((link) => link.id)
      );

    return subscriptions.map((record) => ({
      createdAt: record.createdAt,
      displayName: record.displayName,
      endpointUrl: record.endpointUrl,
      eventTypes: record.eventTypes,
      id: record.id,
      lastDeliveryAt: record.lastDeliveryAt,
      partnerOrganizationLinkId: record.partnerOrganizationLinkId,
      status: record.status,
      updatedAt: record.updatedAt
    }));
  }
}
