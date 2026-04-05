#!/usr/bin/env node

import { spawn } from "node:child_process";

import { loadLocalEnvironment, repoRoot } from "./local-env.mjs";

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/with-local-env.mjs <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: repoRoot,
  env: loadLocalEnvironment(),
  shell: process.platform === "win32",
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Failed to launch ${command}`, error);
  process.exit(1);
});
