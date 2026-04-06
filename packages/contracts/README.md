# Contracts Package

This package contains the Release 3 protocol contract set, the Release 5 create-and-fund funding extension, and deployment/export tooling.

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
- `pnpm --filter @blockchain-escrow/contracts run release:base-sepolia`
- `pnpm --filter @blockchain-escrow/contracts run verify:base-sepolia`
- `pnpm --filter @blockchain-escrow/contracts run export:contracts-sdk`

The repo contract surface now includes a Release 5 atomic `createAndFundAgreement` flow that initializes an immutable escrow agreement and pulls the buyer's approved settlement tokens into the newly created agreement in the same transaction. The currently tracked Base Sepolia deployment manifest remains `contractVersion: 1`, so that live environment still exposes the older create-only flow until a new release is deployed and the manifest is updated.

The release command deploys the protocol to Base Sepolia, persists `deployments/base-sepolia.json`, regenerates `packages/contracts-sdk`, and verifies the deployed contract state with `cast` calls. The fixture release command validates the manifest/export pipeline without hitting a live chain.
