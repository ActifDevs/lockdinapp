import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

type JournalDocument = {
  entries: Array<{ tag: string; when: number }>;
};

export function loadCommittedMigrationJournal(repoRoot: string) {
  const journal = JSON.parse(
    readFileSync(
      path.join(repoRoot, "lib", "db", "migrations", "meta", "_journal.json"),
      "utf8",
    ),
  ) as JournalDocument;
  const entries = journal.entries;
  const latest = entries[entries.length - 1]!;
  const latestPath = path.join(
    repoRoot,
    "lib",
    "db",
    "migrations",
    `${latest.tag}.sql`,
  );
  return {
    count: entries.length,
    latestTag: latest.tag,
    latestWhen: String(latest.when),
    latestHash: createHash("sha256").update(readFileSync(latestPath)).digest("hex"),
  };
}
