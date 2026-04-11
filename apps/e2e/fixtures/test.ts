import fs from "node:fs";
import path from "node:path";

import { test as base } from "@playwright/test";

import { writeStorageStateForAccount } from "../support/auth";
import { loadAppConfig, type E2EAppConfig } from "../support/config";
import {
  authStateDirectory
} from "../support/paths";
import {
  readSeedMetadata,
  type SeedMetadata
} from "../support/seed-metadata";
import { testWallets } from "../support/test-wallets";

type WorkerFixtures = {
  app: E2EAppConfig;
  customerStorageStatePath: string;
  operatorStorageStatePath: string;
  seedData: SeedMetadata;
};

type TestFixtures = {
  customerPage: import("@playwright/test").Page;
  operatorPage: import("@playwright/test").Page;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  app: [
    async ({ browserName: _browserName }, use) => {
      void _browserName;
      await use(loadAppConfig());
    },
    { scope: "worker" }
  ],
  seedData: [
    async ({ browserName: _browserName }, use) => {
      void _browserName;
      await use(readSeedMetadata());
    },
    { scope: "worker" }
  ],
  customerStorageStatePath: [
    async ({ app }, use, workerInfo) => {
      const outputPath = path.join(
        authStateDirectory,
        `customer-${workerInfo.parallelIndex}.json`
      );

      if (!fs.existsSync(outputPath)) {
        await writeStorageStateForAccount({
          account: testWallets.customer,
          baseUrl: app.platformBaseUrl,
          chainId: app.chainId,
          outputPath
        });
      }

      await use(outputPath);
    },
    { scope: "worker" }
  ],
  operatorStorageStatePath: [
    async ({ app }, use, workerInfo) => {
      const outputPath = path.join(
        authStateDirectory,
        `operator-${workerInfo.parallelIndex}.json`
      );

      if (!fs.existsSync(outputPath)) {
        await writeStorageStateForAccount({
          account: testWallets.operator,
          baseUrl: app.platformBaseUrl,
          chainId: app.chainId,
          outputPath
        });
      }

      await use(outputPath);
    },
    { scope: "worker" }
  ],
  customerPage: async ({ browser, customerStorageStatePath }, use) => {
    const context = await browser.newContext({
      storageState: customerStorageStatePath
    });
    const page = await context.newPage();

    await use(page);
    await context.close();
  },
  operatorPage: async ({ browser, operatorStorageStatePath }, use) => {
    const context = await browser.newContext({
      storageState: operatorStorageStatePath
    });
    const page = await context.newPage();

    await use(page);
    await context.close();
  }
});

export { expect } from "@playwright/test";
