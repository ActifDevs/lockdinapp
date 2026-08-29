-- Phase 6 Slice 3B: identity constraint correction.
-- content_sha256 is a graph fingerprint (non-unique).
-- source_file is last-seen provenance (non-unique).
-- logical_revision_key uniqueness is unchanged.
-- No data backfill, no pin changes, no graph mutation.
ALTER TABLE "syllabus_versions" DROP CONSTRAINT "syllabus_versions_subject_source_unique";--> statement-breakpoint
DROP INDEX "syllabus_versions_content_sha256_per_subject";--> statement-breakpoint
CREATE INDEX "syllabus_versions_subject_source_idx" ON "syllabus_versions" USING btree ("subject_id","source_file");--> statement-breakpoint
CREATE INDEX "syllabus_versions_content_sha256_idx" ON "syllabus_versions" USING btree ("subject_id","content_sha256") WHERE "syllabus_versions"."content_sha256" is not null;
