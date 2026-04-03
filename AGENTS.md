# blockchain-escrow

## Purpose

`blockchain-escrow` is a programmable B2B milestone escrow platform. Drafting, evidence, review, disputes, operator workflows, and reporting live offchain. Custody, settlement, and critical money movement rules live onchain.

Release 0 establishes the repository foundation only. Do not implement escrow business logic, custody flows, or workflow features until the roadmap says to do so.

## Source Of Truth

Use this file for repo operating guidance.

Use the deeper product docs in `docs/product/*` as the long-term source of truth for:

- product boundaries
- architecture
- roadmap sequencing
- state definitions
- onchain vs offchain ownership
- non-goals and decisions

If this file and `docs/product/*` diverge, update the docs first and then align this file.

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

## Install

Prerequisites:

- Node 22
- pnpm 10+
- Foundry
- Docker Desktop with Compose

Commands:

- `pnpm install`
- `docker compose up -d`

## Run

- `pnpm dev`
- `pnpm --filter @blockchain-escrow/web dev`
- `pnpm --filter @blockchain-escrow/admin dev`
- `pnpm --filter @blockchain-escrow/api dev`
- `pnpm --filter @blockchain-escrow/worker dev`
- `pnpm --filter @blockchain-escrow/indexer dev`

## Validation

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contracts:build`
- `pnpm contracts:test`

## Engineering Conventions

- Keep the contract surface small.
- Drafts stay offchain until funding exists.
- Chain is the custody truth.
- Database is the operational truth.
- Only the indexer writes normalized chain projections.
- Workers own side effects.
- Admin tooling must not bypass custody rules.
- Use descriptive names and small focused modules.
- Avoid comments in code unless the code would otherwise be unclear.
- Prefer production-grade structure over placeholder business behavior.

## Constraints And Do-Not Rules

- Do not add Release 1 features during Release 0.
- Do not add auth, orgs, deals, funding, disputes, partner APIs, or approval workflows yet.
- Do not add fake escrow flows or fake money movement logic.
- Do not give admin arbitrary access to user escrow balances.
- Do not mutate funded escrow assumptions in place; future versions should come through new contracts and new release work.
- Do not let API code write chain projections directly.

## What Done Means

A step is done when:

- the requested repo changes exist in the correct locations
- boundaries and assumptions are preserved in docs
- targeted validation commands were run
- unverified areas are called out explicitly
- the next step can proceed without re-deciding earlier architecture

## How To Verify Work

Run the smallest relevant command first, then broader repo checks:

- targeted package command
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contracts:build`
- `pnpm contracts:test`

Do not claim green unless a command actually passed.

## Roadmap Continuity

When continuing the roadmap:

- implement one release boundary at a time
- preserve the ownership rules in `docs/product/ONCHAIN_OFFCHAIN_BOUNDARY.md`
- preserve the state model in `docs/product/STATE_MACHINE.md`
- preserve the sequencing in `docs/product/RELEASE_ROADMAP.md`
- record architectural changes in `docs/product/DECISIONS.md`
- keep Release 0 scaffold-only packages free of fake business logic
