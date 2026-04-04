# Contracts Package

This package contains the Release 3 protocol contract set and deployment/export tooling.

Current scope:

- `TokenAllowlist`
- `ArbitratorRegistry`
- `ProtocolConfig`
- `FeeVault`
- `EscrowAgreement`
- `EscrowFactory`
- Foundry tests
- Base Sepolia deployment script
- SDK artifact export

Current commands:

- `pnpm --filter @blockchain-escrow/contracts run build:contracts`
- `pnpm --filter @blockchain-escrow/contracts run test:contracts`
- `pnpm --filter @blockchain-escrow/contracts run deploy:base-sepolia`
- `pnpm --filter @blockchain-escrow/contracts run export:contracts-sdk`

The Release 3 contracts define the protocol surface and immutable agreement deployment flow. They do not implement funding, milestone execution, release/refund, or dispute resolution yet.
