# Architecture

## System Model

The product is intentionally split across five runtime areas and five reusable package areas.

### Runtime apps

- `apps/web`: external user application for buyers, sellers, reviewers, and finance users
- `apps/admin`: internal operator and protocol administration surface
- `apps/api`: business workflow API and control plane
- `apps/worker`: asynchronous side effects and scheduled jobs
- `apps/indexer`: chain ingestion, event normalization, projections, replay, and drift checks

### Reusable packages

- `packages/contracts`: Solidity contracts, tests, and deployment scaffolding
- `packages/contracts-sdk`: generated and typed client access for contracts and addresses
- `packages/db`: database access and schema layer
- `packages/shared`: shared TypeScript contracts, primitives, and cross-app constants
- `packages/security`: auth, sessions, RBAC, request context, and security helpers

## Ownership Boundaries

- onchain contracts own custody and settlement rules
- the API owns offchain business workflow state
- the indexer owns normalized chain projections
- workers own side effects
- admin tools manage operations and config, but do not bypass custody rules

## Data Truth

- chain is the custody truth
- database is the operational truth
- chain events are the source for money reconstruction
- normalized read models come from the indexer, not from API writes

## Release 0 Foundation

Release 0 provides:

- monorepo workspace configuration
- app and package shells
- local infra for Postgres, Redis, and MinIO
- contract scaffold only
- durable architecture and roadmap docs

Release 0 intentionally excludes business modules and escrow behavior.

## Target Repo Shape

```text
apps/
  web/
  admin/
  api/
  worker/
  indexer/

packages/
  contracts/
  contracts-sdk/
  db/
  shared/
  security/

docs/product/
```

## Future Runtime Responsibilities

### API

The API will later own:

- identity and sessions
- organizations and memberships
- counterparties and drafting
- files and evidence metadata
- dispute workflows
- approvals
- reporting access

The API must not directly write normalized chain projections or money movement projections.

### Indexer

The indexer will later own:

- factory discovery
- chain polling
- cursor management
- event decoding
- normalized projections
- replay
- drift detection
- reorg handling

### Worker

The worker will later own:

- notifications
- reminders
- exports
- sanctions checks
- reconciliation tasks
- webhook delivery
- future AI jobs

## Contract Philosophy

Keep the onchain contract surface small. Business workflow complexity stays offchain unless custody or settlement requires it onchain.
