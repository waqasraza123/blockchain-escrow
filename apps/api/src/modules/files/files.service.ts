import { randomUUID } from "node:crypto";

import type {
  FileRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createFileSchema,
  organizationFileParamsSchema,
  organizationFilesParamsSchema,
  type CreateFileResponse,
  type FileDetailResponse,
  type FileSummary,
  type ListFilesResponse
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

function toFileSummary(file: FileRecord): FileSummary {
  return {
    byteSize: file.byteSize,
    category: file.category,
    createdAt: file.createdAt,
    createdByUserId: file.createdByUserId,
    id: file.id,
    mediaType: file.mediaType,
    organizationId: file.organizationId,
    originalFilename: file.originalFilename,
    sha256Hex: file.sha256Hex,
    storageKey: file.storageKey,
    updatedAt: file.updatedAt
  };
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listFiles(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListFilesResponse> {
    const parsed = organizationFilesParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const files = await this.repositories.files.listByOrganizationId(
      parsed.data.organizationId
    );

    return {
      files: files.map(toFileSummary)
    };
  }

  async getFile(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<FileDetailResponse> {
    const parsed = organizationFileParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const file = await this.repositories.files.findById(parsed.data.fileId);

    if (!file || file.organizationId !== parsed.data.organizationId) {
      throw new NotFoundException("file not found");
    }

    return {
      file: toFileSummary(file)
    };
  }

  async createFile(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFileResponse> {
    const parsed = createFileSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "MEMBER"
    );
    const existing = await this.repositories.files.findByOrganizationIdAndStorageKey(
      organizationId,
      parsed.data.storageKey
    );

    if (existing) {
      throw new ConflictException("file storage key already exists");
    }

    const now = new Date().toISOString();
    const file = await this.repositories.files.create({
      byteSize: parsed.data.byteSize,
      category: parsed.data.category,
      createdAt: now,
      createdByUserId: authorized.actor.user.id,
      id: randomUUID(),
      mediaType: parsed.data.mediaType,
      organizationId,
      originalFilename: parsed.data.originalFilename,
      sha256Hex: parsed.data.sha256Hex,
      storageKey: parsed.data.storageKey,
      updatedAt: now
    });

    await this.repositories.auditLogs.append({
      action: "FILE_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: file.id,
      entityType: "FILE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        category: file.category,
        mediaType: file.mediaType,
        originalFilename: file.originalFilename,
        storageKey: file.storageKey
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      file: toFileSummary(file)
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
