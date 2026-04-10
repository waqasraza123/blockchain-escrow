"use client";

import { useState } from "react";

type SignInClientProps = {
  returnPath: string;
  tenantLabel: string | null;
};

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

function buildSiweMessage(input: {
  chainId: number;
  nonce: string;
  uri: string;
  walletAddress: string;
}) {
  const domain = window.location.host;
  const issuedAt = new Date().toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${input.walletAddress}

Sign in to Blockchain Escrow.

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${issuedAt}`;
}

export function SignInClient(props: SignInClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setError(null);
    setIsLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error("No injected wallet was detected.");
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts"
      })) as string[];
      const walletAddress = accounts[0];

      if (!walletAddress) {
        throw new Error("No wallet account is available.");
      }

      const rawChainId = (await window.ethereum.request({
        method: "eth_chainId"
      })) as string;
      const chainId = Number.parseInt(rawChainId, 16);

      if (!Number.isInteger(chainId) || chainId <= 0) {
        throw new Error("Wallet returned an invalid chain id.");
      }

      const nonceResponse = await fetch("/api/auth/nonce", {
        body: JSON.stringify({ chainId, walletAddress }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!nonceResponse.ok) {
        throw new Error(await nonceResponse.text());
      }

      const nonceBody = (await nonceResponse.json()) as { nonce: string };
      const message = buildSiweMessage({
        chainId,
        nonce: nonceBody.nonce,
        uri: `${window.location.origin}/sign-in`,
        walletAddress
      });
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress]
      })) as string;

      const verifyResponse = await fetch("/api/auth/verify", {
        body: JSON.stringify({
          chainId,
          message,
          signature,
          walletAddress
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!verifyResponse.ok) {
        throw new Error(await verifyResponse.text());
      }

      window.location.assign(props.returnPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="button" disabled={isLoading} onClick={handleClick} type="button">
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </button>
      {props.tenantLabel ? (
        <p className="muted">Continuing into {props.tenantLabel}.</p>
      ) : null}
      {error ? <p className="empty-state">{error}</p> : null}
    </div>
  );
}
