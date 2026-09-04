-- Phase 7 Slice A1: Generic assessment routes and study options schema foundation.
-- Additive migration: creates route sets, routes, route components, option groups,
-- options, option units, year mappings, user option selections, and alters user_subjects.
-- Preserves existing r001 graphs, content hashes, and membership pins.
-- All new reference tables are protected with RLS (authenticated SELECT only).
-- User selections are protected with RLS (owner-scoped SELECT only; direct writes denied).

CREATE TYPE "public"."assessment_route_set_lifecycle" AS ENUM('draft', 'published', 'retired');
--> statement-breakpoint
CREATE TYPE "public"."assessment_qualification_target" AS ENUM('as_level', 'a_level');
--> statement-breakpoint
CREATE TYPE "public"."assessment_pathway_type" AS ENUM('single_series', 'staged_completion', 'full_same_series');
--> statement-breakpoint
CREATE TYPE "public"."assessment_progression_eligibility" AS ENUM('eligible', 'not_eligible', 'not_applicable');
--> statement-breakpoint
CREATE TYPE "public"."assessment_component_role" AS ENUM('current_sitting', 'carried_forward');
--> statement-breakpoint
CREATE TYPE "public"."assessment_option_group_qualification_target" AS ENUM('as_level', 'a_level', 'both');
--> statement-breakpoint

ALTER TABLE "assessment_components" ADD CONSTRAINT "assessment_components_id_version_unique" UNIQUE("id","syllabus_version_id");
--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_id_version_unique" UNIQUE("id","syllabus_version_id");
--> statement-breakpoint

