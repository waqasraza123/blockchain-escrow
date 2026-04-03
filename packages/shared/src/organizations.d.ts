import { z } from "zod";
import type { EntityId, IsoTimestamp } from "./primitives";
export declare const organizationRoleSchema: z.ZodEnum<["OWNER", "ADMIN", "MEMBER"]>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export declare const organizationInviteStatusSchema: z.ZodEnum<["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]>;
export type OrganizationInviteStatus = z.infer<typeof organizationInviteStatusSchema>;
export declare const createOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export declare const createOrganizationInviteSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["OWNER", "ADMIN", "MEMBER"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
}, {
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
}>;
export type CreateOrganizationInviteInput = z.infer<typeof createOrganizationInviteSchema>;
export declare const updateOrganizationMemberRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["OWNER", "ADMIN", "MEMBER"]>;
}, "strip", z.ZodTypeAny, {
    role: "OWNER" | "ADMIN" | "MEMBER";
}, {
    role: "OWNER" | "ADMIN" | "MEMBER";
}>;
export type UpdateOrganizationMemberRoleInput = z.infer<typeof updateOrganizationMemberRoleSchema>;
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
