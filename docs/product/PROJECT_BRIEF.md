# Project Brief

## Product Summary

`blockchain-escrow` is a programmable B2B escrow platform for milestone-based service and procurement deals. Businesses negotiate and finalize deals offchain, fund native USDC escrow on an Ethereum-compatible chain, and release or refund funds when the agreed work is completed.

The platform combines:

- onchain custody and settlement rules
- offchain drafting, evidence, workflow, disputes, and reporting
- future operator, enterprise, and embedded distribution capabilities

## Primary Business Lane

The first product lane is cross-border B2B service and procurement escrow, including:

- software projects
- agency retainers
- recruiting deposits
- sourcing and procurement milestones
- design and content deliverables

## Core Principles

- drafts stay offchain
- only funded escrows go onchain
- chain is the custody truth
- database is the operational truth
- evidence and rich files stay offchain; only hashes go onchain where needed
- funded escrows must not be silently mutated
- protocol admin may pause future create and fund flows, but must not confiscate user funds
- AI may assist with extraction, summarization, and risk flags, but must never move funds or decide disputes

## Chain And Token Strategy

- production chain: Base mainnet
- development and staging chain: Base Sepolia
- initial token policy: native USDC only
- protocol admin and treasury control: Safe
- future optional enhancements: EIP-3009 funding, smart-account convenience, sponsored actions, multi-chain expansion

## Required Onchain Model

- factory plus clone-per-deal
- shared registries and config contracts
- immutable escrow instances after creation
- new protocol versions introduced by new factories and implementations instead of mutating existing funded escrows

## Required Contract Surface

- `TokenAllowlist`
- `ArbitratorRegistry`
- `ProtocolConfig`
- `FeeVault`
- `EscrowAgreement`
- `EscrowFactory`

## Release 0 Objective

Release 0 creates the durable repository instructions, architecture docs, monorepo foundation, local development infrastructure, and clean application and package shells needed to start Release 1 without repo drift.

Release 0 does not implement:

- auth
- organizations
- deals
- funding
- disputes
- approvals
- partner APIs
- production contract logic
