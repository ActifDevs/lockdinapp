import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const subjectsRouteSrc = readFileSync(path.join(__dirname, "subjects.ts"), "utf8");

/**
 * Regression: Production 500 when hosted syllabus_topics.status/notes were
 * dropped while main still declared those columns in the Drizzle schema.
 * Live-path queries must project reference columns only.
 */
describe("subjects route syllabus_topics column projection", () => {
  it("does not use an unprojected select against syllabusTopicsTable", () => {
    expect(subjectsRouteSrc).not.toMatch(/select\(\)\s*\n?\s*\.from\(\s*syllabusTopicsTable\s*\)/);
    expect(subjectsRouteSrc).not.toMatch(/\.select\(\)\s*\.from\(\s*syllabusTopicsTable\s*\)/);
  });

  it("projects reference columns and supplies neutral status/notes on syllabus GET", () => {
    expect(subjectsRouteSrc).toMatch(/syllabusTopicReferenceColumns/);
    expect(subjectsRouteSrc).toMatch(/status:\s*"not_started"/);
    expect(subjectsRouteSrc).toMatch(/notes:\s*null/);
    expect(subjectsRouteSrc).not.toMatch(/status:\s*topic\.status/);
    expect(subjectsRouteSrc).not.toMatch(/notes:\s*topic\.notes/);
  });
});
