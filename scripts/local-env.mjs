import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");

const defaultEnvFiles = [".env.example", ".env", ".env.local"];

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

export function loadLocalEnvironment(baseEnv = process.env) {
  const mergedEnv = {};

  for (const relativeFilePath of defaultEnvFiles) {
    Object.assign(mergedEnv, parseEnvFile(path.join(repoRoot, relativeFilePath)));
  }

  return {
    ...mergedEnv,
    ...baseEnv
  };
}
