#!/usr/bin/env node

import net from "node:net";
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

function parseDatabaseTarget(databaseUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${databaseUrl}`, { cause: error });
  }

  const port =
    parsedUrl.port.length > 0
      ? Number.parseInt(parsedUrl.port, 10)
      : parsedUrl.protocol === "postgresql:"
        ? 5432
        : Number.NaN;

  if (!parsedUrl.hostname || !Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid DATABASE_URL host or port: ${databaseUrl}`);
  }

  return {
    host: parsedUrl.hostname,
    port
  };
}

function canConnect(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

function isLocalHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

async function waitForPort(host, port, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port, 1000)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error(`Timed out waiting for Postgres at ${host}:${port}`);
}

async function ensureDatabaseReachable(env) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL after loading local environment");
  }

  const target = parseDatabaseTarget(databaseUrl);
  if (await canConnect(target.host, target.port, 1000)) {
    return target;
  }

  if (!isLocalHost(target.host)) {
    throw new Error(
      `Postgres is unreachable at ${target.host}:${target.port}. Point DATABASE_URL at a reachable database before running Release 4 local bootstrap.`
    );
  }

  try {
    await runCommand("docker", ["compose", "up", "-d", "postgres"], env);
  } catch (error) {
    throw new Error(
      `Postgres is unreachable at ${target.host}:${target.port} and docker compose could not start the local postgres service. Ensure Docker Desktop is running or point DATABASE_URL at a reachable database.`,
      { cause: error }
    );
  }

  await waitForPort(target.host, target.port, 30000);
  return target;
}

async function main() {
  const env = loadLocalEnvironment();

  await ensureDatabaseReachable(env);
  await runCommand("pnpm", ["db:migrate:deploy"], env);
  await runCommand("pnpm", ["db:migrate:status"], env);
}

await main().catch((error) => {
  console.error("Release 4 local bootstrap failed", error);
  process.exit(1);
});
