# Release Roadmap

## Release Order

1. Release 0: blueprint and repo spine
2. Release 1: identity, wallet auth, organizations, and audit
3. Release 2: counterparties, files, templates, drafting, and deal versioning
4. Release 3: protocol contracts v1
5. Release 4: indexer, raw events, and read-model projections
6. Release 5: funding flow and live escrow activation
7. Release 6: milestone submission, review, release, rejection, and refund
8. Release 7: disputes and arbitrator workspace
9. Release 8: operator console, risk, compliance, and system health
10. Release 9: enterprise approvals, policies, and finance reporting
11. Release 10: public partner API, webhooks, and hosted sessions
12. Release 11: white-label, tenancy, custom domains, and billing
13. Release 12: wallet convenience, sponsored actions, and reduced-friction flows
14. Release 13: multi-chain deployment and treasury visibility
15. Release 14: AI assistance, search intelligence, and operator leverage
16. Release 15: scale hardening, audit prep, incident response, and production maturity

## Release 0

Purpose:

- create durable project context files
- scaffold repo and local infra
- create bootable shells for apps and packages
- wire base commands and hygiene
- avoid business logic

## Release 1

Responsibilities:

- wallet auth
- sessions
- users
- organizations
- org roles
- invites
- audit logs

## Release 2

Responsibilities:

- counterparties
- templates
- deals
- immutable deal versions
- milestone snapshots
- files
- accepted typed-signature capture

## Release 3

Responsibilities:

- `TokenAllowlist`
- `ArbitratorRegistry`
- `ProtocolConfig`
- `FeeVault`
- `EscrowAgreement`
- `EscrowFactory`
- unit tests
- fuzz tests
- invariants
- Base Sepolia deployment scripts
- ABI export

## Release 4

Responsibilities:

- block and cursor tracking
- factory discovery
- escrow event decoding
- raw chain event storage
- replayable projections
- drift detection
- reorg handling

## Release 5

Responsibilities:

- funding preparation
- allowance checks
- funding transaction tracking
- deal-to-escrow linkage
- live escrow activation

## Release 6

Responsibilities:

- seller submission flows
- buyer review flows
- approve, reject, release, and refund paths
- statements
- timelines
- review deadline handling

## Release 7

Responsibilities:

- dispute opening
- dispute packet construction
- dispute evidence linkage
- arbitrator assignment
- decision drafting
- signed resolution execution

## Release 8

Responsibilities:

- operator search
- risk alerts
- sanctions screening checkpoints
- compliance cases
- indexer health
- reconciliation visibility
- protocol admin controls

## Release 9

Responsibilities:

- approval policies
- approval requests
- approval steps
- cost centers
- finance exports
- statement snapshots

## Release 10

Responsibilities:

- partner accounts
- api keys
- partner deal APIs
- webhook subscriptions
- webhook deliveries
- hosted session flows

## Release 11

Responsibilities:

- tenant settings
- brand assets
- custom domains
- billing plans
- usage metering
- invoices
- fee schedules

## Release 12

Responsibilities:

- wallet profiles
- sponsored transaction requests
- gas policies
- reduced-friction approval and review actions

## Release 13

Responsibilities:

- chain deployments
- cross-chain funding intent tracking
- treasury movements
- multi-chain indexing and reporting consistency

## Release 14

Responsibilities:

- milestone extraction
- risk wording flags
- dispute packet summaries
- operator AI helper
- AI jobs and AI artifacts
- advisory only, no AI custody actions

## Release 15

Responsibilities:

- audit prep
- penetration and reliability hardening
- incident records
- replay drills
- backup and restore drills
- runbooks
- production maturity

## Streams That Must Continue Across Releases

- security
- audit and event coverage
- reconciliation hardening
- operator usability
