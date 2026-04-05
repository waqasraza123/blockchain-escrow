#!/usr/bin/env node

import { spawn } from "node:child_process";

import { loadLocalEnvironment, repoRoot } from "./local-env.mjs";

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const env = loadLocalEnvironment();

  if (!env.BASE_RPC_URL) {
    throw new Error("Missing BASE_RPC_URL for Release 4 indexer verification");
  }

  await runCommand("node", ["scripts/release4-bootstrap-local.mjs"], env);
  await runCommand(
    "pnpm",
    ["--filter", "@blockchain-escrow/indexer", "exec", "tsx", "src/main.ts"],
    {
      ...env,
      INDEXER_RUN_ONCE: "true"
    }
  );
}

await main().catch((error) => {
  console.error("Release 4 local verification failed", error);
  process.exit(1);
});
