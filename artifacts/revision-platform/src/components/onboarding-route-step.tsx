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
      try {
        const nextCatalogues: RouteCatalogueLike[] = [];
        for (const subject of selectedSubjects) {
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
          nextCatalogues.push(catalogue);
        }
        if (cancelled) return;
        onCataloguesChange(nextCatalogues);
        onDraftsChange(nextCatalogues.map((c) => initialRouteDraft(c)));
      } catch {
        if (!cancelled) {
          setError("Could not load assessment choices. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // selectedSubjects is derived; key on selectedIds + subject list identity via ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable deps
  }, [
    selectedIds.join(","),
    examSession,
    JSON.stringify(subjectSessionOverrides),
    assignmentAvailability,
    onCataloguesChange,
    onDraftsChange,
  ]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading how you take each subject…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
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
        if (!catalogue || !draft || catalogue.selectionMode === "none_available") {
          return null;
        }
        const validation = routeDraftValidationError(catalogue, draft);
        return (
          <section
            key={subject.id}
            className="space-y-3 rounded-xl border bg-muted/10 p-4"
          >
            <h3 className="font-medium">{subject.name}</h3>
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Using {catalogue.routes[0]?.displayLabel ?? "the only available route"}.
              </p>
            )}

            <StudyOptionPicker
              groups={catalogue.optionGroups}
              selectedIds={draft.optionIds}
              onChange={(optionIds) =>
                onDraftsChange(
                  drafts.map((row) =>
                    row.subjectId === subject.id ? { ...row, optionIds } : row,
                  ),
                )
              }
            />
            {validation ? (
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
