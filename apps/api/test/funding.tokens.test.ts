import assert from "node:assert/strict";
import test from "node:test";

import {
  loadFundingReconciliationConfiguration,
  resolveFundingReconciliationCursorKey
} from "../src/modules/funding/funding.tokens";

function withEnvironment(
  overrides: Record<string, string | undefined>,
  callback: () => void
): void {
  const previousEntries = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, process.env[key]])
  );

  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    callback();
  } finally {
    for (const [key, value] of Object.entries(previousEntries)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("funding reconciliation config defaults use the manifest-backed cursor key", { concurrency: false }, () => {
  withEnvironment(
    {
      API_RELEASE4_CURSOR_KEY: undefined,
      FUNDING_INDEXER_FRESHNESS_TTL_SECONDS: undefined,
      FUNDING_PENDING_STALE_AFTER_SECONDS: undefined
    },
    () => {
      const configuration = loadFundingReconciliationConfiguration();

      assert.equal(configuration.indexerFreshnessTtlSeconds, 300);
      assert.equal(configuration.pendingStaleAfterSeconds, 3600);
      assert.equal(configuration.release4CursorKeyOverride, null);
      assert.equal(
        resolveFundingReconciliationCursorKey(configuration, 84532),
        "release4:base-sepolia"
      );
    }
  );
});

test("funding reconciliation config rejects invalid stale threshold values", { concurrency: false }, () => {
  assert.throws(
    () =>
      withEnvironment(
        {
          FUNDING_PENDING_STALE_AFTER_SECONDS: "0"
        },
        () => {
          loadFundingReconciliationConfiguration();
        }
      ),
    /Expected a positive integer/
  );
});

test("funding reconciliation config rejects invalid indexer freshness ttl values", { concurrency: false }, () => {
  assert.throws(
    () =>
      withEnvironment(
        {
          FUNDING_INDEXER_FRESHNESS_TTL_SECONDS: "-1"
        },
        () => {
          loadFundingReconciliationConfiguration();
        }
      ),
    /Expected a positive integer/
  );
});
