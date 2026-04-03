# State Machine

## Deal States

- `DRAFT`
- `AWAITING_SELLER_ACCEPTANCE`
- `AWAITING_FUNDING`
- `ACTIVE`
- `UNDER_REVIEW`
- `DISPUTED`
- `PARTIALLY_RELEASED`
- `COMPLETED`
- `REFUNDED`
- `CANCELLED`
- `EXPIRED`

## Milestone States

- `PENDING`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `DISPUTED`
- `RELEASED`
- `REFUNDED`

## State Rules

- drafts remain offchain
- only funded escrows move onchain
- disputed milestones cannot release until resolved
- deadlines do not change after funding unless the relevant parties re-sign a new deal version
- every money movement must be reconstructable from chain events

## Release 0 Note

Release 0 documents the canonical states but does not implement stateful business workflows yet.
