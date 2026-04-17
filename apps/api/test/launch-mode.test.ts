import assert from "node:assert/strict";
import test from "node:test";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

import { normalizeApiChainId } from "../src/modules/drafts/deal-identity";
import { loadFundingChainReader } from "../src/modules/funding/funding-chain-reader";

function withEnv(
  updates: Record<string, string | undefined>,
  callback: () => void
): void {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key]);

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  try {
    callback();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  }
}

async function withManifestNetwork<T>(
  chainId: number,
  network: string,
  run: () => Promise<T> | T
): Promise<T> {
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest) {
    throw new Error(`missing manifest for chain ${chainId}`);
  }

  const mutableManifest = manifest as typeof manifest & { network: string };
  const previousNetwork = mutableManifest.network;
  mutableManifest.network = network;

  try {
    return await run();
  } finally {
    mutableManifest.network = previousNetwork;
  }
}

test("normalizeApiChainId rejects testnet manifests in production launch mode", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      BASE_CHAIN_ID: "84532"
    },
    () => {
      assert.throws(
        () => normalizeApiChainId(),
        /BASE_CHAIN_ID=84532 resolves to base-sepolia/
      );
    }
  );
});

test("loadFundingChainReader requires BASE_RPC_URL in production launch mode", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: undefined
      },
      () => {
        assert.throws(
          () => loadFundingChainReader(),
          /BASE_RPC_URL must be configured when APP_LAUNCH_MODE=production/
        );
      }
    );
  });
});
