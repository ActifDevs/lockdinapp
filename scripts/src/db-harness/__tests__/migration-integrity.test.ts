import { describe, expect, it } from "vitest";
import {
  checkMigrationIntegrity,
  latestCommittedMigration,
  loadCommittedMigrations,
} from "../committed-migrations.js";

describe("committed migration integrity", () => {
  it("matches the journal to SQL files without hard-coding the current head", () => {
    const result = checkMigrationIntegrity();
    const migrations = loadCommittedMigrations();
    const head = latestCommittedMigration();

    expect(result.ok).toBe(true);
    expect(result.count).toBe(migrations.length);
    expect(result.head).toBe(head.tag);
    expect(migrations[0]?.tag).toBe("0000_syllabus_reference_and_paper_attempts");
    expect(head.tag).toMatch(/^\d{4}_/);
    expect(head.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
