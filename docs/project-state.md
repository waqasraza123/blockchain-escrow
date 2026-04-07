# Project State

## Product

`blockchain-escrow` is a programmable B2B milestone escrow platform for cross-border service and procurement deals. Drafting, evidence, review, disputes, operator workflows, and reporting live offchain. Custody, settlement, and critical money movement rules live onchain. The first lane targets Base and native USDC with a small contract surface.

## Current Architecture

- Monorepo with `pnpm` workspaces and `turbo`.
- Runtime apps: `apps/web` and `apps/admin` are Next.js shells, `apps/api` is a NestJS control-plane API, `apps/indexer` is the normalized chain-read service, and `apps/worker` now owns asynchronous Release 5 draft-activation plus funding-reconciliation side effects alongside future jobs.
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
- Release 4 is in progress: the indexer foundation now covers block/cursor tracking, contract discovery, event decoding, raw event persistence, raw tracked-transaction persistence with execution outcomes for tracked base-contract calls, replayable projections, agreement funding-event projection synthesis from agreement receipt logs, drift checks, reorg recovery for the deployed Release 3 surface, and a bounded local bootstrap/verification path that resets Release 4 state and replays from the tracked deployment start block.
- Release 5 now spans contracts, API, and worker work: the repo contract surface adds an atomic `EscrowFactory.createAndFundAgreement` flow plus agreement-owned token pulling and funded-state tracking for the next protocol deployment, while the current deployed Base Sepolia manifest remains `contractVersion: 1`; `apps/api`, `packages/shared`, and `packages/db` already support counterparty wallet capture, cryptographically verified counterparty version acceptance, automatic offchain transition to `AWAITING_FUNDING` once both sides accept the latest version, a funding-preparation API that computes readiness blockers, canonical deal/version hashes, v1/v2-aware factory calldata, live buyer-allowance checks when `contractVersion >= 2`, explicit funding-transaction tracking, richer funding reconciliation that distinguishes indexed `FAILED`, `CONFIRMED`, `MISMATCHED`, and still-`PENDING` submissions from indexer-owned transaction plus agreement projections, explicit replacement handling that marks older unresolved tracked submissions as `SUPERSEDED` when a newer replacement is recorded for the same deal version, chain-observation metadata on funding responses that exposes indexed block/time/execution details for tracked submissions, read-time stale-pending visibility derived from fresh Release 4 cursor state without mutating workflow truth, worker-owned draft activation to `ACTIVE` once the indexer observes the live escrow state required by the current deployment version, worker-owned persistence plus audit logging for genuinely stale still-pending funding submissions, and worker-owned persistence plus audit logging for terminal funding reconciliation snapshots so later tooling does not depend on API read-time derivation alone.
- Release 6 has started in the control plane: `apps/api`, `packages/shared`, and `packages/db` now support party-scoped immutable milestone submissions from both organization-authenticated sellers and counterparty-signature-authenticated sellers, buyer-side immutable milestone review decisions (`APPROVED` / `REJECTED`), immutable buyer-side settlement requests (`RELEASE` / `REFUND`) anchored to the latest reviewed seller submission, active-escrow gating against live Release 4 agreement truth, timeline-style workflow derivation from the latest submission plus latest review, and audit-backed submission/review/settlement-request records; actual settlement execution, dispute transitions, and worker-owned milestone state progression are still deferred.
- Later releases for milestone review/release, disputes, operator tooling, partner APIs, and production maturity are defined in `docs/product/RELEASE_ROADMAP.md` but are not current implementation targets.

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
- Release 5 contract funding foundation in `packages/contracts` and `packages/contracts-sdk` with agreement-owned ERC20 pull funding, atomic factory `createAndFundAgreement`, funded-state/event tracking on agreements, and deployment-manifest `contractVersion` support so unreleased contract changes do not get conflated with the still-live Base Sepolia v1 deployment.
- Release 5 worker activation foundation in `apps/worker`, `packages/db`, and `packages/shared` with a Prisma-backed reconciliation loop, readiness/liveness endpoints, draft scanning by state, audit-backed `DRAFT_DEAL_ACTIVATED` records, and worker-owned persistence of indexed draft activation for v1 create-only and v2 funded-only deployments.
- Release 5 worker stale-pending escalation foundation in `apps/worker`, `packages/db`, `packages/shared`, and `apps/api` with shared funding-reconciliation helpers, persisted `stalePendingEscalatedAt` metadata on tracked funding transactions, audit-backed `FUNDING_TRANSACTION_STALE_PENDING` records, chain-scoped worker scans gated by fresh Release 4 cursor state, and API read models that expose persisted stale-pending escalations without letting read paths own the side effect.
- Release 5 worker terminal funding-reconciliation foundation in `apps/worker`, `packages/db`, `packages/shared`, and `apps/api` with persisted worker reconciliation snapshots for tracked funding transactions, audit-backed `FUNDING_TRANSACTION_RECONCILIATION_UPDATED` records, reorg-safe clearing when a previously terminal submission no longer resolves terminally, and API read models that expose worker reconciliation metadata while still preferring live indexer-derived truth for current status.
- Release 6 milestone submission and buyer-review foundation in `apps/api`, `packages/shared`, and `packages/db` with party-scoped immutable `DealMilestoneSubmission` records, attachment-file links, immutable `DealMilestoneReview` records, seller-side submission endpoints, buyer-side review endpoints for latest seller submissions, milestone workflow listing derived from the latest submission plus review, audit-backed `DEAL_MILESTONE_SUBMISSION_CREATED`, `DEAL_MILESTONE_REVIEW_APPROVED`, and `DEAL_MILESTONE_REVIEW_REJECTED` records, and active-escrow gating that keys off live linked agreement truth instead of API read-time workflow mutation.
- Release 6 milestone settlement-request foundation in `apps/api`, `packages/shared`, and `packages/db` with immutable `DealMilestoneSettlementRequest` records for buyer-side `RELEASE` / `REFUND` intent, latest-reviewed-submission enforcement, review-decision-to-request-kind validation, milestone workflow responses that now expose settlement requests without falsely claiming funds already moved, and audit-backed `DEAL_MILESTONE_RELEASE_REQUESTED` plus `DEAL_MILESTONE_REFUND_REQUESTED` records.
- Release 6 counterparty seller-submission foundation in `apps/api`, `packages/shared`, and `packages/db` with typed-signature challenge generation plus signature verification for counterparty-side seller milestone submissions, immutable storage of counterparty submission proof on `DealMilestoneSubmission`, seller-party orientation checks against the signed milestone context, and full milestone workflow compatibility so organization-side buyers can review and settle counterparty-authenticated submissions through the same timeline.
- Release 4 indexer foundation in `apps/indexer`, `packages/db`, and `packages/shared` with typed config loading, health endpoints, Base Sepolia contract event decoding, raw block/transaction/event persistence, receipt-backed execution status persistence for tracked base-contract transactions, replayable ownership and protocol projections, escrow agreement projection synthesis from factory plus agreement funding events, drift detection, and reorg rewind/replay support.
- Release 4 local verification hardening in `apps/indexer`, `packages/contracts`, `packages/contracts-sdk`, and root scripts with deployment start-block metadata in the tracked manifest/SDK, bounded verify-window support, authenticated local Postgres health/doctoring, deterministic Release 4 reset before verify, and correct non-zero run-once exits when sync or drift checks fail.
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
- Release 5 counterparty acceptance, funding tracking, and activation foundation in `packages/shared`, `packages/db`, and `apps/api` with draft counterparty wallet capture, canonical deal identity helpers, cryptographically verified counterparty typed-signature capture, audit logging for wallet updates, counterparty acceptances, and funding submissions, automatic draft-state promotion to `AWAITING_FUNDING` for the latest doubly accepted version, a funding-preparation API that derives deal hashes, v1/v2-aware factory calldata, readiness blockers, predicted agreement spender addresses, live buyer-allowance visibility for `contractVersion >= 2`, and existing onchain linkage from accepted versions plus Release 4 projections, explicit offchain tracking for submitted funding transactions, mutation guards once funding starts, draft-state promotion to `ACTIVE` when the linked escrow state required by the current deployment version is indexed, draft read models that now expose escrow linkage plus tracked funding progress directly, indexer-backed funding status derivation that now surfaces `FAILED` when tracked calls revert and requires funded projections once the deployment version supports atomic create-and-fund, supersession metadata plus `SUPERSEDED` status for older unresolved submissions once a later replacement is tracked, indexed block/time/execution metadata on funding summaries for reconciliation visibility, read-time stale-pending metadata that depends on a fresh Release 4 cursor without persisting new workflow state, and persisted worker reconciliation metadata that records terminal funding outcomes without forcing the API to trust lagging worker writes for current status.
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

