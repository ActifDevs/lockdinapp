/**
 * One-off, narrowly-targeted cleanup: removes ONLY the exact placeholder
 * "<Subject> foundations" unit + its 3 known placeholder topics that
 * `seedStarterSyllabus()` (artifacts/api-server/src/routes/subjects.ts) creates when a
 * subject is first added. This is test/demo scaffolding, not real syllabus content, and
 * it must be gone before the real Cambridge syllabus import can safely populate the
 * same subjects (see the syllabus_units.syllabus_version_id NOT NULL migration).
 *
 * Deliberately uses raw SQL (not the @workspace/db Drizzle schema) because this script
 * must run against the CURRENT live schema, before the migration that adds new
 * columns — the Drizzle-typed table objects already describe the target schema and
 * would try to select columns that don't exist yet at this point in the sequence.
 *
 * Safety: a unit is only deleted if ALL of the following hold —
 *   1. title === "${subject.name} foundations"
 *   2. it has exactly 3 topics
 *   3. those 3 topics' titles are exactly the known placeholder set (any order)
 *   4. none of those topics has non-null `notes` (a real note would mean a human
 *      actually wrote something there, which is a stronger signal of intentional use)
 * Anything that doesn't match exactly is left untouched and reported separately.
 *
 * Run with: pnpm --filter @workspace/scripts syllabus:cleanup-placeholders
 */
import pg from "pg";

const PLACEHOLDER_TOPIC_TITLES = new Set(["Syllabus overview & exam format", "Core topic review", "Past paper technique"]);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const subjects = (await client.query("select id, name, code from subjects")).rows as { id: number; name: string; code: string }[];

  const toDelete: { unitId: number; unitTitle: string; subjectCode: string; topics: { id: number; title: string; status: string }[] }[] = [];
  const skipped: { unitId: number; unitTitle: string; subjectCode: string; reason: string }[] = [];

  for (const subject of subjects) {
    const units = (
      await client.query("select id, title from syllabus_units where subject_id = $1", [subject.id])
    ).rows as { id: number; title: string }[];

    for (const unit of units) {
      if (unit.title !== `${subject.name} foundations`) continue;

      const topics = (
        await client.query("select id, title, status, notes from syllabus_topics where unit_id = $1", [unit.id])
      ).rows as { id: number; title: string; status: string; notes: string | null }[];

      const titles = new Set(topics.map((t) => t.title));
      const exactTopicMatch = topics.length === 3 && titles.size === 3 && [...titles].every((t) => PLACEHOLDER_TOPIC_TITLES.has(t));
      const anyNotes = topics.some((t) => t.notes !== null);

      if (exactTopicMatch && !anyNotes) {
        toDelete.push({
          unitId: unit.id,
          unitTitle: unit.title,
          subjectCode: subject.code,
          topics: topics.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        });
      } else {
        skipped.push({
          unitId: unit.id,
          unitTitle: unit.title,
          subjectCode: subject.code,
          reason: !exactTopicMatch
            ? `topics don't exactly match the known placeholder set (found: ${[...titles].join(", ")})`
            : "at least one topic has notes set",
        });
      }
    }
  }

  console.log("Placeholder units identified for deletion:");
  for (const d of toDelete) {
    console.log(`  subject=${d.subjectCode} unit_id=${d.unitId} "${d.unitTitle}"`);
    for (const t of d.topics) {
      console.log(`    topic_id=${t.id} "${t.title}" status=${t.status}`);
    }
  }
  if (skipped.length > 0) {
    console.log("\nUnits matched the placeholder title but were NOT deleted (didn't match the exact safety criteria):");
    for (const s of skipped) {
      console.log(`  subject=${s.subjectCode} unit_id=${s.unitId} "${s.unitTitle}" — ${s.reason}`);
    }
  }

  if (toDelete.length === 0) {
    console.log("\nNothing to delete.");
    await client.end();
    return;
  }

  for (const d of toDelete) {
    // ON DELETE CASCADE on syllabus_topics.unit_id removes the 3 topics automatically.
    await client.query("delete from syllabus_units where id = $1", [d.unitId]);
  }

  console.log(`\nDeleted ${toDelete.length} placeholder unit(s) and their topics.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
