import { randomUUID } from "node:crypto";

import type {
  CounterpartyRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  TemplateRecord
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createTemplateSchema,
  organizationTemplateParamsSchema,
  organizationTemplatesParamsSchema,
  type CreateTemplateResponse,
  type ListTemplatesResponse,
  type TemplateDetailResponse,
  type TemplateSummary
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

function normalizeTemplateName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function toTemplateSummary(template: TemplateRecord): TemplateSummary {
  return {
    bodyMarkdown: template.bodyMarkdown,
    createdAt: template.createdAt,
    createdByUserId: template.createdByUserId,
    defaultCounterpartyId: template.defaultCounterpartyId,
    description: template.description,
    id: template.id,
    name: template.name,
    organizationId: template.organizationId,
    updatedAt: template.updatedAt
  };
}

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listTemplates(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListTemplatesResponse> {
    const parsed = organizationTemplatesParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const templates = await this.repositories.templates.listByOrganizationId(
      parsed.data.organizationId
    );

    return {
      templates: templates.map(toTemplateSummary)
    };
  }

  async getTemplate(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<TemplateDetailResponse> {
    const parsed = organizationTemplateParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const template = await this.repositories.templates.findById(parsed.data.templateId);

    if (!template || template.organizationId !== parsed.data.organizationId) {
      throw new NotFoundException("template not found");
    }

    return {
      template: toTemplateSummary(template)
    };
  }

  async createTemplate(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateTemplateResponse> {
    const parsed = createTemplateSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const normalizedName = normalizeTemplateName(parsed.data.name);
    const existing =
      await this.repositories.templates.findByOrganizationIdAndNormalizedName(
        organizationId,
        normalizedName
      );

    if (existing) {
      throw new ConflictException("template name already exists");
    }

    let defaultCounterparty: CounterpartyRecord | null = null;

    if (parsed.data.defaultCounterpartyId) {
      defaultCounterparty = await this.repositories.counterparties.findById(
        parsed.data.defaultCounterpartyId
      );

      if (!defaultCounterparty || defaultCounterparty.organizationId !== organizationId) {
        throw new NotFoundException("counterparty not found");
      }
    }

    const now = new Date().toISOString();
    const template = await this.repositories.templates.create({
      bodyMarkdown: parsed.data.bodyMarkdown,
      createdAt: now,
      createdByUserId: authorized.actor.user.id,
      defaultCounterpartyId: defaultCounterparty?.id ?? null,
      description: parsed.data.description ?? null,
      id: randomUUID(),
      name: parsed.data.name,
      normalizedName,
      organizationId,
      updatedAt: now
    });

    await this.repositories.auditLogs.append({
      action: "TEMPLATE_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: template.id,
      entityType: "TEMPLATE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        defaultCounterpartyId: template.defaultCounterpartyId,
        descriptionPresent: template.description !== null,
        name: template.name
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      template: toTemplateSummary(template)
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
