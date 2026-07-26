import type { CSSProperties } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import type { AttentionItem, RecentPerformanceItem, Subject } from "@workspace/api-client-react";
import { gradeTone } from "@/lib/cambridge-grades";
import { predictedGradeFromSubject } from "@/lib/dashboard-gamification";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { subjectMark } from "@/lib/subject-mark";
import { cn } from "@/lib/utils";

function MasteryMeter({ value, label }: { value: number; label: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="dash-meter dash-meter-mastery"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} syllabus mastery`}
    >
      <motion.div
        className="dash-meter-fill dash-meter-fill-subject"
        initial={reduceMotion ? false : { transform: "scaleX(0)" }}
        animate={{ transform: `scaleX(${Math.max(value, 1) / 100})` }}
        transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformOrigin: "left center", width: "100%" }}
      />
    </div>
  );
}

/** Tiny momentum spark from a single change value — no invented history */
function TrendSpark({ change }: { change: number }) {
  const up = change > 0;
  const mid = 14;
  const end = up ? 4 : 22;
  return (
    <svg className="dash-mastery-spark" viewBox="0 0 48 24" aria-hidden>
      <path
        d={`M2 18 L16 ${mid} L32 ${up ? 10 : 16} L46 ${end}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SubjectMasteryGridProps = {
  subjects: Subject[];
  attention: AttentionItem[];
  recentPerformance?: RecentPerformanceItem[];
};

export function SubjectMasteryGrid({
  subjects,
  attention,
  recentPerformance = [],
}: SubjectMasteryGridProps) {
  if (subjects.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject, index) => {
        const attentionItem = attention.find((a) => a.subjectId === subject.id);
        const performance = recentPerformance.find((p) => p.subjectId === subject.id);
        const grade = predictedGradeFromSubject(
          subject.syllabusProgress,
          subject.recentPaperScore,
        );
        const tone = gradeTone(grade);
        const weakLabel =
          attentionItem?.reason?.split(/\s*[—–-]\s*/)[0]?.trim() ??
          (subject.syllabusProgress < 50
            ? "Core syllabus units"
            : subject.topicsInProgress > 0
              ? "In-progress topics"
              : "Maintain momentum");
        const accent = resolveSubjectAccent({
          code: subject.code,
          name: subject.name,
          color: subject.color,
        });
        const Mark = subjectMark(subject.name);
        const change = performance?.change ?? attentionItem?.recentScoreTrend ?? null;
        const momentum =
          change === null
            ? "Steady"
            : change > 0
              ? "Rising"
              : change < 0
                ? "Needs care"
                : "Steady";

        return (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, transform: "translateY(8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{
              delay: Math.min(index * 0.04, 0.16),
              duration: 0.28,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <Link
              href={`/subjects/${subject.id}`}
              className={cn(
                "dash-mastery-card group",
                attentionItem && "dash-mastery-card-attention",
              )}
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
                <div className="shrink-0 text-right">
                  <span
                    className={cn("dash-grade-badge tabular", `dash-grade-${tone}`)}
                    title="Estimated from syllabus coverage and recent papers"
                  >
                    {grade}
                  </span>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Predicted
                  </p>
                </div>
              </div>

              <div className="dash-mastery-progress">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <span className="card-label">Mastery</span>
                  <span className="dash-mastery-pct tabular">{subject.syllabusProgress}%</span>
                </div>
                <MasteryMeter value={subject.syllabusProgress} label={subject.name} />
              </div>

              <div className="dash-mastery-stats">
                <div>
                  <p className="card-label">Topics</p>
                  <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
                    {subject.topicsCompleted}
                    <span className="font-medium text-muted-foreground">
                      /{subject.topicsTotal}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="card-label">Latest paper</p>
                  <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
                    {subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="card-label">Momentum</p>
                  <p
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 text-[0.8125rem] font-bold leading-none",
                      change !== null && change > 0 && "text-emerald-600 dark:text-emerald-400",
                      change !== null && change < 0 && "text-destructive",
                    )}
                  >
                    {change !== null && change !== 0 ? (
                      <>
                        {change > 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
                        )}
                        {Math.abs(change)}%
                      </>
                    ) : (
                      momentum
                    )}
                    {change !== null && change !== 0 && (
                      <TrendSpark change={change} />
                    )}
                  </p>
                </div>
              </div>

              <div className="dash-mastery-focus">
                <div className="min-w-0 flex-1">
                  <p className="card-label">Weak topics</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.01em]">
                    {weakLabel}
                  </p>
                </div>
                <span className="dash-mastery-go" aria-hidden>
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
