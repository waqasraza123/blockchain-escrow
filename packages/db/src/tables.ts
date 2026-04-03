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

export const release2TableNames = {
  counterparties: "counterparties",
  files: "files"
} as const;

export type Release2TableName =
  (typeof release2TableNames)[keyof typeof release2TableNames];
