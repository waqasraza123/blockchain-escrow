# Onchain And Offchain Boundary

## Core Boundary

- chain is the custody truth
- database is the operational truth
- rich evidence and files stay offchain
- only hashes and settlement-critical identifiers go onchain where required

## Ownership Rules

### API

The API owns business workflow state such as:

- drafting
- deal versions
- files and evidence metadata
- dispute records
- approvals
- settings
- notifications

The API never writes normalized chain projections directly.

### Indexer

Only the indexer writes:

- raw chain event records
- chain transaction records
- escrow projections
- milestone projections
- normalized money movement projections

### Worker

Workers own side effects, including:

- emails
- reminders
- exports
- scans
- webhook delivery
- future AI jobs

### Admin

Admin tooling may:

- manage protocol configuration workflows
- manage registries
- manage review and compliance queues
- pause future create or fund entrypoints later
- inspect health and drift

Admin tooling must not:

- confiscate user funds
- rewrite chain state
- silently settle disputes
- bypass custody rules

## Contract Surface

Keep the onchain surface limited to:

- `TokenAllowlist`
- `ArbitratorRegistry`
- `ProtocolConfig`
- `FeeVault`
- `EscrowAgreement`
- `EscrowFactory`

Workflow complexity stays offchain unless custody requires otherwise.
