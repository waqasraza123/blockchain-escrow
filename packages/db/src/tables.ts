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
  dealVersionAcceptances: "deal_version_acceptances",
  dealVersionFiles: "deal_version_files",
  dealVersionMilestones: "deal_version_milestones",
  dealVersionParties: "deal_version_parties",
  dealVersions: "deal_versions",
  draftDealParties: "draft_deal_parties",
  draftDeals: "draft_deals",
  files: "files",
  templates: "templates"
} as const;

export type Release2TableName =
  (typeof release2TableNames)[keyof typeof release2TableNames];

export const release4TableNames = {
  arbitratorRegistryEntryProjections: "arbitrator_registry_entry_projections",
  chainCursors: "chain_cursors",
  contractOwnershipProjections: "contract_ownership_projections",
  escrowAgreementProjections: "escrow_agreement_projections",
  feeVaultProjections: "fee_vault_projections",
  indexedBlocks: "indexed_blocks",
  indexedContractEvents: "indexed_contract_events",
  indexedTransactions: "indexed_transactions",
  protocolConfigProjections: "protocol_config_projections",
  tokenAllowlistEntryProjections: "token_allowlist_entry_projections"
} as const;

export type Release4TableName =
  (typeof release4TableNames)[keyof typeof release4TableNames];
