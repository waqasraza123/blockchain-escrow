# Project State

## Product

`blockchain-escrow` is a programmable B2B milestone escrow platform for cross-border service and procurement deals. Drafting, evidence, review, disputes, operator workflows, and reporting live offchain. Custody, settlement, and critical money movement rules live onchain. The first lane targets Base and native USDC with a small contract surface.

## Current Architecture

- Monorepo with `pnpm` workspaces and `turbo`.
- Runtime apps: `apps/web` and `apps/admin` are Next.js shells, `apps/api` is a NestJS control-plane API, `apps/worker` and `apps/indexer` are TypeScript Node services.
- Reusable packages: `packages/contracts`, `packages/contracts-sdk`, `packages/db`, `packages/shared`, `packages/security`.
- `packages/db` owns Prisma schema, migrations, generated client usage, and repository-backed persistence for Release 1 and active Release 2 entities.
- `packages/shared` owns cross-app types and validation schemas for Release 1 surfaces, active Release 2 business contracts, and shared primitives.
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
- Release 3 contract implementation is in progress: the full v1 contract surface is implemented with unit tests, fuzz tests, invariant-style hardening coverage, Base Sepolia deployment wiring, and ABI export; the next Release 3 step is deployment execution against a real target environment and follow-up hardening from live feedback.
- Later releases for deals, funding, milestones, disputes, operator tooling, partner APIs, and production maturity are defined in `docs/product/RELEASE_ROADMAP.md` but are not current implementation targets.

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
- Release 3 hardening tests in `packages/contracts/test/*Hardening.t.sol` covering stateful fuzzed allowlist/registry invariants, protocol config bounds, fee-vault balance conservation, immutable agreement snapshots, and factory uniqueness/determinism across repeated fuzzed agreement creation sequences.
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

- Release 3+ business modules such as funding, disputes, approvals, partner APIs, and reporting are not implemented.
- Indexer projections, worker side effects, and production contract logic are not implemented.
- Repo-level automated tests still exist mainly in `apps/api` and contracts; many other packages have no test task yet.

## Risks / Watchouts

- Release 1 coverage is currently service-level in `apps/api`; there are still no end-to-end HTTP tests for the controllers.
- Invite creation currently returns a raw invite token because no worker/email delivery flow exists yet. Treat that as a temporary Release 1 API convenience and be careful not to leak it into durable docs or logs.
- The SIWE verifier now enforces allowed domain and URI origin policy; keep those env values aligned with the frontend surfaces that are allowed to initiate sign-in.
- Release 2 workflow now stops at offchain accepted immutable versions; funded deals and custody transitions remain later-release work.
- Foundry tests in this environment are stable when run offline; the default online signature lookup path can panic under the current macOS sandbox.
- Keep local session continuity in `docs/_local/current-session.md`; do not recreate ad hoc session docs elsewhere.

## Standard Verification

- Targeted first:
- `pnpm --filter @blockchain-escrow/api lint`
- `pnpm --filter @blockchain-escrow/api typecheck`
- `pnpm --filter @blockchain-escrow/api test`
- `pnpm --filter @blockchain-escrow/db lint`
- `pnpm --filter @blockchain-escrow/db typecheck`
- Broader repo checks:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- Contract-specific when relevant:
- `pnpm contracts:build`
- `FOUNDRY_OFFLINE=true forge test`
