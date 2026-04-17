import test from "node:test";
import assert from "node:assert/strict";

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
