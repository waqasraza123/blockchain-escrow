import test from "node:test";
import assert from "node:assert/strict";

import { UnauthorizedException } from "@nestjs/common";
import { privateKeyToAccount } from "viem/accounts";

import { ViemSiweVerifier } from "../src/modules/auth/siwe-verifier.service";

const account = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945382d7d2fb31c89a7f1bbab539cc73f2f1f4"
);

function createSiweMessage(options?: {
  chainId?: number;
  domain?: string;
  expirationTime?: string;
  nonce?: string;
  uri?: string;
}) {
  const domain = options?.domain ?? "localhost:3000";
  const uri = options?.uri ?? "http://localhost:3000";
  const nonce = options?.nonce ?? "nonce-123";
  const issuedAt = new Date().toISOString();
  const expirationTime =
    options?.expirationTime ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${account.address}

Sign in to blockchain-escrow.

URI: ${uri}
Version: 1
Chain ID: ${options?.chainId ?? 84532}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

test("siwe verifier accepts a valid signature with allowed domain and uri origin", async () => {
  const verifier = new ViemSiweVerifier({
    allowedDomains: ["localhost:3000"],
    allowedUriOrigins: ["http://localhost:3000"]
  });
  const message = createSiweMessage();
  const signature = await account.signMessage({ message });

  const verified = await verifier.verify({
    chainId: 84532,
    message,
    nonce: "nonce-123",
    signature,
    walletAddress: account.address
  });

  assert.equal(verified.domain, "localhost:3000");
  assert.equal(verified.uri, "http://localhost:3000");
  assert.equal(verified.walletAddress, account.address.toLowerCase());
});

test("siwe verifier rejects a message with a disallowed uri origin", async () => {
  const verifier = new ViemSiweVerifier({
    allowedDomains: ["localhost:4000"],
    allowedUriOrigins: ["http://localhost:3000"]
  });
  const message = createSiweMessage({
    domain: "localhost:4000",
    uri: "http://localhost:4000"
  });
  const signature = await account.signMessage({ message });

  await assert.rejects(
    verifier.verify({
      chainId: 84532,
      message,
      nonce: "nonce-123",
      signature,
      walletAddress: account.address
    }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      error.message === "siwe uri origin is not allowed"
  );
});
