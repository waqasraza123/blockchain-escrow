# Project State

## Product

`blockchain-escrow` is a programmable B2B milestone escrow platform for cross-border service and procurement deals. Drafting, evidence, review, disputes, operator workflows, and reporting live offchain. Custody, settlement, and critical money movement rules live onchain. The first lane targets Base and native USDC with a small contract surface.

## Current Architecture

- Monorepo with `pnpm` workspaces and `turbo`.
- Runtime apps: `apps/web` and `apps/admin` are Next.js shells, `apps/api` is a NestJS control-plane API, and `apps/worker` plus `apps/indexer` are TypeScript Node services.
- Reusable packages: `packages/contracts`, `packages/contracts-sdk`, `packages/db`, `packages/shared`, `packages/security`.
- `packages/db` owns Prisma schema, migrations, generated client usage, and repository-backed persistence for Release 1, Release 2, and Release 4 raw/projection entities.
- `packages/shared` owns cross-app types and validation schemas for Release 1 surfaces, Release 2 business contracts, Release 4 indexer contracts, and shared primitives.
- `packages/security` owns auth/session/RBAC interfaces and helpers.
- `apps/api` now has Release 1 auth infrastructure wired with Prisma-backed persistence and nonce, verify, me, and logout endpoints.

## Non-Negotiable Rules

- Chain is the custody truth. Database is the operational truth.
- Drafts stay offchain until funding exists.
- The API never writes normalized chain projections directly.
- Only the indexer writes normalized chain projections and money-movement projections.
- Workers own side effects.
- Admin tooling must not bypass custody rules or gain arbitrary access to user escrow balances.
- Keep the contract surface small.
- Do not add fake escrow flows or placeholder money-movement logic.
- Preserve release sequencing from `docs/product/RELEASE_ROADMAP.md`.

## Current Roadmap

- Release 0 foundation is complete enough to support implementation work.
- Release 1 is complete: identity, wallet auth, sessions, users, organizations, org roles, invites, and audit logs.
- Release 2 is complete: counterparties, files metadata, templates, draft deals, immutable deal versions, milestone snapshots, and accepted typed-signature capture are implemented.
- Release 3 is complete: the v1 contract surface is implemented, deployed to Base Sepolia, exported through `packages/contracts-sdk`, and covered by unit tests, hardening tests, and release verification.
- Release 4 is in progress: the indexer foundation now covers block/cursor tracking, contract discovery, event decoding, raw event persistence, replayable projections, drift checks, and reorg recovery for the deployed Release 3 surface.
- Release 5 has started in `apps/api`, `packages/shared`, and `packages/db`: drafts now support counterparty wallet capture, cryptographically verified counterparty version acceptance, automatic offchain transition to `AWAITING_FUNDING` once both sides accept the latest version, a funding-preparation API that computes readiness blockers, canonical deal/version hashes, and `EscrowFactory.createAgreement` calldata from accepted immutable versions plus indexer-owned protocol projections, explicit funding-transaction tracking, and automatic draft activation to `ACTIVE` once the indexer observes the live agreement for the deal.
- Later releases for funding, milestones, disputes, operator tooling, partner APIs, and production maturity are defined in `docs/product/RELEASE_ROADMAP.md` but are not current implementation targets.

## Completed Major Slices

