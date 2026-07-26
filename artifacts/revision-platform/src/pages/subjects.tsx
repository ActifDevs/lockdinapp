import type { CSSProperties } from "react";
import { useListSubjects, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { Link } from "wouter";
import { ChevronRight, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { subjectMark } from "@/lib/subject-mark";
import { cn } from "@/lib/utils";

export default function Subjects() {
  const { data: subjects, isLoading } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() },
  });
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return <SubjectsSkeleton />;
  }

  return (
    <div className="app-page">
      <PageHeader
        title="My subjects"
        subtitle="Cambridge readiness across every syllabus you track."
        action={
          <Button asChild>
            <Link href="/settings?tab=subjects">Add subject</Link>
          </Button>
        }
      />

      {!subjects || subjects.length === 0 ? (
        <div className="dash-insight-card card-tint-cream">
          <RichEmptyState
            scene="books"
            title="Ready to build your subject map?"
            description="Add the A-Level subjects you're taking so Scholr can track syllabus coverage, papers, and predicted grades."
            actionLabel="Add your subjects"
            actionHref="/settings?tab=subjects"
            variant="mint"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {subjects.map((subject, index) => {
            const accent = resolveSubjectAccent({
              code: subject.code,
              name: subject.name,
              color: subject.color,
            });
            const Mark = subjectMark(subject.name);
            return (
              <motion.div
                key={subject.id}
                initial={reduceMotion ? false : { opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{
                  delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.16),
                  duration: 0.28,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <Link
                  href={`/subjects/${subject.id}`}
                  className="dash-mastery-card group"
                  style={{ "--subject-accent": accent } as CSSProperties}
                >
                  <span className="dash-mastery-accent" aria-hidden />
                  <span className="dash-mastery-glow" aria-hidden />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="dash-mastery-mark" aria-hidden>
                          <Mark className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <p className="dash-mastery-name truncate">{subject.name}</p>
                      </div>
                      <p className="mt-1 pl-9 text-xs font-medium tracking-wide text-muted-foreground">
                        Cambridge {subject.code}
                      </p>
                    </div>
                    <span className="dash-mastery-go" aria-hidden>
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>

                  <div className="dash-mastery-progress">
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <span className="card-label">Mastery</span>
                      <span className="dash-mastery-pct tabular">{subject.syllabusProgress}%</span>
                    </div>
                    <div className="dash-meter dash-meter-mastery">
                      <div
                        className="dash-meter-fill dash-meter-fill-subject"
                        style={{
                          width: "100%",
                          transform: `scaleX(${Math.max(subject.syllabusProgress, 1) / 100})`,
                          transformOrigin: "left center",
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground tabular">
                        {subject.topicsCompleted}
                      </span>{" "}
                      of <span className="tabular">{subject.topicsTotal}</span> topics covered
                    </p>
                  </div>

                  <div className="dash-mastery-metrics">
                    <div>
                      <p className="card-label inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden strokeWidth={2} />
                        Tasks
                      </p>
                      <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
                        {subject.upcomingTasksCount}
                      </p>
                    </div>
                    <div>
                      <p className="card-label inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" aria-hidden strokeWidth={2} />
                        Latest paper
                      </p>
                      <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
                        {subject.recentPaperScore !== null
                          ? `${subject.recentPaperScore}%`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="dash-mastery-focus">
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">
                      Open subject workspace
                    </p>
                    <span
                      className={cn(
                        "dash-mastery-go",
                        "group-hover:translate-x-0.5",
                      )}
                      aria-hidden
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubjectsSkeleton() {
  return (
    <div className="app-page">
      <div className="space-y-3">
        <div className="dash-skeleton h-10 w-48 rounded-xl" />
        <div className="dash-skeleton h-5 w-96 max-w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dash-skeleton h-64 rounded-[var(--surface-radius)]" />
        ))}
      </div>
    </div>
  );
}
