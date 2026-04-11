#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";

import { loadLocalEnvironment, repoRoot } from "./local-env.mjs";

const allowedCommands = new Set([
  "smoke",
  "regression",
  "deploy-smoke",
  "visual",
  "ui",
  "seed",
  "reset"
]);

function parsePort(value, fallback) {
  const candidate = value?.trim();

  if (!candidate) {
    return fallback;
  }

  const parsed = Number.parseInt(candidate, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive port number but received "${value}".`);
  }

  return parsed;
}

function getListeningPids(port) {
  try {
    const output = execFileSync(
      "lsof",
      ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    return output
      .split(/\s+/u)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && error.status === 1) {
      return [];
    }

    throw error;
  }
}

function describePid(pid) {
  try {
    return execFileSync("ps", ["-p", pid, "-o", "pid=,ppid=,command="], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return pid;
  }
}

function getProcessGroupId(pid) {
  try {
    return execFileSync("ps", ["-p", pid, "-o", "pgid="], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}

function killProcessGroups(signal, groupIds) {
  for (const groupId of groupIds) {
    execFileSync("kill", [`-${signal}`, `-${groupId}`], {
      cwd: repoRoot,
      stdio: ["ignore", "inherit", "inherit"]
    });
  }
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForPortsToClear(ports, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    const occupied = ports.filter((port) => getListeningPids(port).length > 0);

    if (occupied.length === 0) {
      return;
    }

    sleep(250);
  }

  const occupied = ports
    .map((port) => ({
      port,
      listeners: getListeningPids(port)
    }))
    .filter((entry) => entry.listeners.length > 0);

  if (occupied.length > 0) {
    const detail = occupied
      .map((entry) =>
        `port ${entry.port}: ${entry.listeners.map((pid) => describePid(pid)).join(" | ")}`
      )
      .join("\n");

    throw new Error(`Timed out waiting for e2e ports to clear.\n${detail}`);
  }
}

function clearReservedPorts(ports) {
  const occupied = ports
    .map((port) => ({
      port,
      listeners: getListeningPids(port)
    }))
    .filter((entry) => entry.listeners.length > 0);

  if (occupied.length === 0) {
    return;
  }

  const allPids = [...new Set(occupied.flatMap((entry) => entry.listeners))];
  const processGroupIds = [
    ...new Set(
      allPids
        .map((pid) => getProcessGroupId(pid))
        .filter((value) => value && value.length > 0)
    )
  ];
  const detail = occupied
    .map((entry) =>
      `port ${entry.port}: ${entry.listeners.map((pid) => describePid(pid)).join(" | ")}`
    )
    .join("\n");

  console.error(`e2e preflight: clearing reserved listeners before startup\n${detail}`);
  killProcessGroups("TERM", processGroupIds);

  try {
    waitForPortsToClear(ports, 5_000);
    return;
  } catch {
    const remainingPids = [
      ...new Set(ports.flatMap((port) => getListeningPids(port)))
    ];

    if (remainingPids.length === 0) {
      return;
    }

    console.error(
      `e2e preflight: forcing shutdown for lingering listeners\n${remainingPids
        .map((pid) => describePid(pid))
        .join("\n")}`
    );
    killProcessGroups(
      "KILL",
      [...new Set(remainingPids.map((pid) => getProcessGroupId(pid)).filter(Boolean))]
    );
    waitForPortsToClear(ports, 5_000);
  }
}

function buildLocalEnvFiles(value) {
  const entries = new Set(
    String(value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );

  entries.add(".env.e2e");
  return [...entries].join(",");
}

function buildEnvironment(command) {
  const baseEnv = {
    CI: process.env.CI,
    E2E_SUITE: command === "ui" ? "smoke" : command,
    FORCE_COLOR: process.env.FORCE_COLOR,
    HOME: process.env.HOME,
    LOCAL_ENV_FILES: buildLocalEnvFiles(process.env.LOCAL_ENV_FILES),
    NO_COLOR: process.env.NO_COLOR,
    PATH: process.env.PATH,
    SHELL: process.env.SHELL,
    TERM: process.env.TERM,
    E2E_REUSE_EXISTING_SERVER: command === "ui" ? "1" : "0"
  };

  return {
    ...process.env,
    ...loadLocalEnvironment(baseEnv)
  };
}

async function main() {
  const command = process.argv[2];

  if (!command || !allowedCommands.has(command)) {
    throw new Error(`Usage: node scripts/run-e2e.mjs <${[...allowedCommands].join("|")}>`);
  }

  const env = buildEnvironment(command);
  const reservedPorts = [
    parsePort(env.WEB_PORT, 3300),
    parsePort(env.ADMIN_PORT, 3301),
    parsePort(env.API_PORT, 4400)
  ];

  if (command !== "ui" && command !== "deploy-smoke") {
    clearReservedPorts(reservedPorts);
  }

  const child = spawn(
    "pnpm",
    ["--filter", "@blockchain-escrow/e2e", "run", command],
    {
      cwd: repoRoot,
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    }
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`Failed to launch e2e command "${command}"`, error);
    process.exit(1);
  });
}

void main();
