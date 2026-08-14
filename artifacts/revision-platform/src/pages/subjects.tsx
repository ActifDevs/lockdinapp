import type { CSSProperties } from "react";
import {
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  useGetProgressOverview,
  getGetProgressOverviewQueryKey,
  useListTasks,
  getListTasksQueryKey,
  useListPastPaperAttempts,
  getListPastPaperAttemptsQueryKey,
  useGetSubjectSyllabus,
  getGetSubjectSyllabusQueryKey,
  type PastPaperAttempt,
  type SubjectReference,
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
import { getQueryErrorMessage } from "@/lib/query-error-message";

function SubjectCard({
  subject,
  index,
  syllabusProgress,
  openTaskCount,
  latestPaper,
}: {
  subject: SubjectReference;
  index: number;
  syllabusProgress: number;
  openTaskCount: number;
  latestPaper: PastPaperAttempt | null;
}) {
  const entrance = useEntrance(index);
  const {
    data: syllabus,
    isLoading: isSyllabusLoading,
    isError: isSyllabusError,
    refetch: refetchSyllabus,
  } = useGetSubjectSyllabus(subject.id, {
    query: { queryKey: getGetSubjectSyllabusQueryKey(subject.id) },
  });
  const topics = syllabus?.flatMap((unit) => unit.topics) ?? [];
  const completedTopics = topics.filter(
    (topic) => topic.status === "completed",
  ).length;
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
            <span className="card-label">Syllabus progress</span>
            <span className="dash-mastery-pct tabular">
              {syllabusProgress}%
            </span>
          </div>
          <div className="dash-meter dash-meter-mastery">
            <div
              className="dash-meter-fill dash-meter-fill-subject"
              style={{
                width: "100%",
                transform: `scaleX(${Math.max(syllabusProgress, 1) / 100})`,
                transformOrigin: "left center",
              }}
            />
          </div>
          {isSyllabusLoading ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Loading topic progress…
            </p>
          ) : isSyllabusError ? (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-destructive underline-offset-4 hover:underline"
              onClick={(event) => {
                event.preventDefault();
                void refetchSyllabus();
              }}
            >
              Retry topic progress
            </button>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular">
                {completedTopics}
              </span>{" "}
              of <span className="tabular">{topics.length}</span> topics
              completed
            </p>
          )}
        </div>

        <div className="dash-mastery-metrics">
          <div>
            <p className="card-label inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden strokeWidth={2} />
              Tasks
            </p>
            <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
              {openTaskCount}
            </p>
          </div>
          <div>
            <p className="card-label inline-flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden strokeWidth={2} />
              Latest paper
            </p>
            <p className="mt-1.5 text-[0.9375rem] font-bold tabular leading-none">
              {latestPaper
                ? `${Math.round(latestPaper.percentage * 10) / 10}%`
                : "—"}
            </p>
          </div>
        </div>

        <div className="dash-mastery-focus">
          <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">
            Open subject workspace
          </p>
          <span
            className={cn("dash-mastery-go", "group-hover:translate-x-0.5")}
            aria-hidden
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Subjects() {
  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
    error: membershipError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
    error: progressQueryError,
    refetch: refetchProgress,
  } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() },
  });
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksQueryError,
    refetch: refetchTasks,
  } = useListTasks(
    { filter: "upcoming" },
    { query: { queryKey: getListTasksQueryKey({ filter: "upcoming" }) } },
  );
  const {
    data: attempts,
    isLoading: attemptsLoading,
    isError: attemptsError,
    error: attemptsQueryError,
    refetch: refetchAttempts,
  } = useListPastPaperAttempts(
    {},
    { query: { queryKey: getListPastPaperAttemptsQueryKey() } },
  );
  const subjects = memberships?.map((membership) => membership.subject);

  if (
    membershipsLoading ||
    progressLoading ||
    tasksLoading ||
    attemptsLoading
  ) {
    return <SubjectsSkeleton />;
  }

  const hasError =
    membershipsError || progressError || tasksError || attemptsError;
  const queryError =
    membershipError ??
    progressQueryError ??
    tasksQueryError ??
    attemptsQueryError;

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

      {hasError ? (
        <div className="dash-insight-card card-tint-cream" role="alert">
          <p className="font-semibold">We couldn't load your subjects.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getQueryErrorMessage(queryError)}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              void refetchMemberships();
              void refetchProgress();
              void refetchTasks();
              void refetchAttempts();
            }}
          >
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
          {subjects.map((subject, index) => {
            const subjectProgress = progress?.syllabusCompletion.find(
              (item) => item.subjectId === subject.id,
            );
            const openTaskCount =
              tasks?.filter(
                (task) => task.subjectId === subject.id && !task.completed,
              ).length ?? 0;
            const latestPaper =
              attempts?.find((attempt) => attempt.subjectId === subject.id) ??
              null;
            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                index={index}
                syllabusProgress={subjectProgress?.syllabusProgress ?? 0}
                openTaskCount={openTaskCount}
                latestPaper={latestPaper}
              />
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
          <div
            key={i}
            className="dash-skeleton h-64 rounded-[var(--surface-radius)]"
          />
        ))}
      </div>
    </div>
  );
}
