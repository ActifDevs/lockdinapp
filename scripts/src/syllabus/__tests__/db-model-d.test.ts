/**
 * Model D importer/adoption/publication integration tests (DATABASE_URL required).
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  db,
  pool,
  subjectsTable,
  syllabusVersionsTable,
  syllabusUnitsTable,
} from "@workspace/db";
import { adoptLegacyIdentity } from "../adopt.js";
import { importSyllabusRevision } from "../db-upsert.js";
import { publishSyllabusRevision } from "../publish.js";
import type { NormalizedSyllabus } from "../normalize.js";

const CODE = "TEST6301";
const CODE_B = "TEST6302";
const CODES = [CODE, CODE_B];

async function deleteTestSubjects() {
  for (const code of CODES) {
    await db.delete(subjectsTable).where(eq(subjectsTable.code, code));
  }
}

beforeEach(deleteTestSubjects);
afterEach(deleteTestSubjects);
afterAll(async () => {
  await deleteTestSubjects();
  await pool.end();
});

function syllabus(overrides: Partial<NormalizedSyllabus> = {}): NormalizedSyllabus {
  return {
    subjectCode: CODE,
    subjectName: "Model D Subject",
    color: "#111111",
    csvFile: "model-d.csv",
    examBoard: "Cambridge International",
    qualification: "Cambridge International AS & A Level",
    versionLabel: "Spec",
    validFrom: null,
    validTo: null,
    isCurrent: false,
    units: [
      {
        title: "Unit Keep",
        orderIndex: 0,
        topics: [
          {
            title: "Topic Keep",
            orderIndex: 0,
            learningOutcomes: [
              {
                outcome: "Keep this outcome",
                orderIndex: 0,
                occurrences: [{ componentKey: "MD/1|AS Level", level: "AS Level" }],
              },
            ],
          },
        ],
      },
      {
        title: "Unit Drop",
        orderIndex: 1,
        topics: [
          {
            title: "Topic Drop",
            orderIndex: 0,
            learningOutcomes: [
              {
                outcome: "Drop this outcome",
                orderIndex: 0,
                occurrences: [{ componentKey: "MD/1|AS Level", level: "AS Level" }],
              },
            ],
          },
        ],
      },
    ],
    components: [
      {
        paperCode: "MD/1",
        level: "AS Level",
        componentName: "Paper 1",
        durationMinutes: 60,
        totalMarks: 40,
        weightingPercent: 50,
        orderIndex: 0,
      },
    ],
    notices: [],
    ...overrides,
  };
}

describe("0012 identity constraints", () => {
  it("allows the same content hash and source_file under different logical keys", async () => {
    const source = syllabus();
    await importSyllabusRevision(source, "rev-a");
    await importSyllabusRevision(source, "rev-b");
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const versions = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    expect(versions).toHaveLength(2);
    expect(new Set(versions.map((row) => row.contentSha256)).size).toBe(1);
    expect(versions.every((row) => row.sourceFile === "model-d.csv")).toBe(true);
  });

  it("rejects a duplicate logical_revision_key for the same subject", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    await importSyllabusRevision(syllabus({ csvFile: "other.csv" }), "rev-a");
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const versions = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    expect(versions).toHaveLength(1);
    expect(versions[0]!.sourceFile).toBe("other.csv");
  });
});

describe("draft import", () => {
  it("creates a non-default draft and no-ops the same hash", async () => {
    const created = await importSyllabusRevision(syllabus(), "rev-a");
    expect(created.operation).toBe("draft-created");
    const again = await importSyllabusRevision(syllabus(), "rev-a");
    expect(again.operation).toBe("already-imported");
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const [version] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    expect(version.lifecycle).toBe("draft");
    expect(version.isCurrent).toBe(false);
  });

  it("rebuilds a draft when the hash changes", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    const rebuilt = await importSyllabusRevision(
      syllabus({
        components: [
          {
            paperCode: "MD/1",
            level: "AS Level",
            componentName: "Paper 1",
            durationMinutes: 60,
            totalMarks: 40,
            weightingPercent: 80,
            orderIndex: 0,
          },
        ],
      }),
      "rev-a",
    );
    expect(rebuilt.operation).toBe("draft-rebuilt");
  });

  it("rejects changing a published graph under the same key", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-a",
      makeDefault: true,
    });
    await expect(
      importSyllabusRevision(
        syllabus({
          units: [{ title: "Changed", orderIndex: 0, topics: [] }],
        }),
        "rev-a",
      ),
    ).rejects.toThrow(/immutable/);
  });

  it("updates provenance only when the filename changes and the hash matches", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    const result = await importSyllabusRevision(
      syllabus({ csvFile: "renamed.csv" }),
      "rev-a",
    );
    expect(result.operation).toBe("provenance-updated");
  });
});

describe("legacy adoption", () => {
  it("adopts identity metadata when the DB graph matches the source", async () => {
    await importSyllabusRevision(syllabus(), "tmp");
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const [version] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    const unitIds = (
      await db.select().from(syllabusUnitsTable).where(eq(syllabusUnitsTable.syllabusVersionId, version.id))
    ).map((row) => row.id);
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET logical_revision_key = NULL,
          content_sha256 = NULL,
          lifecycle = 'published',
          is_current = true,
          published_at = now()
      WHERE id = ${version.id}
    `);
    const adopted = await adoptLegacyIdentity({
      subjectCode: CODE,
      sourceFile: "model-d.csv",
      logicalRevisionKey: "legacy-key",
      syllabus: syllabus(),
    });
    expect(adopted.operation).toBe("legacy-adopted");
    const [after] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.id, version.id));
    expect(after.logicalRevisionKey).toBe("legacy-key");
    expect(after.importedAt.getTime()).toBe(version.importedAt.getTime());
    const unitsAfter = (
      await db.select().from(syllabusUnitsTable).where(eq(syllabusUnitsTable.syllabusVersionId, version.id))
    ).map((row) => row.id);
    expect(unitsAfter).toEqual(unitIds);
    const noop = await adoptLegacyIdentity({
      subjectCode: CODE,
      sourceFile: "model-d.csv",
      logicalRevisionKey: "legacy-key",
      syllabus: syllabus(),
    });
    expect(noop.operation).toBe("already-adopted");
  });

  it("rejects a graph mismatch and a different key on an adopted row", async () => {
    await importSyllabusRevision(syllabus(), "tmp");
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const [version] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET logical_revision_key = NULL, content_sha256 = NULL, lifecycle = 'published', is_current = true
      WHERE id = ${version.id}
    `);
    await expect(
      adoptLegacyIdentity({
        subjectCode: CODE,
        sourceFile: "model-d.csv",
        logicalRevisionKey: "legacy-key",
        syllabus: syllabus({ units: [{ title: "Other", orderIndex: 0, topics: [] }] }),
      }),
    ).rejects.toThrow(/does not match/);

    await adoptLegacyIdentity({
      subjectCode: CODE,
      sourceFile: "model-d.csv",
      logicalRevisionKey: "legacy-key",
      syllabus: syllabus(),
    });
    await expect(
      adoptLegacyIdentity({
        subjectCode: CODE,
        sourceFile: "model-d.csv",
        logicalRevisionKey: "other-key",
        syllabus: syllabus(),
      }),
    ).rejects.toThrow(/already assigned/);
  });
});

describe("source removal across versions", () => {
  it("keeps version A rows when draft B omits entities", async () => {
    const full = syllabus();
    await importSyllabusRevision(full, "rev-a");
    await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-a",
      makeDefault: true,
    });
    const [versionA] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-a"));
    const unitsABefore = await db
      .select()
      .from(syllabusUnitsTable)
      .where(eq(syllabusUnitsTable.syllabusVersionId, versionA.id));
    const omitted = syllabus({
      csvFile: "model-d-b.csv",
      units: [full.units[0]!],
    });
    await importSyllabusRevision(omitted, "rev-b");
    const unitsAAfter = await db
      .select()
      .from(syllabusUnitsTable)
      .where(eq(syllabusUnitsTable.syllabusVersionId, versionA.id));
    expect(unitsAAfter.map((row) => row.id).sort()).toEqual(
      unitsABefore.map((row) => row.id).sort(),
    );
    const [versionB] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-b"));
    const unitsB = await db
      .select()
      .from(syllabusUnitsTable)
      .where(eq(syllabusUnitsTable.syllabusVersionId, versionB.id));
    expect(unitsB.map((row) => row.title)).toEqual(["Unit Keep"]);
  });
});

describe("publication", () => {
  it("publishes a draft as DEFAULT and rejects a second null-window publish", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    const published = await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-a",
      makeDefault: true,
    });
    expect(published.isCurrent).toBe(true);
    await importSyllabusRevision(syllabus({ csvFile: "b.csv" }), "rev-b");
    await expect(
      publishSyllabusRevision({
        subjectCode: CODE,
        logicalRevisionKey: "rev-b",
        makeDefault: true,
      }),
    ).rejects.toThrow(/null applicability/);
  });

  it("retires overlapping published A when publishing B as DEFAULT", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-a",
      makeDefault: true,
    });
    const [a] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-a"));
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET applicable_from_year = 2025, applicable_from_series = 'Feb/Mar',
          applicable_to_year = 2027, applicable_to_series = 'Oct/Nov'
      WHERE id = ${a.id}
    `);
    await importSyllabusRevision(syllabus({ csvFile: "b.csv" }), "rev-b");
    const [b] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-b"));
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET applicable_from_year = 2026, applicable_from_series = 'May/June',
          applicable_to_year = 2028, applicable_to_series = 'Oct/Nov'
      WHERE id = ${b.id}
    `);
    const result = await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-b",
      makeDefault: true,
      retireRevisionKey: "rev-a",
    });
    expect(result.retiredRevisionKey).toBe("rev-a");
    const [afterA] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-a"));
    const [afterB] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-b"));
    expect(afterA.lifecycle).toBe("retired");
    expect(afterA.isCurrent).toBe(false);
    expect(afterB.lifecycle).toBe("published");
    expect(afterB.isCurrent).toBe(true);
  });

  it("allows two published versions with non-overlapping windows", async () => {
    await importSyllabusRevision(syllabus(), "rev-a");
    await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-a",
      makeDefault: true,
    });
    const [a] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-a"));
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET applicable_from_year = 2022, applicable_from_series = 'Feb/Mar',
          applicable_to_year = 2024, applicable_to_series = 'Oct/Nov'
      WHERE id = ${a.id}
    `);
    await importSyllabusRevision(syllabus({ csvFile: "b.csv" }), "rev-b");
    const [b] = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.logicalRevisionKey, "rev-b"));
    await db.execute(sql`
      UPDATE public.syllabus_versions
      SET applicable_from_year = 2025, applicable_from_series = 'Feb/Mar',
          applicable_to_year = 2027, applicable_to_series = 'Oct/Nov'
      WHERE id = ${b.id}
    `);
    await publishSyllabusRevision({
      subjectCode: CODE,
      logicalRevisionKey: "rev-b",
      makeDefault: true,
    });
    const versions = await db.select().from(syllabusVersionsTable);
    const published = versions.filter((row) => row.lifecycle === "published");
    expect(published).toHaveLength(2);
    expect(published.filter((row) => row.isCurrent)).toHaveLength(1);
  });
});

describe("concurrency", () => {
  it("does not create two rows for the same logical key", async () => {
    const source = syllabus();
    const results = await Promise.allSettled([
      importSyllabusRevision(source, "rev-a"),
      importSyllabusRevision(source, "rev-a"),
    ]);
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, CODE));
    const versions = await db
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));
    expect(versions).toHaveLength(1);
    expect(results.filter((row) => row.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
  });
});
