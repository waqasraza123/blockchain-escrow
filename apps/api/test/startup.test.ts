import assert from "node:assert/strict";
import test from "node:test";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";

import { validateApiStartupConfiguration } from "../src/startup";

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

test("validateApiStartupConfiguration accepts production launch mode with explicit production settings", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com,admin.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com,https://admin.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "https://app.example.com"
      },
      () => {
        assert.doesNotThrow(() => validateApiStartupConfiguration());
      }
    );
  });
});

test("validateApiStartupConfiguration rejects development session secrets in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "development-session-secret-change-me",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "https://app.example.com"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /API_SESSION_SECRET must not use a development default/
        );
      }
    );
  });
});

test("validateApiStartupConfiguration rejects insecure cookies in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "false",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "https://app.example.com"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /API_SESSION_COOKIE_SECURE must be true/
        );
      }
    );
  });
});

test("validateApiStartupConfiguration rejects localhost partner hosted urls in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "http://localhost:3000"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /API_PARTNER_HOSTED_BASE_URL must not point to localhost/
        );
      }
    );
  });
});

test("validateApiStartupConfiguration rejects localhost SIWE origins in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "localhost:3000",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "https://app.example.com"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /AUTH_SIWE_ALLOWED_DOMAINS must not include localhost/
        );
      }
    );
  });
});

test("validateApiStartupConfiguration rejects non-https hosted base urls in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "https://mainnet.base.org",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "http://app.example.com"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /API_PARTNER_HOSTED_BASE_URL must use https/
        );
      }
    );
  });
});

test("validateApiStartupConfiguration rejects rpc urls that point to localhost in production", async () => {
  await withManifestNetwork(84532, "base", async () => {
    withEnv(
      {
        APP_LAUNCH_MODE: "production",
        ...productionManifestEnv(84532),
        BASE_CHAIN_ID: "84532",
        BASE_RPC_URL: "http://localhost:8545",
        API_SESSION_SECRET: "prod-session-secret",
        API_SESSION_COOKIE_SECURE: "true",
        AUTH_SIWE_ALLOWED_DOMAINS: "app.example.com",
        AUTH_SIWE_ALLOWED_URI_ORIGINS: "https://app.example.com",
        API_PARTNER_HOSTED_SESSION_SECRET: "prod-partner-secret",
        API_PARTNER_HOSTED_BASE_URL: "https://app.example.com"
      },
      () => {
        assert.throws(
          () => validateApiStartupConfiguration(),
          /BASE_RPC_URL must not point to localhost/
        );
      }
    );
  });
});
