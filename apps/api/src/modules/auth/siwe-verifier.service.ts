import type { SiweVerificationInput, SiweVerifier, VerifiedSiweMessage } from "@blockchain-escrow/security";
import type { WalletAddress } from "@blockchain-escrow/shared";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyMessage } from "viem";

import {
  SIWE_POLICY_CONFIGURATION,
  type SiwePolicyConfiguration
} from "./auth.tokens";

const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/;
const siweHeaderPattern =
  /^(.+?) wants you to sign in with your Ethereum account:$/;

function normalizeWalletAddress(address: string): WalletAddress {
  return address.toLowerCase() as WalletAddress;
}

function normalizePolicyValue(value: string): string {
  return value.trim().toLowerCase();
}

function readSiweField(message: string, field: string): string | null {
  const match = message.match(
    new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\\\]/g, "\\$&")}:\\s+(.+)$`, "m")
  );

  return match?.[1]?.trim() ?? null;
}

function parseSiweMessage(message: string): VerifiedSiweMessage {
  const lines = message.split(/\r?\n/);
  const domain = lines[0]?.match(siweHeaderPattern)?.[1]?.trim();
  const rawWalletAddress = lines[1]?.trim();
  const uri = readSiweField(message, "URI");

  if (!rawWalletAddress || !walletAddressPattern.test(rawWalletAddress)) {
    throw new UnauthorizedException("siwe message is missing a valid wallet address");
  }

  if (!domain) {
    throw new UnauthorizedException("siwe message is missing a valid domain");
  }

  if (!uri) {
    throw new UnauthorizedException("siwe message is missing a valid uri");
  }

  const chainIdValue = readSiweField(message, "Chain ID");
  const nonce = readSiweField(message, "Nonce");

  if (!chainIdValue || !nonce) {
    throw new UnauthorizedException("siwe message is missing required fields");
  }

  const chainId = Number(chainIdValue);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new UnauthorizedException("siwe message contains an invalid chain id");
  }

  return {
    chainId,
    domain,
    expirationTime: readSiweField(message, "Expiration Time"),
    issuedAt: readSiweField(message, "Issued At"),
    nonce,
    uri,
    walletAddress: normalizeWalletAddress(rawWalletAddress)
  };
}

@Injectable()
export class ViemSiweVerifier implements SiweVerifier {
  constructor(
    @Inject(SIWE_POLICY_CONFIGURATION)
    private readonly siwePolicy: SiwePolicyConfiguration
  ) {}

  async verify(input: SiweVerificationInput): Promise<VerifiedSiweMessage> {
    const parsed = parseSiweMessage(input.message);
    const parsedUri = this.parseUri(parsed.uri);
    const normalizedDomain = normalizePolicyValue(parsed.domain);
    const normalizedOrigin = normalizePolicyValue(parsedUri.origin);

    if (normalizePolicyValue(parsedUri.host) !== normalizedDomain) {
      throw new UnauthorizedException("siwe uri host does not match siwe domain");
    }

    if (!this.siwePolicy.allowedDomains.includes(normalizedDomain)) {
      throw new UnauthorizedException("siwe domain is not allowed");
    }

    if (!this.siwePolicy.allowedUriOrigins.includes(normalizedOrigin)) {
      throw new UnauthorizedException("siwe uri origin is not allowed");
    }

    if (parsed.walletAddress !== normalizeWalletAddress(input.walletAddress)) {
      throw new UnauthorizedException("signed message wallet does not match request wallet");
    }

    if (parsed.chainId !== input.chainId) {
      throw new UnauthorizedException("signed message chain does not match request chain");
    }

    if (parsed.nonce !== input.nonce) {
      throw new UnauthorizedException("signed message nonce does not match active challenge");
    }

    if (parsed.expirationTime) {
      const expiresAt = new Date(parsed.expirationTime);

      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException("signed message has expired");
      }
    }

    const isValid = await verifyMessage({
      address: parsed.walletAddress,
      message: input.message,
      signature: input.signature as `0x${string}`
    });

    if (!isValid) {
      throw new UnauthorizedException("invalid wallet signature");
    }

    return parsed;
  }

  private parseUri(uri: string): URL {
    let parsedUri: URL;

    try {
      parsedUri = new URL(uri);
    } catch {
      throw new UnauthorizedException("siwe uri is invalid");
    }

    if (parsedUri.protocol !== "http:" && parsedUri.protocol !== "https:") {
      throw new UnauthorizedException("siwe uri protocol is invalid");
    }

    return parsedUri;
  }
}
