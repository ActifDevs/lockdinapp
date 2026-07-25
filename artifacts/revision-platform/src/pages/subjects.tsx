import { useListSubjects, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { ChevronRight, BookOpen, Clock, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Subjects() {
  const { data: subjects, isLoading } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() }
  });

  if (isLoading) {
    return <SubjectsSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">My Subjects</h1>
        <p className="text-muted-foreground mt-2">
          Track syllabus coverage and monitor your progress across all your A-Level subjects.
        </p>
      </div>

      {!subjects || subjects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No subjects added</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't selected any subjects yet. Go to your settings to add the subjects you are studying.
            </p>
            <Button asChild>
              <Link href="/settings">Manage Subjects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map(subject => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col hover-elevate">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-serif font-bold text-white shadow-sm" style={{ backgroundColor: subject.color }}>
                        {subject.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{subject.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{subject.code}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Syllabus Coverage</span>
                      <span className="font-medium">{subject.syllabusProgress}%</span>
                    </div>
                    <Progress 
                      value={subject.syllabusProgress} 
                      className="h-2 bg-secondary"
                      indicatorClassName="bg-current"
                      style={{ color: subject.color }}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {subject.topicsCompleted} of {subject.topicsTotal} topics
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Upcoming Tasks
                      </p>
                      <p className="text-lg font-semibold">{subject.upcomingTasksCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <BarChart className="h-3.5 w-3.5" /> Recent Score
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-semibold">
                          {subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : '-'}
                        </p>
                        {subject.recentPaperLabel && (
                          <span className="text-xs text-muted-foreground truncate">{subject.recentPaperLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectsSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-3">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-96 bg-muted rounded animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
