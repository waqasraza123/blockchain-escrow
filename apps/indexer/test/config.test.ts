import test from "node:test";
import assert from "node:assert/strict";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

import { loadIndexerConfig } from "../src/config";

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

test("loadIndexerConfig defaults runOnce to false", () => {
  withEnv(
    {
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532",
      INDEXER_RUN_ONCE: undefined
    },
    () => {
      const config = loadIndexerConfig();

      assert.equal(config.runOnce, false);
    }
  );
});

test("loadIndexerConfig parses runOnce when enabled", () => {
  withEnv(
    {
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532",
      INDEXER_RUN_ONCE: "true"
    },
    () => {
      const config = loadIndexerConfig();

      assert.equal(config.runOnce, true);
    }
  );
});

test("loadIndexerConfig defaults startBlock from the deployment manifest", () => {
  withEnv(
    {
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532",
      INDEXER_START_BLOCK: undefined
    },
    () => {
      const config = loadIndexerConfig();
      const manifest = getDeploymentManifestByChainId(84532);

      assert.ok(manifest);
      assert.equal(config.startBlock, BigInt(manifest.deploymentStartBlock ?? "0"));
    }
  );
});

test("loadIndexerConfig parses an explicit start block override", () => {
  withEnv(
    {
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532",
      INDEXER_START_BLOCK: "39797621"
    },
    () => {
      const config = loadIndexerConfig();

      assert.equal(config.startBlock, 39797621n);
    }
  );
});

test("loadIndexerConfig parses an optional end block override", () => {
  withEnv(
    {
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532",
      INDEXER_END_BLOCK: "39797620"
    },
    () => {
      const config = loadIndexerConfig();

      assert.equal(config.endBlock, 39797620n);
    }
  );
});

test("loadIndexerConfig rejects testnet manifests in production launch mode", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      BASE_RPC_URL: "https://sepolia.base.org",
      INDEXER_CHAIN_ID: "84532"
    },
    () => {
      assert.throws(
        () => loadIndexerConfig(),
        /INDEXER_CHAIN_ID=84532 resolves to base-sepolia/
      );
    }
  );
});

test("loadIndexerConfig requires an explicit indexer chain id in production launch mode", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_RPC_URL: "https://mainnet.base.org",
        INDEXER_CHAIN_ID: undefined
      },
      () => {
        assert.throws(
          () => loadIndexerConfig(),
          /INDEXER_CHAIN_ID must be configured/
        );
      }
    );
  });
});

test("loadIndexerConfig rejects deployment profiles that do not match the expected usdc token", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        APP_EXPECTED_USDC_TOKEN_ADDRESS: "0x1111111111111111111111111111111111111111",
        BASE_RPC_URL: "https://mainnet.base.org",
        INDEXER_CHAIN_ID: "84532"
      },
      () => {
        assert.throws(
          () => loadIndexerConfig(),
          /APP_EXPECTED_USDC_TOKEN_ADDRESS/
        );
      }
    );
  });
});

test("loadIndexerConfig rejects localhost rpc urls in production launch mode", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_RPC_URL: "http://localhost:8545",
        INDEXER_CHAIN_ID: "84532"
      },
      () => {
        assert.throws(
          () => loadIndexerConfig(),
          /BASE_RPC_URL must not point to localhost/
        );
      }
    );
  });
});
