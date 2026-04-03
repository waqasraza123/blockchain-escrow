import { createHash, randomBytes, randomUUID } from "node:crypto";

import type {
  Release1Repositories,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  acceptOrganizationInviteSchema,
  createOrganizationInviteSchema,
  createOrganizationSchema,
  updateOrganizationMemberRoleSchema,
  type AcceptOrganizationInviteResponse,
  type CreateOrganizationInviteResponse,
  type CreateOrganizationResponse,
  type ListOrganizationMembershipsResponse,
  type OrganizationDetailResponse,
  type OrganizationInviteSummary,
  type OrganizationMemberSummary,
  type OrganizationMembershipSummary,
  type OrganizationSummary,
  type RemoveOrganizationMemberResponse,
  type RevokeOrganizationInviteResponse,
  type UpdateOrganizationMemberRoleResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";

const organizationInviteTtlSeconds = 60 * 60 * 24 * 7;

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function hashOpaqueToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toOrganizationSummary(
  organization: OrganizationRecord
): OrganizationSummary {
  return {
    createdAt: organization.createdAt,
    createdByUserId: organization.createdByUserId,
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    updatedAt: organization.updatedAt
  };
}

function toMembershipSummary(
  membership: OrganizationMemberRecord
): OrganizationMembershipSummary {
  return {
    joinedAt: membership.createdAt,
    organizationId: membership.organizationId,
    role: membership.role,
    userId: membership.userId
  };
}

function toMemberSummary(
  membership: OrganizationMemberRecord
): OrganizationMemberSummary {
  return {
    email: null,
    joinedAt: membership.createdAt,
    memberId: membership.id,
    organizationId: membership.organizationId,
    role: membership.role,
    userId: membership.userId
  };
}

function toInviteSummary(invite: OrganizationInviteRecord): OrganizationInviteSummary {
  return {
    acceptedAt: invite.acceptedAt,
    email: invite.email,
    expiresAt: invite.expiresAt,
    id: invite.id,
    invitedByUserId: invite.invitedByUserId,
    organizationId: invite.organizationId,
    role: invite.role,
    status: invite.status
  };
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listMemberships(
    requestMetadata: RequestMetadata
  ): Promise<ListOrganizationMembershipsResponse> {
    const { user } = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const [organizations, memberships] = await Promise.all([
      this.repositories.organizations.listByUserId(user.id),
      this.repositories.organizationMembers.listByUserId(user.id)
    ]);
    const membershipsByOrganizationId = new Map(
      memberships.map((membership) => [membership.organizationId, membership])
    );

    return {
      organizations: organizations.flatMap((organization) => {
        const membership = membershipsByOrganizationId.get(organization.id);

        if (!membership) {
          return [];
        }

        return [
          {
            membership: toMembershipSummary(membership),
            organization: toOrganizationSummary(organization)
          }
        ];
      })
    };
  }

  async getOrganizationDetail(
    organizationId: string,
    requestMetadata: RequestMetadata
  ): Promise<OrganizationDetailResponse> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata
    );

    return this.buildOrganizationDetailResponse(
      authorized.organization,
      authorized.membership
    );
  }

  async createOrganization(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateOrganizationResponse> {
    const parsed = createOrganizationSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actorContext = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const existing = await this.repositories.organizations.findBySlug(parsed.data.slug);

    if (existing) {
      throw new ConflictException("organization slug already exists");
    }

    const now = new Date().toISOString();
    const organization = await this.repositories.organizations.create({
      createdAt: now,
      createdByUserId: actorContext.user.id,
      id: randomUUID(),
      name: parsed.data.name,
      slug: parsed.data.slug,
      updatedAt: now
    });
    const membership = await this.repositories.organizationMembers.add({
      createdAt: now,
      id: randomUUID(),
      organizationId: organization.id,
      role: "OWNER",
      updatedAt: now,
      userId: actorContext.user.id
    });

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_CREATED",
      actorUserId: actorContext.user.id,
      entityId: organization.id,
      entityType: "ORGANIZATION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        ownerUserId: actorContext.user.id,
        slug: organization.slug
      },
      occurredAt: now,
      organizationId: organization.id,
      userAgent: requestMetadata.userAgent
    });

    return this.buildOrganizationDetailResponse(organization, membership);
  }

  async createInvite(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateOrganizationInviteResponse> {
    const parsed = createOrganizationInviteSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );

    if (parsed.data.role === "OWNER" && authorized.membership.role !== "OWNER") {
      throw new ForbiddenException("only an owner can invite another owner");
    }

    const existingPending =
      await this.repositories.organizationInvites.findPendingByOrganizationIdAndEmail(
        organizationId,
        parsed.data.email
      );

    if (existingPending) {
      throw new ConflictException("a pending invite already exists for this email");
    }

    const now = new Date();
    const inviteToken = randomBytes(32).toString("base64url");
    const invite = await this.repositories.organizationInvites.create({
      acceptedAt: null,
      createdAt: now.toISOString(),
      email: parsed.data.email,
      expiresAt: addSeconds(now, organizationInviteTtlSeconds).toISOString(),
      id: randomUUID(),
      invitedByUserId: authorized.actor.user.id,
      organizationId,
      role: parsed.data.role,
      status: "PENDING",
      tokenHash: hashOpaqueToken(inviteToken),
      updatedAt: now.toISOString()
    });

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_INVITE_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: invite.id,
      entityType: "ORGANIZATION_INVITE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        email: invite.email,
        role: invite.role
      },
      occurredAt: now.toISOString(),
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      invite: toInviteSummary(invite),
      inviteToken
    };
  }

  async acceptInvite(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<AcceptOrganizationInviteResponse> {
    const parsed = acceptOrganizationInviteSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const invite = await this.repositories.organizationInvites.findByTokenHash(
      hashOpaqueToken(parsed.data.inviteToken)
    );

    if (!invite) {
      throw new NotFoundException("organization invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new BadRequestException("organization invite is not pending");
    }

    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException("organization invite has expired");
    }

    const [organization, existingMembership] = await Promise.all([
      this.repositories.organizations.findById(invite.organizationId),
      this.repositories.organizationMembers.findMembership(
        invite.organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (existingMembership) {
      throw new ConflictException("user is already a member of this organization");
    }

    const acceptedInvite = await this.repositories.organizationInvites.accept(invite.id);

    if (!acceptedInvite) {
      throw new InternalServerErrorException("organization invite could not be accepted");
    }

    const now = new Date().toISOString();
    const membership = await this.repositories.organizationMembers.add({
      createdAt: now,
      id: randomUUID(),
      organizationId: invite.organizationId,
      role: invite.role,
      updatedAt: now,
      userId: actor.user.id
    });

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_INVITE_ACCEPTED",
      actorUserId: actor.user.id,
      entityId: acceptedInvite.id,
      entityType: "ORGANIZATION_INVITE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        memberId: membership.id,
        role: membership.role,
        userId: actor.user.id
      },
      occurredAt: now,
      organizationId: invite.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return this.buildOrganizationDetailResponse(organization, membership);
  }

  async revokeInvite(
    organizationId: string,
    inviteId: string,
    requestMetadata: RequestMetadata
  ): Promise<RevokeOrganizationInviteResponse> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const invite = await this.repositories.organizationInvites.findById(inviteId);

    if (!invite || invite.organizationId !== organizationId) {
      throw new NotFoundException("organization invite not found");
    }

    if (invite.role === "OWNER" && authorized.membership.role !== "OWNER") {
      throw new ForbiddenException("only an owner can revoke an owner invite");
    }

    if (invite.status !== "PENDING") {
      throw new BadRequestException("only pending invites can be revoked");
    }

    const revoked = await this.repositories.organizationInvites.revoke(invite.id);

    if (!revoked) {
      throw new InternalServerErrorException("organization invite could not be revoked");
    }

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_INVITE_REVOKED",
      actorUserId: authorized.actor.user.id,
      entityId: revoked.id,
      entityType: "ORGANIZATION_INVITE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        email: revoked.email,
        role: revoked.role
      },
      occurredAt: new Date().toISOString(),
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      invite: toInviteSummary(revoked)
    };
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    requestMetadata: RequestMetadata
  ): Promise<RemoveOrganizationMemberResponse> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const member = await this.repositories.organizationMembers.findById(memberId);

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException("organization member not found");
    }

    if (member.role === "OWNER" && authorized.membership.role !== "OWNER") {
      throw new ForbiddenException("only an owner can remove an owner");
    }

    if (member.role === "OWNER") {
      const members = await this.repositories.organizationMembers.listByOrganizationId(
        organizationId
      );
      const ownerCount = members.filter(
        (organizationMember) => organizationMember.role === "OWNER"
      ).length;

      if (ownerCount === 1) {
        throw new BadRequestException("cannot remove the last owner");
      }
    }

    const removed = await this.repositories.organizationMembers.remove(member.id);

    if (!removed) {
      throw new InternalServerErrorException("organization member could not be removed");
    }

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_MEMBER_REMOVED",
      actorUserId: authorized.actor.user.id,
      entityId: removed.id,
      entityType: "ORGANIZATION_MEMBER",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        removedRole: removed.role,
        removedUserId: removed.userId
      },
      occurredAt: new Date().toISOString(),
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      member: toMemberSummary(removed)
    };
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateOrganizationMemberRoleResponse> {
    const parsed = updateOrganizationMemberRoleSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const member = await this.repositories.organizationMembers.findById(memberId);

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException("organization member not found");
    }

    if (
      (member.role === "OWNER" || parsed.data.role === "OWNER") &&
      authorized.membership.role !== "OWNER"
    ) {
      throw new ForbiddenException("only an owner can manage owner roles");
    }

    if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
      const members = await this.repositories.organizationMembers.listByOrganizationId(
        organizationId
      );
      const ownerCount = members.filter(
        (organizationMember) => organizationMember.role === "OWNER"
      ).length;

      if (ownerCount === 1) {
        throw new BadRequestException("cannot demote the last owner");
      }
    }

    if (member.role === parsed.data.role) {
      return {
        member: toMemberSummary(member)
      };
    }

    const updated = await this.repositories.organizationMembers.updateRole(
      member.id,
      parsed.data.role
    );

    if (!updated) {
      throw new InternalServerErrorException("organization member could not be updated");
    }

    await this.repositories.auditLogs.append({
      action: "ORGANIZATION_MEMBER_ROLE_UPDATED",
      actorUserId: authorized.actor.user.id,
      entityId: updated.id,
      entityType: "ORGANIZATION_MEMBER",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        fromRole: member.role,
        toRole: updated.role,
        userId: updated.userId
      },
      occurredAt: new Date().toISOString(),
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      member: toMemberSummary(updated)
    };
  }

  private async buildOrganizationDetailResponse(
    organization: OrganizationRecord,
    membership: OrganizationMemberRecord
  ): Promise<OrganizationDetailResponse> {
    const [members, pendingInvites] = await Promise.all([
      this.repositories.organizationMembers.listByOrganizationId(organization.id),
      this.repositories.organizationInvites.listPendingByOrganizationId(organization.id)
    ]);

    return {
      currentMembership: toMembershipSummary(membership),
      members: members.map(toMemberSummary),
      organization: toOrganizationSummary(organization),
      pendingInvites: pendingInvites.map(toInviteSummary)
    };
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: Awaited<ReturnType<AuthenticatedSessionService["requireContext"]>>;
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
