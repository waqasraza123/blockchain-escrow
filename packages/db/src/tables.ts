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
  dealMilestoneReviewDeadlineExpiries: "deal_milestone_review_deadline_expiries",
  dealMilestoneDisputeAssignments: "deal_milestone_dispute_assignments",
  dealMilestoneDisputeDecisions: "deal_milestone_dispute_decisions",
  dealMilestoneDisputeEvidence: "deal_milestone_dispute_evidence",
  dealMilestoneDisputes: "deal_milestone_disputes",
  dealMilestoneReviews: "deal_milestone_reviews",
  dealMilestoneSettlementExecutionTransactions:
    "deal_milestone_settlement_execution_transactions",
  dealMilestoneSettlementPreparations: "deal_milestone_settlement_preparations",
  dealMilestoneSettlementRequests: "deal_milestone_settlement_requests",
  counterparties: "counterparties",
  dealMilestoneSubmissionFiles: "deal_milestone_submission_files",
  dealMilestoneSubmissions: "deal_milestone_submissions",
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

export const release8TableNames = {
  complianceCaseNotes: "compliance_case_notes",
  complianceCases: "compliance_cases",
  complianceCheckpoints: "compliance_checkpoints",
  operatorAccounts: "operator_accounts",
  operatorAlerts: "operator_alerts",
  protocolProposalDrafts: "protocol_proposal_drafts"
} as const;

export type Release8TableName =
  (typeof release8TableNames)[keyof typeof release8TableNames];

export const release9TableNames = {
  approvalPolicies: "approval_policies",
  approvalPolicySteps: "approval_policy_steps",
  approvalRequests: "approval_requests",
  approvalRequestSteps: "approval_request_steps",
  costCenters: "cost_centers",
  financeExportArtifacts: "finance_export_artifacts",
  financeExportJobs: "finance_export_jobs",
  statementSnapshots: "statement_snapshots"
} as const;

export type Release9TableName =
  (typeof release9TableNames)[keyof typeof release9TableNames];

export const release10TableNames = {
  partnerAccounts: "partner_accounts",
  partnerApiKeys: "partner_api_keys",
  partnerHostedSessions: "partner_hosted_sessions",
  partnerIdempotencyKeys: "partner_idempotency_keys",
  partnerOrganizationLinks: "partner_organization_links",
  partnerResourceReferences: "partner_resource_references",
  partnerWebhookDeliveries: "partner_webhook_deliveries",
  partnerWebhookDeliveryAttempts: "partner_webhook_delivery_attempts",
  partnerWebhookEvents: "partner_webhook_events",
  partnerWebhookSubscriptions: "partner_webhook_subscriptions"
} as const;

export type Release10TableName =
  (typeof release10TableNames)[keyof typeof release10TableNames];

export const release11TableNames = {
  billingFeeScheduleTiers: "billing_fee_schedule_tiers",
  billingFeeSchedules: "billing_fee_schedules",
  billingPlans: "billing_plans",
  billingUsageMeterEvents: "billing_usage_meter_events",
  partnerBrandAssets: "partner_brand_assets",
  partnerTenantSettings: "partner_tenant_settings",
  tenantBillingPlanAssignments: "tenant_billing_plan_assignments",
  tenantDomains: "tenant_domains",
  tenantInvoiceLineItems: "tenant_invoice_line_items",
  tenantInvoices: "tenant_invoices"
} as const;

export type Release11TableName =
  (typeof release11TableNames)[keyof typeof release11TableNames];

export const release12TableNames = {
  gasPolicies: "gas_policies",
  sponsoredTransactionRequests: "sponsored_transaction_requests",
  walletProfiles: "wallet_profiles"
} as const;

export type Release12TableName =
  (typeof release12TableNames)[keyof typeof release12TableNames];

export const release4TableNames = {
  arbitratorRegistryEntryProjections: "arbitrator_registry_entry_projections",
  chainCursors: "chain_cursors",
  contractOwnershipProjections: "contract_ownership_projections",
  escrowAgreementProjections: "escrow_agreement_projections",
  escrowAgreementMilestoneSettlementProjections:
    "escrow_agreement_milestone_settlement_projections",
  feeVaultProjections: "fee_vault_projections",
  indexedBlocks: "indexed_blocks",
  indexedContractEvents: "indexed_contract_events",
  indexedTransactions: "indexed_transactions",
  protocolConfigProjections: "protocol_config_projections",
  tokenAllowlistEntryProjections: "token_allowlist_entry_projections"
} as const;

export type Release4TableName =
  (typeof release4TableNames)[keyof typeof release4TableNames];
