# blockchain-escrow

`blockchain-escrow` is a programmable B2B milestone escrow platform for cross-border service and procurement deals. Drafting, files, evidence, review workflows, disputes, approvals, operator tooling, and reporting live offchain. Custody and settlement rules live onchain.

Release 0 sets the repository foundation only. It does not implement auth, organizations, deals, funding, disputes, or partner APIs yet.

## Core Principles

- drafts stay offchain
- funded escrows go onchain later
- chain is the custody truth
- database is the operational truth
- evidence stays offchain and only hashes go onchain later
- admin may pause future create and fund flows, but must never gain arbitrary control over user escrow funds

## Stack

- pnpm
- Node 22
- turbo
- Next.js
- NestJS
- TypeScript
- Foundry
- Postgres
- Redis
- MinIO

## Repo Layout

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

## Local Setup

1. Install Node 22, pnpm, Foundry, and Docker Desktop.
2. Copy `.env.example` to `.env` and adjust values if needed.
3. Start infrastructure:

```bash
docker compose up -d
```

4. Install workspace dependencies:

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

App entrypoints:

- web: `http://localhost:3000`
- admin: `http://localhost:3001`
- api: `http://localhost:4000/health/live`
- worker: `http://localhost:4100/health/live`
- indexer: `http://localhost:4200/health/live`
- Postgres: `127.0.0.1:5433`
- MinIO console: `http://localhost:9001`

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contracts:build
pnpm contracts:test
```

## Contracts Deployment

Base Sepolia deployment requires `BASE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `SAFE_ADDRESS`, and `USDC_TOKEN_ADDRESS`.

```bash
pnpm contracts:deploy:base-sepolia
pnpm contracts:verify:base-sepolia
pnpm contracts:release:base-sepolia
pnpm contracts:export-sdk
```

For local pipeline validation without live credentials:

```bash
pnpm contracts:release:base-sepolia:fixture
```

## Documentation

Use `docs/product/*` for the long-term architecture and roadmap:

- `docs/product/PROJECT_BRIEF.md`
- `docs/product/ARCHITECTURE.md`
- `docs/product/RELEASE_ROADMAP.md`
- `docs/product/STATE_MACHINE.md`
- `docs/product/ONCHAIN_OFFCHAIN_BOUNDARY.md`
- `docs/product/DECISIONS.md`
- `docs/product/NON_GOALS.md`

Use `AGENTS.md` for repo operating instructions.
