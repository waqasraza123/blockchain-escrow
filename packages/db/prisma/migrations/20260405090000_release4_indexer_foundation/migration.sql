CREATE TYPE "IndexedContractName" AS ENUM (
  'TokenAllowlist',
  'ArbitratorRegistry',
  'ProtocolConfig',
  'FeeVault',
  'EscrowAgreement',
  'EscrowFactory'
);

CREATE TYPE "IndexedEventName" AS ENUM (
  'OwnershipTransferStarted',
  'OwnershipTransferred',
  'TokenStatusUpdated',
  'ArbitratorApprovalUpdated',
  'ArbitratorRegistryUpdated',
  'CreateEscrowPauseUpdated',
  'FeeVaultUpdated',
  'FundingPauseUpdated',
  'ProtocolFeeBpsUpdated',
  'TokenAllowlistUpdated',
  'TreasuryUpdated',
  'NativeFeesWithdrawn',
  'TokenFeesWithdrawn',
  'AgreementCreated',
  'AgreementInitialized'
);

CREATE TABLE "chain_cursors" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "cursorKey" TEXT NOT NULL,
  "nextBlockNumber" BIGINT NOT NULL,
  "lastProcessedBlockNumber" BIGINT,
  "lastProcessedBlockHash" TEXT,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "chain_cursors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "indexed_blocks" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "blockNumber" BIGINT NOT NULL,
  "blockHash" TEXT NOT NULL,
  "parentBlockHash" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ(3) NOT NULL,
  "indexedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "indexed_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "indexed_transactions" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "blockNumber" BIGINT NOT NULL,
  "blockHash" TEXT NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "transactionIndex" INTEGER NOT NULL,
  "fromAddress" TEXT,
  "toAddress" TEXT,
  "indexedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "indexed_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "indexed_contract_events" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "blockNumber" BIGINT NOT NULL,
  "blockHash" TEXT NOT NULL,
  "blockTimestamp" TIMESTAMPTZ(3) NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "transactionIndex" INTEGER NOT NULL,
  "logIndex" INTEGER NOT NULL,
  "contractAddress" TEXT NOT NULL,
  "contractName" "IndexedContractName" NOT NULL,
  "eventName" "IndexedEventName" NOT NULL,
  "topic0" TEXT NOT NULL,
  "topics" TEXT[],
  "data" JSONB NOT NULL,
  "indexedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "indexed_contract_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_ownership_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "contractAddress" TEXT NOT NULL,
  "contractName" "IndexedContractName" NOT NULL,
  "owner" TEXT NOT NULL,
  "pendingOwner" TEXT,
  "updatedBlockNumber" BIGINT NOT NULL,
  "updatedBlockHash" TEXT NOT NULL,
  "updatedTransactionHash" TEXT NOT NULL,
  "updatedLogIndex" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "contract_ownership_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "token_allowlist_entry_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenAllowlistAddress" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "isAllowed" BOOLEAN NOT NULL,
  "updatedBlockNumber" BIGINT NOT NULL,
  "updatedBlockHash" TEXT NOT NULL,
  "updatedTransactionHash" TEXT NOT NULL,
  "updatedLogIndex" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "token_allowlist_entry_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "arbitrator_registry_entry_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "arbitratorRegistryAddress" TEXT NOT NULL,
  "arbitrator" TEXT NOT NULL,
  "isApproved" BOOLEAN NOT NULL,
  "updatedBlockNumber" BIGINT NOT NULL,
  "updatedBlockHash" TEXT NOT NULL,
  "updatedTransactionHash" TEXT NOT NULL,
  "updatedLogIndex" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "arbitrator_registry_entry_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "protocol_config_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "protocolConfigAddress" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "pendingOwner" TEXT,
  "tokenAllowlistAddress" TEXT,
  "arbitratorRegistryAddress" TEXT,
  "feeVaultAddress" TEXT,
  "treasuryAddress" TEXT,
  "protocolFeeBps" INTEGER NOT NULL,
  "createEscrowPaused" BOOLEAN NOT NULL,
  "fundingPaused" BOOLEAN NOT NULL,
  "updatedBlockNumber" BIGINT NOT NULL,
  "updatedBlockHash" TEXT NOT NULL,
  "updatedTransactionHash" TEXT NOT NULL,
  "updatedLogIndex" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "protocol_config_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fee_vault_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "feeVaultAddress" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "pendingOwner" TEXT,
  "treasuryAddress" TEXT,
  "updatedBlockNumber" BIGINT NOT NULL,
  "updatedBlockHash" TEXT NOT NULL,
  "updatedTransactionHash" TEXT NOT NULL,
  "updatedLogIndex" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "fee_vault_projections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "escrow_agreement_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "agreementAddress" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "dealVersionHash" TEXT NOT NULL,
  "factoryAddress" TEXT NOT NULL,
  "protocolConfigAddress" TEXT NOT NULL,
  "buyerAddress" TEXT NOT NULL,
  "sellerAddress" TEXT NOT NULL,
  "settlementTokenAddress" TEXT NOT NULL,
  "arbitratorAddress" TEXT,
  "feeVaultAddress" TEXT NOT NULL,
  "protocolFeeBps" INTEGER NOT NULL,
  "totalAmount" TEXT NOT NULL,
  "milestoneCount" INTEGER NOT NULL,
  "createdBlockNumber" BIGINT NOT NULL,
  "createdBlockHash" TEXT NOT NULL,
  "createdTransactionHash" TEXT NOT NULL,
  "createdLogIndex" INTEGER NOT NULL,
  "initializedBlockNumber" BIGINT NOT NULL,
  "initializedBlockHash" TEXT NOT NULL,
  "initializedTransactionHash" TEXT NOT NULL,
  "initializedLogIndex" INTEGER NOT NULL,
  "initializedTimestamp" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "escrow_agreement_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chain_cursors_chain_id_cursor_key_key" ON "chain_cursors"("chainId", "cursorKey");
