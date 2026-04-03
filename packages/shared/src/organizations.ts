import { z } from "zod";

import type { EntityId, IsoTimestamp } from "./primitives";

export const organizationRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const organizationInviteStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED"
]);
export type OrganizationInviteStatus = z.infer<
  typeof organizationInviteStatusSchema
>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(63).regex(/^[a-z0-9-]+$/)
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createOrganizationInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: organizationRoleSchema
});
export type CreateOrganizationInviteInput = z.infer<
  typeof createOrganizationInviteSchema
>;

export const updateOrganizationMemberRoleSchema = z.object({
  role: organizationRoleSchema
});
export type UpdateOrganizationMemberRoleInput = z.infer<
  typeof updateOrganizationMemberRoleSchema
>;

export interface OrganizationSummary {
  id: EntityId;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  name: string;
  slug: string;
  updatedAt: IsoTimestamp;
}

export interface OrganizationMembershipSummary {
  joinedAt: IsoTimestamp;
  organizationId: EntityId;
  role: OrganizationRole;
  userId: EntityId;
}

export interface OrganizationMemberSummary {
  email: string | null;
  joinedAt: IsoTimestamp;
  memberId: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  userId: EntityId;
}

export interface OrganizationInviteSummary {
  acceptedAt: IsoTimestamp | null;
  email: string;
  expiresAt: IsoTimestamp;
  id: EntityId;
  invitedByUserId: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  status: OrganizationInviteStatus;
}
