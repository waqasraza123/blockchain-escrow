"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrganizationMemberRoleSchema = exports.createOrganizationInviteSchema = exports.createOrganizationSchema = exports.organizationInviteStatusSchema = exports.organizationRoleSchema = void 0;
const zod_1 = require("zod");
exports.organizationRoleSchema = zod_1.z.enum(["OWNER", "ADMIN", "MEMBER"]);
exports.organizationInviteStatusSchema = zod_1.z.enum([
    "PENDING",
    "ACCEPTED",
    "REVOKED",
    "EXPIRED"
]);
exports.createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120),
    slug: zod_1.z.string().trim().min(3).max(63).regex(/^[a-z0-9-]+$/)
});
exports.createOrganizationInviteSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email(),
    role: exports.organizationRoleSchema
});
exports.updateOrganizationMemberRoleSchema = zod_1.z.object({
    role: exports.organizationRoleSchema
});
//# sourceMappingURL=organizations.js.map