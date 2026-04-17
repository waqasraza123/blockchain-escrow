import assert from "node:assert/strict";
import test from "node:test";

import {
  getHostedSessionCookieOptions,
  validateWebStartupConfiguration
} from "../startup";

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

test("validateWebStartupConfiguration accepts explicit production api urls", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      WEB_API_BASE_URL: "https://api.example.com"
    },
    () => {
      assert.doesNotThrow(() => validateWebStartupConfiguration());
    }
  );
});

test("validateWebStartupConfiguration rejects localhost api urls in production", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      WEB_API_BASE_URL: "http://localhost:4000"
    },
    () => {
      assert.throws(
        () => validateWebStartupConfiguration(),
        /WEB_API_BASE_URL must not point to localhost/
      );
    }
  );
});

test("validateWebStartupConfiguration rejects non-https api urls in production", () => {
  withEnv(
    {
      APP_LAUNCH_MODE: "production",
      WEB_API_BASE_URL: "http://api.example.com"
    },
    () => {
      assert.throws(
        () => validateWebStartupConfiguration(),
        /WEB_API_BASE_URL must use https/
      );
    }
  );
});

test("getHostedSessionCookieOptions enables secure cookies in node production", () => {
  withEnv(
    {
      NODE_ENV: "production"
    },
    () => {
      const options = getHostedSessionCookieOptions("2026-04-18T00:00:00.000Z");

      assert.equal(options.sameSite, "lax");
      assert.equal(options.httpOnly, true);
      assert.equal(options.path, "/");
      assert.equal(options.secure, true);
    }
  );
});
