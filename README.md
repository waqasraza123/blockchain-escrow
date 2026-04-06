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
2. Create `.env` or `.env.local` and override any values you need. Root scripts merge `.env.example`, `.env`, and `.env.local` in that order, with your shell env taking final precedence. For local Postgres, you can override `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`; root scripts derive `DATABASE_URL` from those values if you do not set it explicitly.
3. Start infrastructure:

```bash
pnpm boot:infra
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

For the Release 4 local database and indexer path:

```bash
pnpm release4:doctor:local
pnpm release4:bootstrap:local
pnpm release4:verify:local
```

If `release4:doctor:local` reports that another Postgres instance is already bound to the configured port, move the repo-local database to a different local port in `.env.local` by overriding `POSTGRES_PORT` and let the root scripts derive the matching `DATABASE_URL`. `release4:verify:local` is a bounded verification run; if you need a wider replay window locally, override `INDEXER_START_BLOCK` and `INDEXER_END_BLOCK`.

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
