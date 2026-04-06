import assert from "node:assert/strict";
import test from "node:test";

import type { IndexerConfig } from "../src/config";
import { HealthState } from "../src/health-state";
import { IndexerService } from "../src/indexer-service";

const testConfig: IndexerConfig = {
  baseRpcUrl: "http://127.0.0.1:8545",
  batchSize: 250,
  chainId: 84532,
  cursorKey: "release4:base-sepolia",
  enableDriftChecks: true,
  endBlock: null,
  finalityBuffer: 0,
  network: "base-sepolia",
  pollIntervalMs: 15000,
  port: 4200,
  rpcConcurrency: 10,
  runOnce: true,
  startBlock: 0n
};

test("run-once indexer service rethrows sync failures and records health state", async () => {
  const healthState = new HealthState();
  const service = new IndexerService(testConfig, healthState) as IndexerService & {
    runDriftChecks: () => Promise<void>;
    sync: () => Promise<void>;
  };

  service.sync = async () => {
    throw new Error("simulated sync failure");
  };
  service.runDriftChecks = async () => {};

  await assert.rejects(service.start(), /simulated sync failure/);

  const snapshot = healthState.snapshot();
  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.lastSyncError, "simulated sync failure");

  await service.close();
});
