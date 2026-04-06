import test from "node:test";
import assert from "node:assert/strict";

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

      assert.equal(config.startBlock, 39797620n);
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