CREATE TABLE "assessment_route_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"route_revision_key" text NOT NULL,
	"lifecycle" "assessment_route_set_lifecycle" DEFAULT 'draft' NOT NULL,
	"manifest_sha256" text,
	"source_manifest" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "assessment_route_sets_id_version_unique" UNIQUE("id","syllabus_version_id"),
	CONSTRAINT "assessment_route_sets_version_revision_unique" UNIQUE("syllabus_version_id","route_revision_key"),
	CONSTRAINT "assessment_route_sets_non_empty_revision_key" CHECK (char_length("route_revision_key") > 0),
	CONSTRAINT "assessment_route_sets_published_contract" CHECK ("lifecycle" <> 'published' OR ("published_at" IS NOT NULL AND "manifest_sha256" IS NOT NULL)),
	CONSTRAINT "assessment_route_sets_manifest_sha256_format" CHECK ("manifest_sha256" IS NULL OR "manifest_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "assessment_route_sets" ADD CONSTRAINT "assessment_route_sets_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_route_sets_one_published_per_version" ON "assessment_route_sets" USING btree ("syllabus_version_id") WHERE ("lifecycle" = 'published');
--> statement-breakpoint

CREATE TABLE "assessment_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_set_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"route_key" text NOT NULL,
	"display_label" text NOT NULL,
	"qualification_target" "assessment_qualification_target" NOT NULL,
	"pathway_type" "assessment_pathway_type" NOT NULL,
	"progression_eligibility" "assessment_progression_eligibility" DEFAULT 'not_applicable' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assessment_routes_id_route_set_version_unique" UNIQUE("id","route_set_id","syllabus_version_id"),
	CONSTRAINT "assessment_routes_id_version_unique" UNIQUE("id","syllabus_version_id"),
	CONSTRAINT "assessment_routes_route_set_key_unique" UNIQUE("route_set_id","route_key"),
	CONSTRAINT "assessment_routes_non_empty_route_key" CHECK (char_length("route_key") > 0),
	CONSTRAINT "assessment_routes_order_index_nonnegative" CHECK ("order_index" >= 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_routes" ADD CONSTRAINT "assessment_routes_route_set_version_fk" FOREIGN KEY ("route_set_id","syllabus_version_id") REFERENCES "public"."assessment_route_sets"("id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_route_components" (
	"route_id" integer NOT NULL,
	"route_set_id" integer NOT NULL,
	"component_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"role" "assessment_component_role" NOT NULL,
	"qualification_weighting_percent" numeric(7, 4),
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assessment_route_components_pk" PRIMARY KEY("route_id","component_id"),
	CONSTRAINT "assessment_route_components_route_order_unique" UNIQUE("route_id","order_index"),
	CONSTRAINT "assessment_route_components_order_index_nonnegative" CHECK ("order_index" >= 0),
	CONSTRAINT "assessment_route_components_weighting_range" CHECK ("qualification_weighting_percent" IS NULL OR ("qualification_weighting_percent" > 0.0000 AND "qualification_weighting_percent" <= 100.0000))
);
--> statement-breakpoint
ALTER TABLE "assessment_route_components" ADD CONSTRAINT "assessment_route_components_route_fk" FOREIGN KEY ("route_id","route_set_id","syllabus_version_id") REFERENCES "public"."assessment_routes"("id","route_set_id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessment_route_components" ADD CONSTRAINT "assessment_route_components_component_fk" FOREIGN KEY ("component_id","syllabus_version_id") REFERENCES "public"."assessment_components"("id","syllabus_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_study_option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_set_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"group_key" text NOT NULL,
	"display_label" text NOT NULL,
	"applicable_qualification_target" "assessment_option_group_qualification_target" DEFAULT 'both' NOT NULL,
	"applicable_component_id" integer,
	"min_selections" integer NOT NULL,
	"max_selections" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assessment_study_option_groups_id_route_set_version_unique" UNIQUE("id","route_set_id","syllabus_version_id"),
	CONSTRAINT "assessment_study_option_groups_id_version_unique" UNIQUE("id","syllabus_version_id"),
	CONSTRAINT "assessment_study_option_groups_route_set_key_unique" UNIQUE("route_set_id","group_key"),
	CONSTRAINT "assessment_study_option_groups_non_empty_group_key" CHECK (char_length("group_key") > 0),
	CONSTRAINT "assessment_study_option_groups_order_index_nonnegative" CHECK ("order_index" >= 0),
	CONSTRAINT "assessment_study_option_groups_min_selections_positive" CHECK ("min_selections" >= 1),
	CONSTRAINT "assessment_study_option_groups_max_gte_min" CHECK ("max_selections" >= "min_selections")
);
--> statement-breakpoint
ALTER TABLE "assessment_study_option_groups" ADD CONSTRAINT "assessment_study_option_groups_route_set_version_fk" FOREIGN KEY ("route_set_id","syllabus_version_id") REFERENCES "public"."assessment_route_sets"("id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessment_study_option_groups" ADD CONSTRAINT "assessment_study_option_groups_component_fk" FOREIGN KEY ("applicable_component_id","syllabus_version_id") REFERENCES "public"."assessment_components"("id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_study_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"route_set_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"option_key" text NOT NULL,
	"display_label" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assessment_study_options_id_version_unique" UNIQUE("id","syllabus_version_id"),
	CONSTRAINT "assessment_study_options_id_group_version_unique" UNIQUE("id","group_id","syllabus_version_id"),
	CONSTRAINT "assessment_study_options_group_key_unique" UNIQUE("group_id","option_key"),
	CONSTRAINT "assessment_study_options_non_empty_option_key" CHECK (char_length("option_key") > 0),
	CONSTRAINT "assessment_study_options_order_index_nonnegative" CHECK ("order_index" >= 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_study_options" ADD CONSTRAINT "assessment_study_options_group_fk" FOREIGN KEY ("group_id","route_set_id","syllabus_version_id") REFERENCES "public"."assessment_study_option_groups"("id","route_set_id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_study_option_units" (
	"option_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	CONSTRAINT "assessment_study_option_units_pk" PRIMARY KEY("option_id","unit_id"),
	CONSTRAINT "assessment_study_option_units_option_unit_version_unique" UNIQUE("option_id","unit_id","syllabus_version_id")
);
--> statement-breakpoint
ALTER TABLE "assessment_study_option_units" ADD CONSTRAINT "assessment_study_option_units_option_fk" FOREIGN KEY ("option_id","syllabus_version_id") REFERENCES "public"."assessment_study_options"("id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessment_study_option_units" ADD CONSTRAINT "assessment_study_option_units_unit_fk" FOREIGN KEY ("unit_id","syllabus_version_id") REFERENCES "public"."syllabus_units"("id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_study_option_year_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"exam_year" integer NOT NULL,
	"component_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"assessment_role" text NOT NULL,
	CONSTRAINT "assessment_study_option_year_mappings_logical_unique" UNIQUE("option_id","exam_year","unit_id"),
	CONSTRAINT "assessment_study_option_year_mappings_exam_year_range" CHECK ("exam_year" BETWEEN 1000 AND 9999),
	CONSTRAINT "assessment_study_option_year_mappings_non_empty_role" CHECK (char_length("assessment_role") > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_study_option_year_mappings" ADD CONSTRAINT "assessment_study_option_year_mappings_option_unit_version_fk" FOREIGN KEY ("option_id","unit_id","syllabus_version_id") REFERENCES "public"."assessment_study_option_units"("option_id","unit_id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessment_study_option_year_mappings" ADD CONSTRAINT "assessment_study_option_year_mappings_component_fk" FOREIGN KEY ("component_id","syllabus_version_id") REFERENCES "public"."assessment_components"("id","syllabus_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "user_subjects" ADD COLUMN "assessment_route_id" integer;
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_user_id_subject_id_syllabus_version_id_unique" UNIQUE("user_id","subject_id","syllabus_version_id");
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_assessment_route_fk" FOREIGN KEY ("assessment_route_id","syllabus_version_id") REFERENCES "public"."assessment_routes"("id","syllabus_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_subjects_assessment_route_version_idx" ON "user_subjects" USING btree ("assessment_route_id","syllabus_version_id");
--> statement-breakpoint

CREATE TABLE "user_subject_option_selections" (
	"user_id" uuid NOT NULL,
	"subject_id" integer NOT NULL,
	"option_group_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subject_option_selections_pk" PRIMARY KEY("user_id","subject_id","option_group_id","option_id")
);
--> statement-breakpoint
ALTER TABLE "user_subject_option_selections" ADD CONSTRAINT "user_subject_option_selections_membership_fk" FOREIGN KEY ("user_id","subject_id","syllabus_version_id") REFERENCES "public"."user_subjects"("user_id","subject_id","syllabus_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_subject_option_selections" ADD CONSTRAINT "user_subject_option_selections_option_fk" FOREIGN KEY ("option_id","option_group_id","syllabus_version_id") REFERENCES "public"."assessment_study_options"("id","group_id","syllabus_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_subject_option_selections_user_subject_idx" ON "user_subject_option_selections" USING btree ("user_id","subject_id");
--> statement-breakpoint
CREATE INDEX "user_subject_option_selections_option_idx" ON "user_subject_option_selections" USING btree ("option_id","option_group_id","syllabus_version_id");
--> statement-breakpoint

ALTER TABLE "assessment_route_sets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_route_sets FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_route_sets FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_route_sets TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_route_sets_select_authenticated" ON public.assessment_route_sets FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_routes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_routes FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_routes FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_routes TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_routes_select_authenticated" ON public.assessment_routes FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_route_components" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_route_components FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_route_components FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_route_components TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_route_components_select_authenticated" ON public.assessment_route_components FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_study_option_groups" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_groups FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_groups FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_study_option_groups TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_study_option_groups_select_authenticated" ON public.assessment_study_option_groups FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_study_options" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_options FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_options FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_study_options TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_study_options_select_authenticated" ON public.assessment_study_options FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_study_option_units" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_units FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_units FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_study_option_units TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_study_option_units_select_authenticated" ON public.assessment_study_option_units FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "assessment_study_option_year_mappings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_year_mappings FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.assessment_study_option_year_mappings FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.assessment_study_option_year_mappings TO authenticated;
--> statement-breakpoint
CREATE POLICY "assessment_study_option_year_mappings_select_authenticated" ON public.assessment_study_option_year_mappings FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

ALTER TABLE "user_subject_option_selections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.user_subject_option_selections FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.user_subject_option_selections FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.user_subject_option_selections TO authenticated;
--> statement-breakpoint
CREATE POLICY "user_subject_option_selections_select_own" ON public.user_subject_option_selections FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
