import net from "node:net";
import { spawn } from "node:child_process";

function parsePositiveInteger(value, fallback) {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function buildDatabaseUrl({
  database,
  host,
  password,
  port,
  username
}) {
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);

  return `postgresql://${encodedUsername}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
}

export function resolveLocalDatabaseConnection(env) {
  const explicitDatabaseUrl = env.DATABASE_URL?.trim();
  const databaseUrlSource = env.LOCAL_DATABASE_URL_SOURCE?.trim() || "DATABASE_URL";

  if (explicitDatabaseUrl) {
    let parsedUrl;

    try {
      parsedUrl = new URL(explicitDatabaseUrl);
    } catch (error) {
      throw new Error(`Invalid DATABASE_URL: ${explicitDatabaseUrl}`, { cause: error });
    }

    const port =
      parsedUrl.port.length > 0
        ? Number.parseInt(parsedUrl.port, 10)
        : parsedUrl.protocol === "postgresql:"
          ? 5432
          : Number.NaN;

    if (!parsedUrl.hostname || !Number.isInteger(port) || port <= 0) {
      throw new Error(`Invalid DATABASE_URL host or port: ${explicitDatabaseUrl}`);
    }

    return {
      database: decodeURIComponent(parsedUrl.pathname.replace(/^\//u, "")),
      databaseUrl: explicitDatabaseUrl,
      host: parsedUrl.hostname,
      isLocalHost:
        parsedUrl.hostname === "127.0.0.1" ||
        parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "::1",
      password: decodeURIComponent(parsedUrl.password),
      passwordProvided: parsedUrl.password.length > 0,
      port,
      source: databaseUrlSource,
      username: decodeURIComponent(parsedUrl.username)
    };
  }

  const host = env.POSTGRES_HOST?.trim() || "127.0.0.1";
  const port = parsePositiveInteger(env.POSTGRES_PORT, 5433);
  const username = env.POSTGRES_USER?.trim() || "blockchain_escrow";
  const password = env.POSTGRES_PASSWORD?.trim() || "blockchain_escrow";
  const database = env.POSTGRES_DB?.trim() || "blockchain_escrow";

  return {
    database,
    databaseUrl: buildDatabaseUrl({
      database,
      host,
      password,
      port,
      username
    }),
    host,
    isLocalHost: host === "127.0.0.1" || host === "localhost" || host === "::1",
    password,
    passwordProvided: password.length > 0,
    port,
    source: "POSTGRES_*",
    username
  };
}

export function canConnect(host, port, timeoutMs) {
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

export async function waitForPort(host, port, timeoutMs) {
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

function runCommandCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal,
        stderr,
        stdout
      });
    });

    child.on("error", (error) => {
      resolve({
        code: 1,
        error,
        signal: null,
        stderr,
        stdout
      });
    });
  });
}

export async function isCommandAvailable(command) {
  const result = await runCommandCapture(command, ["--version"]);
  return result.code === 0;
}

export async function probeDatabaseAuthentication(connection, env) {
  if (!(await isCommandAvailable("psql"))) {
    return {
      detail: "psql is not installed; skipping authenticated Postgres probe.",
      status: "unavailable"
    };
  }

  const result = await runCommandCapture(
    "psql",
    [
      "-h",
      connection.host,
      "-p",
      String(connection.port),
      "-U",
      connection.username,
      "-d",
      connection.database,
      "-w",
      "-c",
      "select 1"
    ],
    {
      env: {
        ...env,
        PGPASSWORD: connection.password
      }
    }
  );

  if (result.code === 0) {
    return {
      detail: "Authenticated Postgres probe succeeded.",
      status: "ok"
    };
  }

  const output = `${result.stderr}\n${result.stdout}`.trim();

  if (/password authentication failed/u.test(output)) {
    return {
      detail: output,
      status: "auth_failed"
    };
  }

  return {
    detail: output || "Authenticated Postgres probe failed.",
    status: "probe_failed"
  };
}

export async function isDockerComposeServiceRunning(service, env, cwd) {
  const result = await runCommandCapture("docker", ["compose", "ps", "-q", service], {
    cwd,
    env
  });

  if (result.code !== 0) {
    return {
      available: false,
      running: false
    };
  }

  return {
    available: true,
    running: result.stdout.trim().length > 0
  };
}
