export const release1TableNames = {
  auditLogs: "audit_logs",
  organizationInvites: "organization_invites",
  organizationMembers: "organization_members",
  organizations: "organizations",
  sessions: "sessions",
  users: "users",
  walletNonces: "wallet_nonces",
  wallets: "wallets"
} as const;

export type Release1TableName =
  (typeof release1TableNames)[keyof typeof release1TableNames];
