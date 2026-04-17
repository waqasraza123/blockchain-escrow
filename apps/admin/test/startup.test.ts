import assert from "node:assert/strict";
import test from "node:test";

import { validateAdminStartupConfiguration } from "../startup";

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

test("validateAdminStartupConfiguration accepts explicit production api urls", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      ADMIN_API_BASE_URL: "https://api.example.com"
    },
    () => {
      assert.doesNotThrow(() => validateAdminStartupConfiguration());
    }
  );
});

test("validateAdminStartupConfiguration rejects localhost api urls in production", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      ADMIN_API_BASE_URL: "http://127.0.0.1:4000"
    },
    () => {
      assert.throws(
        () => validateAdminStartupConfiguration(),
        /ADMIN_API_BASE_URL must not point to localhost/
      );
    }
  );
});