- Durable product and architecture docs under `docs/product/*`.
- Workspace, Turbo, local infra scripts, and app/package shells.
- Contract scaffold for `TokenAllowlist`, `ArbitratorRegistry`, `ProtocolConfig`, `FeeVault`, `EscrowAgreement`, and `EscrowFactory`.
- Release 3 `TokenAllowlist` implementation in `packages/contracts` with two-step ownership, enumerable token policy management, and unit tests.
- Release 3 `ArbitratorRegistry` implementation in `packages/contracts` with two-step ownership, enumerable arbitrator approval management, and unit tests.
- Release 3 `ProtocolConfig` implementation in `packages/contracts` with two-step ownership, validated dependency and treasury configuration, protocol fee basis points, pause flags, and unit tests.
- Release 3 `FeeVault` implementation in `packages/contracts` with two-step ownership, treasury configuration, native/ERC20 fee withdrawals, and unit tests.
- Release 3 `EscrowAgreement` implementation in `packages/contracts` with one-time initialization, immutable deal snapshot storage, protocol dependency validation, policy validation, and unit tests.
- Release 3 `EscrowFactory` implementation in `packages/contracts` with immutable versioned dependencies, clone-per-deal deployment, create-pause enforcement, deterministic agreement address prediction, duplicate-deal protection, and unit tests.
- Release 3 deployment/export wiring with a Base Sepolia deploy script in `packages/contracts`, a deployment manifest template, and generated ABI/address exports in `packages/contracts-sdk`.
- Release 3 deployment execution pipeline in `packages/contracts/scripts/*` with broadcast parsing, validated manifest persistence, SDK export regeneration, chain-state verification, and fixture-driven local validation that does not overwrite tracked deployment artifacts.
- Release 3 hardening tests in `packages/contracts/test/*Hardening.t.sol` covering stateful fuzzed allowlist/registry invariants, protocol config bounds, fee-vault balance conservation, immutable agreement snapshots, and factory uniqueness/determinism across repeated fuzzed agreement creation sequences.
- Release 3 live Base Sepolia deployment artifacts tracked in `packages/contracts/deployments/base-sepolia.json` and `packages/contracts-sdk/src/generated/contracts.ts`.
- Release 4 indexer foundation in `apps/indexer`, `packages/db`, and `packages/shared` with typed config loading, health endpoints, Base Sepolia contract event decoding, raw block/transaction/event persistence, replayable ownership and protocol projections, escrow agreement projection synthesis from factory plus agreement events, drift detection, and reorg rewind/replay support.
- Release 1 shared contracts and security interfaces in `packages/shared` and `packages/security`.
- Release 1 Prisma schema, migration, generated client flow, and repository implementations in `packages/db`.
- Release 1 auth/session API slice in `apps/api` with nonce issuance, SIWE verification, session persistence, cookie handling, and auth audit logging.
- Release 1 organization API slice in `apps/api` with membership listing, organization detail, organization creation, invite creation, invite acceptance, invite revoke, member role updates, and member removal.
- Release 1 users API slice in `apps/api` with authenticated current-user reads.
- Release 1 wallets API slice in `apps/api` with authenticated wallet listing and wallet detail reads.
- Release 1 audit API slice in `apps/api` with authenticated entity audit-log reads across user, wallet, session, and organization-scoped entities.
- Release 2 counterparty foundation in `packages/shared`, `packages/db`, and `apps/api` with organization-scoped create/list/detail flows, normalized-name uniqueness, and counterparty audit logging.
- Release 2 files foundation in `packages/shared`, `packages/db`, and `apps/api` with organization-scoped file metadata create/list/detail flows, unique storage keys per organization, and file audit logging.
- Release 2 template foundation in `packages/shared`, `packages/db`, and `apps/api` with organization-scoped create/list/detail flows, unique normalized names per organization, optional default counterparties, and template audit logging.
- Release 2 drafting foundation in `packages/shared`, `packages/db`, and `apps/api` with organization-scoped draft creation, current draft parties, immutable deal version snapshots, milestone snapshots, linked file metadata, template references, and audit logging for draft and version creation.
- Release 2 deal-version acceptance foundation in `packages/shared`, `packages/db`, and `apps/api` with organization-side typed-signature capture for immutable versions, signer wallet binding from the authenticated session, acceptance audit logging, and read endpoints per version.
- Release 5 counterparty acceptance, funding tracking, and activation foundation in `packages/shared`, `packages/db`, and `apps/api` with draft counterparty wallet capture, canonical deal identity helpers, cryptographically verified counterparty typed-signature capture, audit logging for wallet updates, counterparty acceptances, and funding submissions, automatic draft-state promotion to `AWAITING_FUNDING` for the latest doubly accepted version, a funding-preparation API that derives deal hashes, create-agreement calldata, readiness blockers, and existing onchain linkage from accepted versions plus Release 4 projections, explicit offchain tracking for submitted funding transactions, mutation guards once funding starts, automatic draft-state promotion to `ACTIVE` when the linked agreement is indexed, and draft read models that now expose escrow linkage plus tracked funding progress directly.
- Behavioral API tests for auth lifecycle, organization workflows, users, wallets, audit access, and SIWE domain/URI policy checks.

## Important Decisions

- Prisma is the Release 1 persistence toolchain in `packages/db`.
- Default local Postgres runs on `127.0.0.1:5433` to avoid host `5432` collisions.
- Production chain is Base mainnet; development and staging use Base Sepolia.
- Initial token policy is native USDC only.
- `TokenAllowlist` intentionally stays minimal: later contracts should depend on `isAllowedToken(address)` rather than embedding token policy.
- The API owns offchain workflow state; the indexer owns normalized chain reads and projections.
- Future funded-escrow changes must come through new contracts and release work, not in-place mutation.

## Deferred / Not Yet Implemented

- Release 5+ business modules such as funding, disputes, approvals, partner APIs, and reporting are not implemented.
- Release 5 allowance checks, real spender/transfer validation, worker-side funding reconciliation, and deal lifecycle writes beyond offchain acceptance, transaction tracking, and indexed live activation are not implemented.
- Worker side effects and operator-facing reconciliation tooling are not implemented.
- The Release 4 indexer foundation is implemented, but it has not yet been exercised against a live local database in this workspace because Prisma migration commands currently fail against the local Postgres configuration on `127.0.0.1:5433`.

## Risks / Watchouts

- Release 1 coverage is currently service-level in `apps/api`; there are still no end-to-end HTTP tests for the controllers.
- Invite creation currently returns a raw invite token because no worker/email delivery flow exists yet. Treat that as a temporary Release 1 API convenience and be careful not to leak it into durable docs or logs.
- The SIWE verifier now enforces allowed domain and URI origin policy; keep those env values aligned with the frontend surfaces that are allowed to initiate sign-in.
- Release 2 workflow now stops at offchain accepted immutable versions; funded deals and custody transitions remain later-release work.
- Release 5 now tracks submitted funding transactions and promotes drafts to `ACTIVE` from indexer-owned agreement linkage, but allowance/readiness checks are still bounded by the current create-only contract surface.
- Foundry tests in this environment are stable when run offline; the default online signature lookup path can panic under the current macOS sandbox.
- Release 4 projection correctness is covered by targeted indexer tests, but end-to-end local boot validation still depends on a `DATABASE_URL` that authenticates against the intended Postgres instance.
- Keep local session continuity in `docs/_local/current-session.md`; do not recreate ad hoc session docs elsewhere.

## Standard Verification

- Targeted first:
- `pnpm --filter @blockchain-escrow/api lint`
- `pnpm --filter @blockchain-escrow/api typecheck`
- `pnpm --filter @blockchain-escrow/api test`
- `pnpm --filter @blockchain-escrow/db lint`
- `pnpm --filter @blockchain-escrow/db typecheck`
- `pnpm --filter @blockchain-escrow/indexer lint`
- `pnpm --filter @blockchain-escrow/indexer typecheck`
- `pnpm --filter @blockchain-escrow/indexer test`
- Broader repo checks:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- Contract-specific when relevant:
- `pnpm contracts:build`
- `FOUNDRY_OFFLINE=true forge test`
