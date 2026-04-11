import fs from "node:fs";
import { execFileSync } from "node:child_process";

import { authStateDirectory, repoRoot } from "./paths";

function run(command: string, args: string[]) {
  execFileSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit"
  });
}

async function runWithRetry(command: string, args: string[], attempts: number) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      run(command, args);
      return;
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 3_000);
      });
    }
  }

  throw lastError;
}

export default async function globalSetup() {
  fs.rmSync(authStateDirectory, { force: true, recursive: true });
  fs.mkdirSync(authStateDirectory, { recursive: true });

  await runWithRetry("pnpm", ["db:migrate:deploy"], 10);
  run("pnpm", ["--filter", "@blockchain-escrow/api", "build"]);
  run("pnpm", ["--filter", "@blockchain-escrow/e2e", "run", "seed"]);
}
