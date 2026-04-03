import type { ChainId, IsoTimestamp, WalletAddress } from "@blockchain-escrow/shared";

export interface SiweNonceChallenge {
  chainId: ChainId;
  expiresAt: IsoTimestamp;
  nonce: string;
  walletAddress: WalletAddress;
}

export interface SiweVerificationInput {
  chainId: ChainId;
  message: string;
  nonce: string;
  signature: string;
  walletAddress: WalletAddress;
}

export interface VerifiedSiweMessage {
  chainId: ChainId;
  expirationTime: IsoTimestamp | null;
  issuedAt: IsoTimestamp | null;
  nonce: string;
  walletAddress: WalletAddress;
}

export interface SiweVerifier {
  verify(input: SiweVerificationInput): Promise<VerifiedSiweMessage>;
}
