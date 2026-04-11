import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");

function parseEnvFileList(value) {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function decodeDoubleQuotedValue(value) {
  return value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
}

function parseLine(rawLine) {
  const line = rawLine.trim();

  if (!line || line.startsWith("#")) {
    return null;
  }

  const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
  const separatorIndex = normalized.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  const rawValue = normalized.slice(separatorIndex + 1).trim();

  if (
    rawValue.length >= 2 &&
    rawValue.startsWith("\"") &&
    rawValue.endsWith("\"")
  ) {
    return [key, decodeDoubleQuotedValue(rawValue.slice(1, -1))];
  }

  if (
    rawValue.length >= 2 &&
    rawValue.startsWith("'") &&
    rawValue.endsWith("'")
  ) {
    return [key, rawValue.slice(1, -1)];
  }

  return [key, rawValue];
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const line of content.split(/\r?\n/u)) {
    const entry = parseLine(line);
    if (!entry) {
      continue;
    }

    const [key, value] = entry;
    parsed[key] = value;
  }

  return parsed;
}

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

function buildDerivedDatabaseUrl(env) {
  const host = env.POSTGRES_HOST?.trim() || "127.0.0.1";
  const port = parsePositiveInteger(env.POSTGRES_PORT, 5433);
  const username = env.POSTGRES_USER?.trim() || "blockchain_escrow";
  const password = env.POSTGRES_PASSWORD?.trim() || "blockchain_escrow";
  const database = env.POSTGRES_DB?.trim() || "blockchain_escrow";

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function loadLocalEnvironment(baseEnv = process.env) {
  const exampleEnv = parseEnvFile(path.join(repoRoot, ".env.example"));
  const extraEnvFiles = parseEnvFileList(baseEnv.LOCAL_ENV_FILES);
  const projectEnv = {
    ...parseEnvFile(path.join(repoRoot, ".env")),
    ...parseEnvFile(path.join(repoRoot, ".env.local")),
    ...extraEnvFiles.reduce(
      (accumulator, relativePath) => ({
        ...accumulator,
        ...parseEnvFile(path.resolve(repoRoot, relativePath))
      }),
      {}
    )
  };

  const environment = {
    ...exampleEnv,
    ...projectEnv,
    ...baseEnv
  };

  const hasExplicitDatabaseUrl =
    Boolean(baseEnv.DATABASE_URL && baseEnv.DATABASE_URL.trim().length > 0) ||
    Boolean(projectEnv.DATABASE_URL && projectEnv.DATABASE_URL.trim().length > 0);

  if (!hasExplicitDatabaseUrl) {
    environment.DATABASE_URL = buildDerivedDatabaseUrl(environment);
    environment.LOCAL_DATABASE_URL_SOURCE = "POSTGRES_*";
  } else {
    environment.LOCAL_DATABASE_URL_SOURCE = "DATABASE_URL";
  }

  return environment;
}
