# Decisions

## Baseline Decisions

### D-001: Product lane

Start with cross-border B2B service and procurement escrow, not retail marketplace flows.

### D-002: Chain strategy

Use Base mainnet for production and Base Sepolia for development and staging.

### D-003: Money rail

Support native USDC only in the first production version.

### D-004: Protocol control

Use Safe for protocol admin and treasury control.

### D-005: Monorepo tooling

Use pnpm workspaces with turbo orchestration.

### D-006: Application stack

Use Next.js for `web` and `admin`, NestJS for `api`, and TypeScript Node services for `worker` and `indexer`.

### D-007: Contract stack

Use Solidity with Foundry and keep the contract surface small.

### D-008: Persistence and infra

Use Postgres, Redis, and MinIO for local development infrastructure.

### D-009: Release 0 scope

Release 0 creates durable docs, workspace structure, local infra, shell apps, shell packages, and contract scaffolding only.

### D-010: Ownership boundary

The API does not write chain projections; the indexer owns normalized chain reads and money movement projections.
