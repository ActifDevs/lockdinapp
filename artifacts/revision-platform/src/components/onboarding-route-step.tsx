import { useEffect, useMemo, useState } from "react";
import { listSubjectAssessmentRoutes } from "@workspace/api-client-react";
import { StudyOptionPicker } from "@/components/study-option-picker";
import { cn } from "@/lib/utils";
import {
  effectiveSessionLabel,
  syllabusVersionIdForSubjectSession,
  type SubjectAssignmentSessions,
  type SubjectSessionOverrides,
} from "@/lib/membership-session-selection";
import {
  initialRouteDraft,
  routeDraftValidationError,
  type RouteCatalogueLike,
  type SubjectRouteDraft,
} from "@/lib/route-selection";

type CatalogueSubject = { id: number; name: string };

type OnboardingRouteStepProps = {
  subjects: CatalogueSubject[];
  selectedIds: number[];
  examSession: string | null;
  subjectSessionOverrides: SubjectSessionOverrides;
  assignmentAvailability: SubjectAssignmentSessions[];
  drafts: SubjectRouteDraft[];
  onDraftsChange: (drafts: SubjectRouteDraft[]) => void;
  catalogues: RouteCatalogueLike[];
  onCataloguesChange: (catalogues: RouteCatalogueLike[]) => void;
  onLoadStateChange?: (state: "loading" | "ready" | "error") => void;
};

export function OnboardingRouteStep({
  subjects,
  selectedIds,
  examSession,
  subjectSessionOverrides,
  assignmentAvailability,
  drafts,
  onDraftsChange,
  catalogues,
  onCataloguesChange,
  onLoadStateChange,
}: OnboardingRouteStepProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSubjects = useMemo(
    () => subjects.filter((s) => selectedIds.includes(s.id)),
    [subjects, selectedIds],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      onLoadStateChange?.("loading");
      try {
        const nextCatalogues = await Promise.all(
          selectedSubjects.map(async (subject) => {
            const label = effectiveSessionLabel(
              subject.id,
              examSession,
              subjectSessionOverrides,
            );
            const versionId = syllabusVersionIdForSubjectSession(
              assignmentAvailability,
              subject.id,
              label,
            );
            if (!versionId) {
              throw new Error(`Missing syllabus version for ${subject.name}`);
            }
            const catalogue = await listSubjectAssessmentRoutes(
              subject.id,
              versionId,
            );
            return catalogue;
          }),
        );
        if (cancelled) return;
        const previousCatalogues = new Map(
          catalogues.map((catalogue) => [catalogue.subjectId, catalogue]),
        );
        const previousDrafts = new Map(
          drafts.map((draft) => [draft.subjectId, draft]),
        );
        onCataloguesChange(nextCatalogues);
        onDraftsChange(
          nextCatalogues.map((catalogue) => {
            const previousCatalogue = previousCatalogues.get(
              catalogue.subjectId,
            );
            const previousDraft = previousDrafts.get(catalogue.subjectId);
            const remainsValid =
              previousCatalogue?.syllabusVersionId ===
                catalogue.syllabusVersionId &&
              previousDraft !== undefined &&
              routeDraftValidationError(catalogue, previousDraft) === undefined;
            return remainsValid ? previousDraft : initialRouteDraft(catalogue);
          }),
        );
        onLoadStateChange?.("ready");
      } catch {
        if (!cancelled) {
          setError("Could not load assessment choices. Please try again.");
          onLoadStateChange?.("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Selected subjects and availability are derived values; key on their content.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable deps
  }, [
    selectedIds.join(","),
    examSession,
    JSON.stringify(subjectSessionOverrides),
    JSON.stringify(assignmentAvailability),
    onCataloguesChange,
    onDraftsChange,
    onLoadStateChange,
  ]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading how you take each subject…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  const needsAnyChoice = catalogues.some(
    (c) => c.selectionMode !== "none_available",
  );

  if (!needsAnyChoice) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Assessment routes unavailable
        </h2>
        <p className="text-sm text-muted-foreground">
          These subjects cannot be enrolled yet because published assessment
          routes are not ready. Your existing subjects stay usable; new
          enrolments stay closed until routes are published.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          How are you taking each subject?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick the assessment path that matches your exam plan. This does not
          change your syllabus version.
        </p>
      </div>

      {selectedSubjects.map((subject) => {
        const catalogue = catalogues.find((c) => c.subjectId === subject.id);
        const draft = drafts.find((d) => d.subjectId === subject.id);
        if (!catalogue || !draft) return null;
        const validation = routeDraftValidationError(catalogue, draft);
        return (
          <section
            key={subject.id}
            className="space-y-3 rounded-xl border bg-muted/10 p-4"
          >
            <h3 className="font-medium">{subject.name}</h3>
            {catalogue.selectionMode === "none_available" ? (
              <p className="text-sm text-destructive" role="alert">
                Assessment routes are not available for this subject yet. Your
                existing subjects will remain unchanged.
              </p>
            ) : null}
            {catalogue.selectionMode === "explicit" ? (
              <div
                className="flex flex-col gap-2"
                role="radiogroup"
                aria-label={`How are you taking ${subject.name}?`}
              >
                {catalogue.routes.map((route) => {
                  const selected = draft.routeId === route.id;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40",
                      )}
                      onClick={() =>
                        onDraftsChange(
                          drafts.map((row) =>
                            row.subjectId === subject.id
                              ? { ...row, routeId: route.id, optionIds: [] }
                              : row,
                          ),
                        )
                      }
                    >
                      <span className="font-medium">{route.displayLabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : catalogue.selectionMode === "auto" ? (
              <p className="text-sm text-muted-foreground">
                Using{" "}
                {catalogue.routes[0]?.displayLabel ??
                  "the only available route"}
                .
              </p>
            ) : null}

            {catalogue.selectionMode !== "none_available" ? (
              <StudyOptionPicker
                groups={catalogue.optionGroups}
                selectedIds={draft.optionIds}
                onChange={(optionIds) =>
                  onDraftsChange(
                    drafts.map((row) =>
                      row.subjectId === subject.id
                        ? { ...row, optionIds }
                        : row,
                    ),
                  )
                }
              />
            ) : null}
            {validation && catalogue.selectionMode !== "none_available" ? (
              <p className="text-xs text-destructive" role="alert">
                {validation}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
