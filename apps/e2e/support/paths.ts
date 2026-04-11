import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const supportDirectory = path.dirname(currentFilePath);

export const e2eRoot = path.resolve(supportDirectory, "..");
export const repoRoot = path.resolve(e2eRoot, "../..");
export const authStateDirectory = path.join(e2eRoot, ".auth");
export const seedOutputPath = path.join(e2eRoot, ".tmp", "seed-data.json");
