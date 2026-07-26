import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { AttentionItem, Subject } from "@workspace/api-client-react";
import { gradeTone } from "@/lib/cambridge-grades";
import { predictedGradeFromSubject } from "@/lib/dashboard-gamification";
import { cn } from "@/lib/utils";

function SegmentBar({ value, color }: { value: number; color: string }) {
  const filled = Math.round(value / 10);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${value}% syllabus mastery`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="dash-segment"
          initial={reduceMotion ? false : { scaleY: 0.4, opacity: 0.4 }}
          animate={{
            scaleY: 1,
            opacity: i < filled ? 1 : 0.2,
          }}
          transition={{ delay: reduceMotion ? 0 : i * 0.03, duration: 0.25 }}
          style={{ backgroundColor: i < filled ? color : undefined }}
        />
      ))}
      <span className="ml-2 text-sm font-bold tabular text-foreground">{value}%</span>
    </div>
  );
}

type SubjectMasteryGridProps = {
  subjects: Subject[];
  attention: AttentionItem[];
};

export function SubjectMasteryGrid({ subjects, attention }: SubjectMasteryGridProps) {
  if (subjects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Subject mastery</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Syllabus coverage and estimated grades from your logged papers
          </p>
        </div>
        <Link href="/subjects" className="text-sm font-semibold text-primary hover:underline">
          All subjects
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject, index) => {
          const attentionItem = attention.find((a) => a.subjectId === subject.id);
          const grade = predictedGradeFromSubject(
            subject.syllabusProgress,
            subject.recentPaperScore,
          );
          const tone = gradeTone(grade);
          const weakLabel =
            attentionItem?.reason?.split("—")[0]?.trim() ??
            (subject.syllabusProgress < 50
              ? "Core syllabus units"
              : subject.topicsInProgress > 0
                ? "In-progress topics"
                : "Maintain momentum");

          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
            >
              <Link href={`/subjects/${subject.id}`} className="dash-mastery-card group block">
                <div
                  className="dash-mastery-accent"
                  style={{ backgroundColor: subject.color }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold tracking-tight">{subject.name}</p>
                    <p className="text-xs font-medium text-muted-foreground">{subject.code}</p>
                  </div>
                  <span className={cn("dash-grade-badge tabular", `dash-grade-${tone}`)} title="Estimated from syllabus and recent papers">
                    {grade}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">Syllabus mastery</p>
                  <SegmentBar value={subject.syllabusProgress} color={subject.color} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="dash-mastery-stat">
                    <p className="text-[10px] font-medium text-muted-foreground">Est. grade</p>
                    <p className="mt-0.5 font-extrabold tabular">{grade}</p>
                  </div>
                  <div className="dash-mastery-stat">
                    <p className="text-[10px] font-medium text-muted-foreground">Latest paper</p>
                    <p className="mt-0.5 font-extrabold tabular">
                      {subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-medium text-muted-foreground">Next focus</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-medium">{weakLabel}</p>
                </div>

                <p className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  Open subject <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
