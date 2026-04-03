import type { OrganizationRole } from "@blockchain-escrow/shared";

const organizationRoleRank: Record<OrganizationRole, number> = {
  ADMIN: 2,
  MEMBER: 1,
  OWNER: 3
};

export function hasMinimumOrganizationRole(
  currentRole: OrganizationRole,
  minimumRole: OrganizationRole
): boolean {
  return organizationRoleRank[currentRole] >= organizationRoleRank[minimumRole];
}
