import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

import { loadWorkerConfig } from "../src/config";

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

function productionManifestEnv(chainId: number): Record<string, string> {
  const manifest = getDeploymentManifestByChainId(chainId);

  if (!manifest?.treasury || !manifest.usdcToken) {
    throw new Error(`missing manifest profile fields for chain ${chainId}`);
  }

  return {
    APP_EXPECTED_CHAIN_ID: String(chainId),
    APP_EXPECTED_CONTRACT_VERSION: String(manifest.contractVersion),
    APP_EXPECTED_EXPLORER_URL: manifest.explorerUrl,
    APP_EXPECTED_NETWORK: manifest.network,
    APP_EXPECTED_TREASURY_ADDRESS: manifest.treasury,
    APP_EXPECTED_USDC_TOKEN_ADDRESS: manifest.usdcToken
  };
}

test("loadWorkerConfig defaults runOnce to false", () => {
  withEnv(
    {
      WORKER_CHAIN_ID: "84532",
      WORKER_RUN_ONCE: undefined
    },
    () => {
      const config = loadWorkerConfig();

      assert.equal(config.runOnce, false);
      assert.equal(config.port, 4100);
      assert.equal(config.pollIntervalMs, 15000);
    }
  );
});

test("loadWorkerConfig parses runOnce when enabled", () => {
  withEnv(
    {
      WORKER_CHAIN_ID: "84532",
      WORKER_RUN_ONCE: "true"
    },
    () => {
      const config = loadWorkerConfig();

      assert.equal(config.runOnce, true);
    }
  );
});

test("loadWorkerConfig rejects testnet manifests in production launch mode", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      WORKER_CHAIN_ID: "84532"
    },
    () => {
      assert.throws(
        () => loadWorkerConfig(),
        /WORKER_CHAIN_ID=84532 resolves to base-sepolia/
      );
    }
  );
});

test("loadWorkerConfig requires an explicit worker chain id in production launch mode", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        WORKER_CHAIN_ID: undefined
      },
      () => {
        assert.throws(
          () => loadWorkerConfig(),
          /WORKER_CHAIN_ID must be configured/
        );
      }
    );
  });
});

test("loadWorkerConfig rejects localhost operator indexer urls in production launch mode", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        WORKER_CHAIN_ID: "84532",
        WORKER_OPERATOR_ALERT_INDEXER_BASE_URL: "http://127.0.0.1:4200"
      },
      () => {
        assert.throws(
          () => loadWorkerConfig(),
          /WORKER_OPERATOR_ALERT_INDEXER_BASE_URL must not point to localhost/
        );
      }
    );
  });
});

test("loadWorkerConfig rejects deployment profiles that do not match the expected treasury", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        APP_EXPECTED_TREASURY_ADDRESS: "0x1111111111111111111111111111111111111111",
        WORKER_CHAIN_ID: "84532",
        WORKER_OPERATOR_ALERT_INDEXER_BASE_URL: "https://indexer.example.com"
      },
      () => {
        assert.throws(
          () => loadWorkerConfig(),
          /APP_EXPECTED_TREASURY_ADDRESS/
        );
      }
    );
  });
});