- Release 6 business modules beyond seller submission, buyer review/rejection capture, and immutable settlement-request capture, including actual settlement execution, disputes, partner APIs, and reporting, are not implemented.
- Worker-side deal lifecycle writes beyond indexed live activation plus funding-transaction reconciliation persistence are not implemented.
- Worker side effects such as notifications and operator-facing reconciliation tooling are not implemented.
- The Release 4 indexer foundation is implemented and the bounded local bootstrap/verify path now works in this workspace, but full historical replay to head still depends on the configured RPC capacity because public Base Sepolia endpoints can rate-limit large scans.

## Risks / Watchouts

- Release 1 coverage is currently service-level in `apps/api`; there are still no end-to-end HTTP tests for the controllers.
- Invite creation currently returns a raw invite token because no worker/email delivery flow exists yet. Treat that as a temporary Release 1 API convenience and be careful not to leak it into durable docs or logs.
- The SIWE verifier now enforces allowed domain and URI origin policy; keep those env values aligned with the frontend surfaces that are allowed to initiate sign-in.
- Release 2 workflow now stops at offchain accepted immutable versions; funded deals and custody transitions remain later-release work.
- Release 5 now tracks submitted funding transactions, promotes drafts to `ACTIVE` from the indexed escrow state required by the current deployment version, surfaces failed tracked funding calls from indexer-owned transaction outcomes, marks older unresolved tracked submissions as superseded when replacements are recorded, exposes indexed block/time/execution metadata for reconciliation visibility, derives stale-pending visibility from fresh Release 4 cursor state, projects agreement-funded state from receipt logs, and defines a real agreement-owned spender path plus atomic factory create-and-fund flow in the repo contract surface; however, the currently deployed Base Sepolia manifest is still `contractVersion: 1`, so the new allowance-gated create-and-fund API path will not activate on that environment until the next contract release is deployed and tracked.
- Release 5 `ACTIVE` state persistence, stale-pending escalation persistence, and terminal funding-reconciliation persistence now depend on the worker reconciliation loop rather than API read paths; if the worker is down, API funding and escrow summaries still reflect indexed truth, but stored draft state and persisted worker reconciliation metadata can lag until reconciliation resumes.
- Release 6 buyer review plus settlement-request capture are now implemented for organization-side buyers against party-scoped seller submissions, and counterparty-authenticated seller submission intake is now present in the API surface; however, actual release/refund execution still depends on future contract/indexer work, and counterparty evidence/file upload paths are still organization-owned, so the full milestone lifecycle still has operational gaps before end-to-end production use.
- Foundry tests in this environment are stable when run offline; the default online signature lookup path can panic under the current macOS sandbox.
- Release 4 projection correctness is covered by targeted indexer tests and the bounded local verification path now passes, but unbounded replay-to-head can still exceed public RPC limits without a higher-capacity provider.
- Keep local session continuity in `docs/_local/current-session.md`; do not recreate ad hoc session docs elsewhere.

## Standard Verification

- Targeted first:
- `pnpm --filter @blockchain-escrow/api lint`
- `pnpm --filter @blockchain-escrow/api typecheck`
- `pnpm --filter @blockchain-escrow/api test`
- `pnpm --filter @blockchain-escrow/worker lint`
- `pnpm --filter @blockchain-escrow/worker typecheck`
- `pnpm --filter @blockchain-escrow/worker test`
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
