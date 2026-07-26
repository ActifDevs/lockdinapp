import { useListSubjects, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/progress-ring";
import { RichEmptyState } from "@/components/rich-empty-state";
import { Link } from "wouter";
import { ChevronRight, Clock, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">My subjects</h1>
          <p className="page-subtitle">
            Track syllabus coverage and monitor progress across your A-Level subjects.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/settings?tab=subjects">Add subject</Link>
        </Button>
      </div>

      {!subjects || subjects.length === 0 ? (
        <Card className="card-tint-teal">
          <CardContent>
            <RichEmptyState
              scene="books"
              title="No subjects added"
              description="Add the subjects you're taking so Scholr can track syllabus coverage and past papers for each one."
              actionLabel="Add subjects"
              actionHref="/settings?tab=subjects"
              variant="mint"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {subjects.map((subject, index) => {
            const tintClass = [
              "card-tint-cream",
              "card-tint-teal",
              "card-tint-amber",
              "card-tint-coral",
              "card-tint-deep",
            ][index % 5];
            return (
            <motion.div
              key={subject.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.25 }}
            >
              <Link href={`/subjects/${subject.id}`}>
                <Card className={cn("group h-full cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md", tintClass)}>
                  <div
                    className="h-2 w-full"
                    style={{ background: `linear-gradient(90deg, ${subject.color}, ${subject.color}88)` }}
                  />
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <ProgressRing
                          value={subject.syllabusProgress}
                          label={subject.name}
                          color={subject.color}
                          size={56}
                          strokeWidth={5}
                        />
                        <div>
                          <CardTitle className="text-xl transition-colors group-hover:text-primary">
                            {subject.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{subject.code}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground tabular">{subject.topicsCompleted}</span> of{" "}
                      <span className="tabular">{subject.topicsTotal}</span> topics covered
                    </p>

                    <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                      <div>
                        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> Upcoming tasks
                        </p>
                        <p className="text-2xl font-bold tabular">{subject.upcomingTasksCount}</p>
                      </div>
                      <div>
                        <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BarChart className="h-3.5 w-3.5" strokeWidth={1.75} /> Recent score
                        </p>
                        <p className="text-2xl font-bold tabular">
                          {subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "—"}
                        </p>
                        {subject.recentPaperLabel && (
                          <p className="truncate text-xs text-muted-foreground">{subject.recentPaperLabel}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/40 bg-muted/20 px-6 py-3">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
                      Open subject workspace
                    </span>
                  </CardFooter>
                </Card>
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
    <div className="space-y-8 pb-8">
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-5 w-96 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
