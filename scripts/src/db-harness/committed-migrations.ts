import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./stack.js";

export type CommittedMigration = {
  idx: number;
  tag: string;
  when: number;
  sqlFileName: string;
  sqlPath: string;
  sha256: string;
};

type JournalDocument = {
  entries: Array<{
    idx: number;
    tag: string;
    when: number;
  }>;
};

export function loadCommittedMigrations(
  repoRoot = REPO_ROOT,
): CommittedMigration[] {
  const migrationsDir = join(repoRoot, "lib", "db", "migrations");
  const journal = JSON.parse(
    readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8"),
  ) as JournalDocument;

  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new Error("Drizzle journal has no entries.");
  }

  return journal.entries.map((entry) => {
    const sqlFileName = `${entry.tag}.sql`;
    const sqlPath = join(migrationsDir, sqlFileName);
    const sha256 = createHash("sha256").update(readFileSync(sqlPath)).digest("hex");
    return {
      idx: entry.idx,
      tag: entry.tag,
      when: entry.when,
      sqlFileName,
      sqlPath,
      sha256,
    };
  });
}

export function latestCommittedMigration(
  repoRoot = REPO_ROOT,
): CommittedMigration {
  const migrations = loadCommittedMigrations(repoRoot);
  return migrations[migrations.length - 1]!;
}

export function checkMigrationIntegrity(repoRoot = REPO_ROOT): {
  ok: true;
  count: number;
  head: string;
} {
  const migrationsDir = join(repoRoot, "lib", "db", "migrations");
  const migrations = loadCommittedMigrations(repoRoot);
  const tags = new Set<string>();
  const hashes = new Set<string>();
  const timestamps = new Set<number>();

  for (const [index, migration] of migrations.entries()) {
    if (migration.idx !== index) {
      throw new Error(
        `Journal idx drift at position ${index}: expected ${index}, found ${migration.idx}.`,
      );
    }
    if (tags.has(migration.tag)) {
      throw new Error(`Duplicate migration tag ${migration.tag}.`);
    }
    tags.add(migration.tag);
    if (timestamps.has(migration.when)) {
      throw new Error(`Duplicate journal timestamp ${migration.when}.`);
    }
    timestamps.add(migration.when);
    if (index > 0 && migration.when <= migrations[index - 1]!.when) {
      throw new Error(`Journal timestamps are not strictly increasing at ${migration.tag}.`);
    }
    if (hashes.has(migration.sha256)) {
      throw new Error(`Duplicate migration file hash at ${migration.tag}.`);
    }
    hashes.add(migration.sha256);
  }

  const sqlFiles = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
  const unexpected = sqlFiles.filter((name) => !tags.has(name.replace(/\.sql$/, "")));
  if (unexpected.length > 0) {
    throw new Error(
      `SQL files are missing from the Drizzle journal: ${unexpected.join(", ")}.`,
    );
  }
  const missing = [...tags].filter((tag) => !sqlFiles.includes(`${tag}.sql`));
  if (missing.length > 0) {
    throw new Error(`Journal tags are missing SQL files: ${missing.join(", ")}.`);
  }

  return {
    ok: true,
    count: migrations.length,
    head: migrations[migrations.length - 1]!.tag,
  };
}
