import { randomUUID } from "node:crypto";

import type {
  CounterpartyRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createCounterpartySchema,
  organizationCounterpartiesParamsSchema,
  organizationCounterpartyParamsSchema,
  type CounterpartyDetailResponse,
  type CounterpartySummary,
  type CreateCounterpartyResponse,
  type ListCounterpartiesResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";

function normalizeCounterpartyName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function toCounterpartySummary(
  counterparty: CounterpartyRecord
): CounterpartySummary {
  return {
    contactEmail: counterparty.contactEmail,
    createdAt: counterparty.createdAt,
    createdByUserId: counterparty.createdByUserId,
    id: counterparty.id,
    legalName: counterparty.legalName,
    name: counterparty.name,
    organizationId: counterparty.organizationId,
    updatedAt: counterparty.updatedAt
  };
}

@Injectable()
export class CounterpartiesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listCounterparties(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListCounterpartiesResponse> {
    const parsed = organizationCounterpartiesParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const counterparties = await this.repositories.counterparties.listByOrganizationId(
      parsed.data.organizationId
    );

    return {
      counterparties: counterparties.map(toCounterpartySummary)
    };
  }

  async getCounterparty(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CounterpartyDetailResponse> {
    const parsed = organizationCounterpartyParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const counterparty = await this.repositories.counterparties.findById(
      parsed.data.counterpartyId
    );

    if (
      !counterparty ||
      counterparty.organizationId !== parsed.data.organizationId
    ) {
      throw new NotFoundException("counterparty not found");
    }

    return {
      counterparty: toCounterpartySummary(counterparty)
    };
  }

  async createCounterparty(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateCounterpartyResponse> {
    const parsedInput = createCounterpartySchema.safeParse(input);

    if (!parsedInput.success) {
      throw new BadRequestException(parsedInput.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const normalizedName = normalizeCounterpartyName(parsedInput.data.name);
    const existing =
      await this.repositories.counterparties.findByOrganizationIdAndNormalizedName(
        organizationId,
        normalizedName
      );

    if (existing) {
      throw new ConflictException("counterparty name already exists");
    }

    const now = new Date().toISOString();
    const counterparty = await this.repositories.counterparties.create({
      contactEmail: parsedInput.data.contactEmail ?? null,
      createdAt: now,
      createdByUserId: authorized.actor.user.id,
      id: randomUUID(),
      legalName: parsedInput.data.legalName ?? null,
      name: parsedInput.data.name,
      normalizedName,
      organizationId,
      updatedAt: now
    });

    await this.repositories.auditLogs.append({
      action: "COUNTERPARTY_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: counterparty.id,
      entityType: "COUNTERPARTY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        contactEmail: counterparty.contactEmail ?? null,
        name: counterparty.name
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      counterparty: toCounterpartySummary(counterparty)
    };
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: AuthenticatedSessionContext;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
  }> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const [organization, membership] = await Promise.all([
      this.repositories.organizations.findById(organizationId),
      this.repositories.organizationMembers.findMembership(
        organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization access is required");
    }

    if (minimumRole && !hasMinimumOrganizationRole(membership.role, minimumRole)) {
      throw new ForbiddenException("organization role is insufficient");
    }

    return {
      actor,
      membership,
      organization
    };
  }
}
