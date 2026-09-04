-- Phase 7 Slice A2B: Route-reference lifecycle enforcement and published/retired
-- contract immutability (additive only). No content rows. No schema redesign.
--
-- Enforces:
-- - route-set INSERT only as draft
-- - legal lifecycle transitions: draft→published, published→retired
-- - published/retired route-set UPDATE/DELETE rejection (except legal retire)
-- - child graph INSERT/UPDATE/DELETE only while owning route set is draft
--
-- Does NOT invent retired_at. published_at remains original publication timestamp.

CREATE OR REPLACE FUNCTION public.lockdin_route_set_lifecycle(p_route_set_id integer)
RETURNS public.assessment_route_set_lifecycle
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_lifecycle public.assessment_route_set_lifecycle;
BEGIN
  SELECT rs.lifecycle
  INTO v_lifecycle
  FROM public.assessment_route_sets AS rs
  WHERE rs.id = p_route_set_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'route-reference child rows may only be mutated while owning route set is draft: owning route set % not found',
      p_route_set_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN v_lifecycle;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_route_set_id_for_study_option(p_option_id integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_route_set_id integer;
BEGIN
  SELECT o.route_set_id
  INTO v_route_set_id
  FROM public.assessment_study_options AS o
  WHERE o.id = p_option_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'route-reference child rows may only be mutated while owning route set is draft: study option % not found',
      p_option_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN v_route_set_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_enforce_assessment_route_set_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION
        'published/retired route-reference contract is immutable: route sets may only be inserted as draft'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.lifecycle = 'draft' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION
      'published/retired route-reference contract is immutable'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- UPDATE
  IF OLD.lifecycle = 'draft' THEN
    IF NEW.lifecycle = 'retired' THEN
      RAISE EXCEPTION
        'published/retired route-reference contract is immutable: draft cannot transition directly to retired'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    -- draft → draft | draft → published
    RETURN NEW;
  END IF;

  IF OLD.lifecycle = 'published' THEN
    IF NEW.lifecycle = 'retired' THEN
      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.syllabus_version_id IS DISTINCT FROM OLD.syllabus_version_id
        OR NEW.route_revision_key IS DISTINCT FROM OLD.route_revision_key
        OR NEW.manifest_sha256 IS DISTINCT FROM OLD.manifest_sha256
        OR NEW.source_manifest IS DISTINCT FROM OLD.source_manifest
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.published_at IS DISTINCT FROM OLD.published_at
      THEN
        RAISE EXCEPTION
          'published/retired route-reference contract is immutable: published→retired may only change lifecycle'
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'published/retired route-reference contract is immutable'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- retired → *
  RAISE EXCEPTION
    'published/retired route-reference contract is immutable'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_enforce_route_reference_child_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_old_route_set_id integer;
  v_new_route_set_id integer;
  v_old_lifecycle public.assessment_route_set_lifecycle;
  v_new_lifecycle public.assessment_route_set_lifecycle;
BEGIN
  IF TG_TABLE_NAME = 'assessment_routes'
    OR TG_TABLE_NAME = 'assessment_route_components'
    OR TG_TABLE_NAME = 'assessment_study_option_groups'
    OR TG_TABLE_NAME = 'assessment_study_options'
  THEN
    IF TG_OP = 'DELETE' THEN
      v_old_route_set_id := OLD.route_set_id;
    ELSIF TG_OP = 'INSERT' THEN
      v_new_route_set_id := NEW.route_set_id;
    ELSE
      v_old_route_set_id := OLD.route_set_id;
      v_new_route_set_id := NEW.route_set_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'assessment_study_option_units'
    OR TG_TABLE_NAME = 'assessment_study_option_year_mappings'
  THEN
    IF TG_OP = 'DELETE' THEN
      v_old_route_set_id := public.lockdin_route_set_id_for_study_option(OLD.option_id);
    ELSIF TG_OP = 'INSERT' THEN
      v_new_route_set_id := public.lockdin_route_set_id_for_study_option(NEW.option_id);
    ELSE
      v_old_route_set_id := public.lockdin_route_set_id_for_study_option(OLD.option_id);
      v_new_route_set_id := public.lockdin_route_set_id_for_study_option(NEW.option_id);
    END IF;
  ELSE
    RAISE EXCEPTION
      'route-reference child immutability trigger attached to unexpected table %',
      TG_TABLE_NAME
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_new_lifecycle := public.lockdin_route_set_lifecycle(v_new_route_set_id);
    IF v_new_lifecycle IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION
        'route-reference child rows may only be mutated while owning route set is draft'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old_lifecycle := public.lockdin_route_set_lifecycle(v_old_route_set_id);
    IF v_old_lifecycle IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION
        'route-reference child rows may only be mutated while owning route set is draft'
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: both OLD and NEW owners must be draft
  v_old_lifecycle := public.lockdin_route_set_lifecycle(v_old_route_set_id);
  v_new_lifecycle := public.lockdin_route_set_lifecycle(v_new_route_set_id);
  IF v_old_lifecycle IS DISTINCT FROM 'draft'
    OR v_new_lifecycle IS DISTINCT FROM 'draft'
  THEN
    RAISE EXCEPTION
      'route-reference child rows may only be mutated while owning route set is draft'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_route_sets_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_route_sets
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_assessment_route_set_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_routes_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_routes
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_route_components_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_route_components
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_study_option_groups_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_study_option_groups
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_study_options_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_study_options
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_study_option_units_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_study_option_units
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
--> statement-breakpoint

CREATE TRIGGER lockdin_assessment_study_option_year_mappings_immutability
BEFORE INSERT OR UPDATE OR DELETE ON public.assessment_study_option_year_mappings
FOR EACH ROW
EXECUTE FUNCTION public.lockdin_enforce_route_reference_child_immutability();
