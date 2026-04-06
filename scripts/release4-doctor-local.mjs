#!/usr/bin/env node

import { loadLocalEnvironment, repoRoot } from "./local-env.mjs";
import {
  canConnect,
  isDockerComposeServiceRunning,
  probeDatabaseAuthentication,
  resolveLocalDatabaseConnection
} from "./local-database.mjs";

async function main() {
  const env = loadLocalEnvironment();
  const connection = resolveLocalDatabaseConnection(env);
  const reachable = await canConnect(connection.host, connection.port, 1000);
  const authenticationProbe = reachable
    ? await probeDatabaseAuthentication(connection, env)
    : { detail: "Port is not reachable.", status: "probe_failed" };
  const composeStatus = connection.isLocalHost
    ? await isDockerComposeServiceRunning("postgres", env, repoRoot)
    : { available: false, running: false };

  console.log(`DATABASE_URL source: ${connection.source}`);
  console.log(`Postgres target: ${connection.host}:${connection.port}/${connection.database}`);
  console.log(`Postgres user: ${connection.username}`);
  console.log(`Password provided: ${connection.passwordProvided ? "yes" : "no"}`);
  console.log(`TCP reachable: ${reachable ? "yes" : "no"}`);

  if (composeStatus.available) {
    console.log(`docker compose postgres running: ${composeStatus.running ? "yes" : "no"}`);
  } else if (connection.isLocalHost) {
    console.log("docker compose postgres running: unavailable (docker compose not detected)");
  }

  console.log(`Authenticated probe: ${authenticationProbe.status}`);
  if (authenticationProbe.detail) {
    console.log(authenticationProbe.detail);
  }

  if (reachable && (authenticationProbe.status === "ok" || authenticationProbe.status === "unavailable")) {
    process.exit(0);
  }

  process.exit(1);
}

await main().catch((error) => {
  console.error("Release 4 local doctor failed", error);
  process.exit(1);
});
