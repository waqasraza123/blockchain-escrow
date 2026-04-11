import fs from "node:fs/promises";

import { request } from "@playwright/test";
import type { PrivateKeyAccount } from "viem/accounts";

function buildSiweMessage(input: {
  baseUrl: string;
  chainId: number;
  nonce: string;
  walletAddress: string;
}) {
  const url = new URL(input.baseUrl);
  const issuedAt = new Date().toISOString();

  return `${url.host} wants you to sign in with your Ethereum account:
${input.walletAddress}

Sign in to Blockchain Escrow.

URI: ${url.origin}/sign-in
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${issuedAt}`;
}

export async function writeStorageStateForAccount(input: {
  account: PrivateKeyAccount;
  baseUrl: string;
  chainId: number;
  outputPath: string;
}): Promise<void> {
  const apiRequestContext = await request.newContext({
    baseURL: input.baseUrl
  });

  const walletAddress = input.account.address.toLowerCase();
  const nonceResponse = await apiRequestContext.post("/api/auth/nonce", {
    data: {
      chainId: input.chainId,
      walletAddress
    }
  });

  if (!nonceResponse.ok()) {
    throw new Error(await nonceResponse.text());
  }

  const nonceBody = (await nonceResponse.json()) as { nonce: string };
  const message = buildSiweMessage({
    baseUrl: input.baseUrl,
    chainId: input.chainId,
    nonce: nonceBody.nonce,
    walletAddress
  });
  const signature = await input.account.signMessage({ message });
  const verifyResponse = await apiRequestContext.post("/api/auth/verify", {
    data: {
      chainId: input.chainId,
      message,
      signature,
      walletAddress
    }
  });

  if (!verifyResponse.ok()) {
    throw new Error(await verifyResponse.text());
  }

  await fs.writeFile(
    input.outputPath,
    JSON.stringify(await apiRequestContext.storageState(), null, 2),
    "utf8"
  );
  await apiRequestContext.dispose();
}
