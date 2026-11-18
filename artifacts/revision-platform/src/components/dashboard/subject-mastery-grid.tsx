import type { CSSProperties } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import type {
  AttentionItem,
  RecentPerformanceItem,
  SubjectReference,
} from "@workspace/api-client-react";
import { entranceProps } from "@/hooks/use-entrance";
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
      aria-label={`${label} syllabus progress`}
    >
      <motion.div
        className="dash-meter-fill dash-meter-fill-subject"
        initial={reduceMotion ? false : { transform: "scaleX(0)" }}
        animate={{ transform: `scaleX(${Math.max(value, 1) / 100})` }}
        transition={{
          duration: reduceMotion ? 0 : 0.75,
          ease: [0.23, 1, 0.32, 1],
        }}
        style={{ transformOrigin: "left center", width: "100%" }}
      />
    </div>
  );
}

type SubjectMasteryGridProps = {
  subjects: Array<
    SubjectReference & {
      syllabusProgress: number;
      recentPaperScore: number | null;
    }
  >;
  attention: AttentionItem[];
  recentPerformance?: RecentPerformanceItem[];
};

export function SubjectMasteryGrid({
  subjects,
  attention,
}: SubjectMasteryGridProps) {
  const reduceMotion = useReducedMotion();

  if (subjects.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject, index) => {
        const attentionItem = attention.find((a) => a.subjectId === subject.id);
        const attentionReason = attentionItem?.reason?.trim() || null;
        const grade = predictedGradeFromSubject(
          subject.syllabusProgress,
          subject.recentPaperScore,
        );
        const tone = gradeTone(grade);
        const accent = resolveSubjectAccent({
          code: subject.code,
          name: subject.name,
          color: subject.color,
        });
        const Mark = subjectMark(subject.name);
        const entrance = entranceProps(reduceMotion, index);
        const paperLabel =
          subject.recentPaperScore !== null
            ? `${subject.recentPaperScore}%`
            : "—";

        return (
          <motion.div
            key={subject.id}
            className="min-w-0 h-full"
            initial={entrance.initial}
            animate={entrance.animate}
            transition={entrance.transition}
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
                    className={cn(
                      "dash-grade-badge tabular",
                      `dash-grade-${tone}`,
                    )}
                    title="Estimate from syllabus coverage and recent papers, not an official Cambridge grade"
                  >
                    {grade}
                  </span>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Est. grade
                  </p>
                </div>
              </div>

              <div className="dash-mastery-progress">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="card-label">Syllabus coverage</span>
                  <span className="dash-mastery-pct tabular">
                    {subject.syllabusProgress}%
                  </span>
                </div>
                <MasteryMeter
                  value={subject.syllabusProgress}
                  label={subject.name}
                />
              </div>

              <p className="dash-mastery-paper">
                <span className="card-label">Latest paper</span>
                <span className="dash-mastery-paper-value tabular">{paperLabel}</span>
              </p>

              {attentionReason && (
                <p className="dash-mastery-attention line-clamp-2">{attentionReason}</p>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