CREATE INDEX "chain_cursors_chain_id_idx" ON "chain_cursors"("chainId");

CREATE UNIQUE INDEX "indexed_blocks_chain_id_block_number_key" ON "indexed_blocks"("chainId", "blockNumber");
CREATE UNIQUE INDEX "indexed_blocks_chain_id_block_hash_key" ON "indexed_blocks"("chainId", "blockHash");
CREATE INDEX "indexed_blocks_chain_id_block_number_idx" ON "indexed_blocks"("chainId", "blockNumber");

CREATE UNIQUE INDEX "indexed_transactions_chain_id_transaction_hash_key" ON "indexed_transactions"("chainId", "transactionHash");
CREATE INDEX "indexed_transactions_chain_id_block_number_idx" ON "indexed_transactions"("chainId", "blockNumber");
CREATE INDEX "indexed_transactions_chain_id_transaction_hash_idx" ON "indexed_transactions"("chainId", "transactionHash");

CREATE UNIQUE INDEX "indexed_contract_events_chain_id_transaction_hash_log_index_key" ON "indexed_contract_events"("chainId", "transactionHash", "logIndex");
CREATE UNIQUE INDEX "indexed_contract_events_chain_id_block_number_log_index_key" ON "indexed_contract_events"("chainId", "blockNumber", "logIndex");
CREATE INDEX "indexed_contract_events_chain_id_block_number_order_idx" ON "indexed_contract_events"("chainId", "blockNumber", "transactionIndex", "logIndex");
CREATE INDEX "indexed_contract_events_chain_id_contract_address_idx" ON "indexed_contract_events"("chainId", "contractAddress");
CREATE INDEX "indexed_contract_events_chain_id_event_name_idx" ON "indexed_contract_events"("chainId", "eventName");

CREATE UNIQUE INDEX "contract_ownership_projections_chain_id_contract_address_key" ON "contract_ownership_projections"("chainId", "contractAddress");
CREATE INDEX "contract_ownership_projections_chain_id_contract_name_idx" ON "contract_ownership_projections"("chainId", "contractName");

CREATE UNIQUE INDEX "tae_proj_chain_allowlist_token_key" ON "token_allowlist_entry_projections"("chainId", "tokenAllowlistAddress", "token");
CREATE INDEX "tae_proj_chain_allowlist_allowed_idx" ON "token_allowlist_entry_projections"("chainId", "tokenAllowlistAddress", "isAllowed");

CREATE UNIQUE INDEX "are_proj_chain_registry_arbitrator_key" ON "arbitrator_registry_entry_projections"("chainId", "arbitratorRegistryAddress", "arbitrator");
CREATE INDEX "are_proj_chain_registry_approved_idx" ON "arbitrator_registry_entry_projections"("chainId", "arbitratorRegistryAddress", "isApproved");

CREATE UNIQUE INDEX "pc_proj_chain_address_key" ON "protocol_config_projections"("chainId", "protocolConfigAddress");

CREATE UNIQUE INDEX "fee_vault_projections_chain_id_fee_vault_address_key" ON "fee_vault_projections"("chainId", "feeVaultAddress");

CREATE UNIQUE INDEX "escrow_agreement_projections_chain_id_agreement_address_key" ON "escrow_agreement_projections"("chainId", "agreementAddress");
CREATE UNIQUE INDEX "escrow_agreement_projections_chain_id_deal_id_key" ON "escrow_agreement_projections"("chainId", "dealId");
CREATE INDEX "escrow_agreement_projections_chain_id_factory_address_idx" ON "escrow_agreement_projections"("chainId", "factoryAddress");
