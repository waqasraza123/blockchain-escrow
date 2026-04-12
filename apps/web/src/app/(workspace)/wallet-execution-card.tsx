"use client";

import type { PreparedTransaction } from "@blockchain-escrow/shared";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useState
} from "react";

import {
  initialTransactionRecordActionState,
  recordFundingTransactionAction,
  recordSettlementExecutionTransactionAction
} from "./actions";

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

type WalletExecutionCardLabels = {
  chain: string;
  connectedWalletMismatch: string;
  execute: string;
  executing: string;
  method: string;
  missingWallet: string;
  persistRetry: string;
  sending: string;
  submittedHash: string;
  switchChainFailed: string;
  trackingPending: string;
  userRejected: string;
};

type WalletExecutionCardProps = {
  ctaLabel: string;
  expectedWalletAddress: string;
  labels: WalletExecutionCardLabels;
  methodLabel: string | null;
  recordKind: "funding" | "settlement";
  requiredChainId: number;
  returnPath: string;
  trackingFields: Record<string, string>;
  transaction: PreparedTransaction;
};

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function toHexQuantity(value: string): `0x${string}` {
  if (value.startsWith("0x")) {
    return value as `0x${string}`;
  }

  return `0x${BigInt(value).toString(16)}`;
}

function formatWalletError(caught: unknown, fallback: string): string {
  if (
    caught &&
    typeof caught === "object" &&
    "code" in caught &&
    (caught as { code?: unknown }).code === 4001
  ) {
    return fallback;
  }

  if (
    caught &&
    typeof caught === "object" &&
    "message" in caught &&
    typeof (caught as { message?: unknown }).message === "string" &&
    (caught as { message: string }).message.trim().length > 0
  ) {
    return (caught as { message: string }).message;
  }

  return fallback;
}

export function WalletExecutionCard(props: WalletExecutionCardProps) {
  const router = useRouter();
  const recordAction =
    props.recordKind === "funding"
      ? recordFundingTransactionAction
      : recordSettlementExecutionTransactionAction;
  const [recordState, submitRecordAction, isRecording] = useActionState(
    recordAction,
    initialTransactionRecordActionState
  );
  const [walletError, setWalletError] = useState<string | null>(null);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (recordState.ok) {
      router.refresh();
    }
  }, [recordState.ok, router]);

  async function persistTransactionHash(transactionHash: string) {
    const formData = new FormData();

    Object.entries(props.trackingFields).forEach(([key, value]) => {
      formData.set(key, value);
    });
    formData.set("returnPath", props.returnPath);
    formData.set("transactionHash", transactionHash);

    startTransition(() => {
      submitRecordAction(formData);
    });
  }

  async function handleExecute() {
    setWalletError(null);
    setIsSending(true);

    try {
      if (!window.ethereum) {
        throw new Error(props.labels.missingWallet);
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts"
      })) as string[];
      const connectedWalletAddress = accounts[0];

      if (!connectedWalletAddress) {
        throw new Error(props.labels.missingWallet);
      }

      if (
        normalizeAddress(connectedWalletAddress) !==
        normalizeAddress(props.expectedWalletAddress)
      ) {
        throw new Error(props.labels.connectedWalletMismatch);
      }

      const rawChainId = (await window.ethereum.request({
        method: "eth_chainId"
      })) as string;
      const requiredChainIdHex = `0x${props.requiredChainId.toString(16)}`;

      if (rawChainId.toLowerCase() !== requiredChainIdHex.toLowerCase()) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: requiredChainIdHex }]
          });
        } catch (caught) {
          throw new Error(formatWalletError(caught, props.labels.switchChainFailed));
        }
      }

      const transactionHash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            data: props.transaction.data,
            from: connectedWalletAddress,
            to: props.transaction.to,
            value: toHexQuantity(props.transaction.value)
          }
        ]
      })) as string;

      setSubmittedHash(transactionHash);
      await persistTransactionHash(transactionHash);
    } catch (caught) {
      setWalletError(formatWalletError(caught, props.labels.userRejected));
    } finally {
      setIsSending(false);
    }
  }

  const trackedHash = recordState.transactionHash ?? submittedHash;

  return (
    <div className="stack compact">
      <div className="detail-grid">
        <div className="detail-item">
          <span className="muted">{props.labels.chain}</span>
          <strong>{props.requiredChainId}</strong>
        </div>
        {props.methodLabel ? (
          <div className="detail-item">
            <span className="muted">{props.labels.method}</span>
            <strong>{props.methodLabel}</strong>
          </div>
        ) : null}
      </div>
      <div className="actions-row">
        <button
          className="button"
          disabled={isSending || isRecording}
          onClick={() => {
            void handleExecute();
          }}
          type="button"
        >
          {isSending
            ? props.labels.sending
            : isRecording
              ? props.labels.executing
              : props.ctaLabel}
        </button>
        {trackedHash && !recordState.ok ? (
          <button
            className="button-ghost"
            disabled={isSending || isRecording}
            onClick={() => {
              void persistTransactionHash(trackedHash);
            }}
            type="button"
          >
            {props.labels.persistRetry}
          </button>
        ) : null}
      </div>
      {trackedHash ? (
        <div className="detail-grid">
          <div className="detail-item">
            <span className="muted">{props.labels.submittedHash}</span>
            <strong className="mono">{trackedHash}</strong>
          </div>
        </div>
      ) : null}
      {recordState.ok ? (
        <p className="empty-state">{props.labels.trackingPending}</p>
      ) : null}
      {walletError ? <p className="empty-state">{walletError}</p> : null}
      {!recordState.ok && recordState.error ? (
        <p className="empty-state">{recordState.error}</p>
      ) : null}
    </div>
  );
}
