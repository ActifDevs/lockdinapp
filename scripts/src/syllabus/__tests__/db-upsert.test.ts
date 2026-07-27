/**
 * Integration tests for upsertSyllabus against a real Postgres database
 * (requires DATABASE_URL, same as the importer CLI). These tests use synthetic
 * subject codes ("TEST99xx") that never appear in SYLLABUS_IMPORT_MANIFEST and are
 * fully cleaned up (subject row delete cascades to every dependent table) before
 * and after each test, so they never touch real syllabus data.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  subjectsTable,
  syllabusVersionsTable,
  assessmentComponentsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  syllabusLearningOutcomesTable,
} from "@workspace/db";
import { upsertSyllabus } from "../db-upsert.js";
import type { NormalizedSyllabus } from "../normalize.js";

const IDEMPOTENCY_CODE = "TEST9998";
const ROLLBACK_CODE = "TEST9997";
const TEST_CODES = [IDEMPOTENCY_CODE, ROLLBACK_CODE];

async function deleteTestSubjects() {
  for (const code of TEST_CODES) {
    await db.delete(subjectsTable).where(eq(subjectsTable.code, code));
  }
}

beforeEach(deleteTestSubjects);
afterEach(deleteTestSubjects);
afterAll(async () => {
  await deleteTestSubjects();
  await pool.end();
});

function baseSyllabus(overrides: Partial<NormalizedSyllabus>): NormalizedSyllabus {
  return {
    subjectCode: IDEMPOTENCY_CODE,
    subjectName: "Test Subject",
    color: "#000000",
    csvFile: "test.csv",
    examBoard: "Cambridge International",
    qualification: "Cambridge International AS & A Level",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
    units: [
      {
        title: "Unit 1",
        orderIndex: 0,
        topics: [
          {
            title: "Topic A",
            orderIndex: 0,
            learningOutcomes: [
              {
                outcome: "Explain the thing",
                orderIndex: 0,
                occurrences: [{ componentKey: "TEST/1|AS Level", level: "AS Level" }],
              },
            ],
          },
        ],
      },
    ],
    components: [
      {
        paperCode: "TEST/1",
        level: "AS Level",
        componentName: "Paper 1",
        durationMinutes: 60,
        totalMarks: 50,
        weightingPercent: 25,
        orderIndex: 0,
      },
    ],
    notices: [],
    ...overrides,
  };
}

describe("upsertSyllabus (integration)", () => {
  it("is idempotent: re-running the same syllabus a second time creates zero new rows", async () => {
    const syllabus = baseSyllabus({});

    const first = await upsertSyllabus(syllabus);
    expect(first.subject).toBe("created");
    expect(first.units.created).toBe(1);
    expect(first.topics.created).toBe(1);
    expect(first.learningOutcomes.created).toBe(1);
    expect(first.components.created).toBe(1);
    expect(first.relationships.created).toBe(1);

    const second = await upsertSyllabus(syllabus);
    expect(second.subject).toBe("existing");
    expect(second.units).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(second.topics).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(second.learningOutcomes).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(second.components).toMatchObject({ created: 0, updated: 0, unchanged: 1 });

    // Confirm no duplicate rows exist at the database level, not just in the returned counts.
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, IDEMPOTENCY_CODE));
    const units = await db.select().from(syllabusUnitsTable).where(eq(syllabusUnitsTable.subjectId, subject.id));
    expect(units).toHaveLength(1);
    const topics = await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.unitId, units[0].id));
    expect(topics).toHaveLength(1);
    const outcomes = await db.select().from(syllabusLearningOutcomesTable).where(eq(syllabusLearningOutcomesTable.topicId, topics[0].id));
    expect(outcomes).toHaveLength(1);
  });

  it("updates changed fields (e.g. weighting) in place rather than creating duplicate rows", async () => {
    await upsertSyllabus(baseSyllabus({}));

    const updated = baseSyllabus({
      components: [
        {
          paperCode: "TEST/1",
          level: "AS Level",
          componentName: "Paper 1",
          durationMinutes: 60,
          totalMarks: 50,
          weightingPercent: 40, // changed
          orderIndex: 0,
        },
      ],
    });
    const result = await upsertSyllabus(updated);
    expect(result.components).toMatchObject({ created: 0, updated: 1, unchanged: 0 });

    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, IDEMPOTENCY_CODE));
    const [version] = await db.select().from(syllabusVersionsTable).where(eq(syllabusVersionsTable.subjectId, subject.id));
    const components = await db.select().from(assessmentComponentsTable).where(eq(assessmentComponentsTable.syllabusVersionId, version.id));
    expect(components).toHaveLength(1);
    expect(components[0].weightingPercent).toBe(40);
  });

  it("rolls back the entire transaction on failure, leaving no partially-written rows behind", async () => {
    // Two topics sharing the same title under the same unit — violates the
    // syllabus_topics_unit_title_unique DB constraint (normalizeSyllabus() itself
    // would never produce this; this test bypasses it to prove a mid-transaction
    // DB error rolls back everything, including the subject/version rows already
    // inserted earlier in the same transaction).
    const broken = baseSyllabus({
      subjectCode: ROLLBACK_CODE,
      units: [
        {
          title: "Unit 1",
          orderIndex: 0,
          topics: [
            { title: "Duplicate topic", orderIndex: 0, learningOutcomes: [] },
            { title: "Duplicate topic", orderIndex: 1, learningOutcomes: [] },
          ],
        },
      ],
      components: [],
    });

    await expect(upsertSyllabus(broken)).rejects.toThrow();

    // The subject row created earlier in the same transaction must not have survived.
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.code, ROLLBACK_CODE));
    expect(subject).toBeUndefined();
  });
});
