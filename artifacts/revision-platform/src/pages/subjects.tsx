import type { CSSProperties } from "react";
import {
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  type Subject,
} from "@workspace/api-client-react";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { Link } from "wouter";
import { ChevronRight, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEntrance } from "@/hooks/use-entrance";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { subjectMark } from "@/lib/subject-mark";
import { cn } from "@/lib/utils";

function SubjectCard({ subject, index }: { subject: Subject; index: number }) {
  const entrance = useEntrance(index);
  const accent = resolveSubjectAccent({
    code: subject.code,
    name: subject.name,
    color: subject.color,
  });
  const Mark = subjectMark(subject.name);

  return (
    <motion.div
      initial={entrance.initial}
      animate={entrance.animate}
      transition={entrance.transition}
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
              {subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "—"}
            </p>
          </div>
        </div>

        <div className="dash-mastery-focus">
          <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">
            Open subject workspace
          </p>
          <span className={cn("dash-mastery-go", "group-hover:translate-x-0.5")} aria-hidden>
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Subjects() {
  const { data: memberships, isLoading, isError, refetch } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const subjects = memberships?.map((membership) => membership.subject);

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

      {isError ? (
        <div className="dash-insight-card card-tint-cream" role="alert">
          <p className="font-semibold">We couldn't load your subjects.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection and try again. Your saved selection has not changed.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !subjects || subjects.length === 0 ? (
        <div className="dash-insight-card card-tint-cream">
          <RichEmptyState
            scene="books"
            title="Ready to build your subject map?"
            description="Add the A-Level subjects you're taking so Lockdin can track syllabus coverage, papers, and predicted grades."
            actionLabel="Add your subjects"
            actionHref="/settings?tab=subjects"
            variant="mint"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {subjects.map((subject, index) => (
            <SubjectCard key={subject.id} subject={subject} index={index} />
          ))}
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
