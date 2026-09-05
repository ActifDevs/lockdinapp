import { useEffect, useState } from "react";
import {
  listSubjectAssessmentRoutes,
  useAssignCurrentUserSubjectAssessmentRoute,
  type UserSubjectMembership,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StudyOptionPicker } from "@/components/study-option-picker";
import { cn } from "@/lib/utils";
import {
  applicableOptionGroups,
  applicableOptionIds,
  initialRouteDraft,
  routeDraftValidationError,
  type RouteCatalogueLike,
  type SubjectRouteDraft,
} from "@/lib/route-selection";
import { toast } from "@/hooks/use-toast";
import { getMutationErrorMessage } from "@/lib/query-error-message";

type MembershipAssessmentPanelProps = {
  membership: UserSubjectMembership;
  onSaved?: () => void;
};

/**
 * Settings / remediation surface for version-scoped route + study options.
 * Does not change syllabus pin. Viewing alone never mutates.
 */
export function MembershipAssessmentPanel({
  membership,
  onSaved,
}: MembershipAssessmentPanelProps) {
  const [catalogue, setCatalogue] = useState<RouteCatalogueLike | null>(null);
  const [draft, setDraft] = useState<SubjectRouteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrationWarning, setHydrationWarning] = useState<string | null>(null);
  const assign = useAssignCurrentUserSubjectAssessmentRoute();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await listSubjectAssessmentRoutes(
          membership.subject.id,
          membership.syllabusVersion.id,
        );
        if (cancelled) return;
        setCatalogue(next);
        const base = initialRouteDraft(next);
        const routeId = membership.assessmentRouteId ?? base.routeId;
        const persistedOptionIds = membership.optionIds ?? [];
        const optionIds = applicableOptionIds(
          next,
          routeId,
          persistedOptionIds,
        );
        setHydrationWarning(
          optionIds.length === persistedOptionIds.length
            ? null
            : "Some saved study options no longer apply to this route. Review and update your assessment choice.",
        );
        setDraft({
          ...base,
          routeId,
          optionIds,
        });
      } catch {
        if (!cancelled) setError("Could not load assessment configuration.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    membership.subject.id,
    membership.syllabusVersion.id,
    membership.assessmentRouteId,
    (membership.optionIds ?? []).join(","),
  ]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading assessment…</p>;
  }

  if (error || !catalogue || !draft) {
    return (
      <p className="text-xs text-destructive" role="alert">
        {error ?? "Assessment configuration unavailable."}
      </p>
    );
  }

  if (catalogue.selectionMode === "none_available") {
    return (
      <p className="text-xs text-muted-foreground">
        No published assessment routes for this syllabus yet. Your subject stays
        usable; choose a route here once routes are published.
      </p>
    );
  }

  const needsRemediation = membership.assessmentRouteId == null;
  const validation = routeDraftValidationError(catalogue, draft);
  const selectedRoute = catalogue.routes.find((r) => r.id === draft.routeId);

  return (
    <div className="mt-3 space-y-3 rounded-lg border bg-background/60 p-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assessment
        </p>
        <p className="text-sm">
          Syllabus: {membership.syllabusVersion.label}
          {membership.intendedExamSession
            ? ` · Target ${membership.intendedExamSession.series} ${membership.intendedExamSession.year}`
            : ""}
        </p>
        {selectedRoute ? (
          <p className="text-sm text-muted-foreground">
            {selectedRoute.displayLabel}
            {selectedRoute.qualificationTarget === "as_level"
              ? " · AS Level"
              : selectedRoute.qualificationTarget === "a_level"
                ? " · A Level"
                : ""}
          </p>
        ) : needsRemediation ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Choose how you are taking this subject to unlock route-aware tools.
          </p>
        ) : null}
      </div>

      {catalogue.selectionMode === "explicit" || needsRemediation ? (
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={`How are you taking ${membership.subject.name}?`}
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
                  "rounded-md border px-3 py-2 text-left text-sm",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
                onClick={() =>
                  setDraft({
                    subjectId: membership.subject.id,
                    routeId: route.id,
                    optionIds: applicableOptionIds(
                      catalogue,
                      route.id,
                      draft.optionIds,
                    ),
                  })
                }
              >
                {route.displayLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      <StudyOptionPicker
        groups={applicableOptionGroups(catalogue, draft.routeId)}
        selectedIds={draft.optionIds}
        onChange={(optionIds) => setDraft({ ...draft, optionIds })}
      />

      <Button
        type="button"
        size="sm"
        className="cursor-pointer"
        disabled={
          assign.isPending || Boolean(validation) || draft.routeId == null
        }
        onClick={() => {
          if (draft.routeId == null || validation) return;
          assign.mutate(
            {
              subjectId: membership.subject.id,
              data: {
                routeId: draft.routeId,
                optionIds: draft.optionIds,
              },
            },
            {
              onSuccess: (updated) => {
                const optionIds = applicableOptionIds(
                  catalogue,
                  updated.assessmentRouteId,
                  updated.optionIds,
                );
                setDraft({
                  subjectId: updated.subject.id,
                  routeId: updated.assessmentRouteId,
                  optionIds,
                });
                setHydrationWarning(
                  optionIds.length === updated.optionIds.length
                    ? null
                    : "Saved assessment options could not be reconciled with this route. Reload and review your choices.",
                );
                toast({ title: "Assessment updated" });
                onSaved?.();
              },
              onError: (err) => {
                toast({
                  title: "Could not update assessment",
                  description: getMutationErrorMessage(err),
                  variant: "destructive",
                });
              },
            },
          );
        }}
      >
        {needsRemediation ? "Save assessment choice" : "Update assessment"}
      </Button>
      {validation ? (
        <p className="text-xs text-destructive" role="alert">
          {validation}
        </p>
      ) : null}
      {hydrationWarning ? (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {hydrationWarning}
        </p>
      ) : null}
    </div>
  );
}
