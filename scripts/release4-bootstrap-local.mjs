#!/usr/bin/env node

import { spawn } from "node:child_process";

import { loadLocalEnvironment, repoRoot } from "./local-env.mjs";
import {
  canConnect,
  isDockerComposeServiceRunning,
  probeDatabaseAuthentication,
  resolveLocalDatabaseConnection,
  waitForPort
} from "./local-database.mjs";

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

function describeConnection(connection) {
  return `${connection.host}:${connection.port}/${connection.database} as ${connection.username} (${connection.source})`;
}

async function startDockerPostgres(env, connection) {
  try {
    await runCommand("docker", ["compose", "up", "-d", "postgres"], env);
  } catch (error) {
    throw new Error(
      `Failed to start the repo-local Postgres service for ${describeConnection(connection)}. This usually means Docker is unavailable or another service already owns ${connection.host}:${connection.port}.`,
      { cause: error }
    );
  }

  await waitForPort(connection.host, connection.port, 30000);
}

async function ensureDatabaseReady(env) {
  const connection = resolveLocalDatabaseConnection(env);
  env.DATABASE_URL = connection.databaseUrl;

  const reachable = await canConnect(connection.host, connection.port, 1000);
  const composeStatus =
    connection.isLocalHost
      ? await isDockerComposeServiceRunning("postgres", env, repoRoot)
      : { available: false, running: false };

  if (!reachable) {
    if (!connection.isLocalHost) {
      throw new Error(
        `Postgres is unreachable at ${describeConnection(connection)}. Point DATABASE_URL or POSTGRES_* at a reachable database before running Release 4 local bootstrap.`
      );
    }

    await startDockerPostgres(env, connection);
  }

  const authenticationProbe = await probeDatabaseAuthentication(connection, env);

  if (authenticationProbe.status === "ok" || authenticationProbe.status === "unavailable") {
    return connection;
  }

  if (!connection.isLocalHost) {
    throw new Error(
      `Postgres is reachable but authentication failed for ${describeConnection(connection)}.\n${authenticationProbe.detail}`
    );
  }

  if (!composeStatus.running) {
    await startDockerPostgres(env, connection);

    const retryProbe = await probeDatabaseAuthentication(connection, env);
    if (retryProbe.status === "ok" || retryProbe.status === "unavailable") {
      return connection;
    }

    throw new Error(
      `The repo-local Postgres service started, but authentication still failed for ${describeConnection(connection)}.\n${retryProbe.detail}\nCheck POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, and DATABASE_URL for mismatches or a stale Postgres data volume.`
    );
  }

  throw new Error(
    `Postgres is reachable but authentication failed for ${describeConnection(connection)}.\n${authenticationProbe.detail}\nThe repo-local postgres container is already running, so the configured credentials likely do not match the running database.`
  );
}

async function main() {
  const env = loadLocalEnvironment();

  await ensureDatabaseReady(env);
  await runCommand("pnpm", ["db:migrate:deploy"], env);
  await runCommand("pnpm", ["db:migrate:status"], env);
}

await main().catch((error) => {
  console.error("Release 4 local bootstrap failed", error);
  process.exit(1);
});
