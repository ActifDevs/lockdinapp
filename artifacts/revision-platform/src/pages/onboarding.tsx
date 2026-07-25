import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Check, BookOpen, GraduationCap, Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { id: 9709, name: "Mathematics", code: "9709", color: "bg-blue-500" },
  { id: 9702, name: "Physics", code: "9702", color: "bg-purple-500" },
  { id: 9701, name: "Chemistry", code: "9701", color: "bg-teal-500" },
  { id: 9618, name: "Computer Science", code: "9618", color: "bg-slate-700" },
  { id: 9700, name: "Biology", code: "9700", color: "bg-green-600" },
  { id: 9708, name: "Economics", code: "9708", color: "bg-amber-600" },
  { id: 9609, name: "Business", code: "9609", color: "bg-indigo-600" },
  { id: 9489, name: "History", code: "9489", color: "bg-rose-700" },
];

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  
  const toggleSubject = (id: number) => {
    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl mb-8 flex justify-center">
        <span className="font-serif text-3xl font-bold tracking-tight">Scholr</span>
      </div>

      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-xl overflow-hidden border">
        {/* Progress bar */}
        <div className="h-2 bg-secondary w-full">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 text-center">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-serif text-4xl font-bold">Welcome to Scholr, Alex.</h1>
              <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                Let's set up your workspace so you can start revising efficiently.
              </p>
              <div className="pt-8">
                <Button size="lg" className="px-8 h-14 text-lg w-full sm:w-auto" onClick={handleNext}>
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl font-bold mb-3">Which subjects are you taking?</h2>
                <p className="text-muted-foreground">Select all that apply. You can change this later.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUBJECTS.map(subject => {
                  const isSelected = selectedSubjects.includes(subject.id);
                  return (
                    <Card 
                      key={subject.id}
                      className={cn(
                        "cursor-pointer transition-all border-2 hover:border-primary/50",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", subject.color)} />
                          <div>
                            <p className="font-medium">{subject.name}</p>
                            <p className="text-xs text-muted-foreground">{subject.code}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button variant="ghost" onClick={handleBack}>Back</Button>
                <Button size="lg" onClick={handleNext} disabled={selectedSubjects.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl font-bold mb-3">Study details</h2>
                <p className="text-muted-foreground">Help us tailor your dashboard (Optional).</p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div className="space-y-3">
                  <label className="text-sm font-medium">What level are you currently studying?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">AS Level (Year 12)</Button>
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">A2 Level (Year 13)</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">When are your main exams?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">May/June 2024</Button>
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">Oct/Nov 2024</Button>
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">May/June 2025</Button>
                    <Button variant="outline" className="h-14 justify-start px-4 font-normal active-elevate focus:border-primary focus:ring-1 focus:ring-primary">Other</Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-8 border-t">
                <Button variant="ghost" onClick={handleBack}>Back</Button>
                <Button size="lg" onClick={handleNext}>
                  Skip & Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-600 dark:text-green-500" />
              </div>
              
              <h2 className="font-serif text-3xl font-bold mb-3">You're all set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We've added {selectedSubjects.length} subjects to your dashboard. You can start planning tasks and logging past papers right away.
              </p>

              <div className="flex flex-wrap justify-center gap-2 py-6">
                {selectedSubjects.map(id => {
                  const subject = SUBJECTS.find(s => s.id === id);
                  return subject ? (
                    <span key={id} className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                      {subject.name}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="pt-6">
                <Button size="lg" className="w-full sm:w-auto px-10 h-14 text-lg" onClick={completeOnboarding}>
                  Go to Dashboard
                  <BookOpen className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
