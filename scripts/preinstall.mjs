import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("[preinstall] This repository must be installed using pnpm.");
  process.exit(1);
}

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptsDirectory, "..");

const lockfilesToRemove = ["package-lock.json", "yarn.lock"];

for (const file of lockfilesToRemove) {
  const filePath = path.join(repositoryRoot, file);

  try {
    fs.unlinkSync(filePath);
    console.log(`[preinstall] Removed unwanted lockfile: ${file}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      continue;
    }

    console.error(`[preinstall] Failed to remove ${file}:`, error);
    process.exit(1);
  }
}
