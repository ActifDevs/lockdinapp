import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";

const SUBJECTS = [
  { id: 9709, name: "Mathematics", code: "9709", color: "bg-[hsl(220_15%_40%)]" },
  { id: 9702, name: "Physics", code: "9702", color: "bg-[hsl(200_18%_42%)]" },
  { id: 9701, name: "Chemistry", code: "9701", color: "bg-[hsl(175_20%_38%)]" },
  { id: 9618, name: "Computer Science", code: "9618", color: "bg-[hsl(240_8%_32%)]" },
  { id: 9700, name: "Biology", code: "9700", color: "bg-[hsl(150_18%_36%)]" },
  { id: 9708, name: "Economics", code: "9708", color: "bg-[hsl(30_22%_45%)]" },
  { id: 9609, name: "Business", code: "9609", color: "bg-[hsl(25_15%_40%)]" },
  { id: 9489, name: "History", code: "9489", color: "bg-[hsl(350_18%_42%)]" },
];

export default function Onboarding() {
  const { completeOnboarding, firstName } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [examSession, setExamSession] = useState<string | null>(null);

  const toggleSubject = (id: number) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  const greetingName = firstName || "there";

  return (
    <div className="grain flex min-h-[100dvh] flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="relative z-10 mb-8 w-full max-w-2xl text-center">
        <span className="font-serif text-3xl font-bold tracking-tight">Scholr</span>
      </div>

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-md">
        <div className="h-1.5 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
              <h1 className="text-balance font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome to Scholr, {greetingName}.
              </h1>
              <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
                A short setup so your workspace matches your subjects and exam timing.
              </p>
              <div className="pt-4">
                <Button size="lg" className="h-12 px-8 text-base active:scale-[0.98]" onClick={handleNext}>
                  Continue
                  <ChevronRight className="ml-2 h-5 w-5" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-8 duration-500">
              <div>
                <h2 className="mb-2 font-serif text-3xl font-bold tracking-tight">
                  Which subjects are you taking?
                </h2>
                <p className="text-muted-foreground">Select all that apply. You can change this later.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUBJECTS.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => toggleSubject(subject.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border-2 p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2.5 w-2.5 rounded-sm", subject.color)} />
                        <div>
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code}</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4" aria-hidden />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between border-t pt-6">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button size="lg" onClick={handleNext} disabled={selectedSubjects.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-8 duration-500">
              <div>
                <h2 className="mb-2 font-serif text-3xl font-bold tracking-tight">Study details</h2>
                <p className="text-muted-foreground">Optional — helps pace your plan.</p>
              </div>

              <div className="mx-auto max-w-md space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Current level</p>
                  <div className="grid grid-cols-2 gap-3">
                    {["AS Level (Year 12)", "A2 Level (Year 13)"].map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-14 justify-start px-4 font-normal",
                          level === option && "border-primary bg-primary/5 ring-1 ring-primary",
                        )}
                        onClick={() => setLevel(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Main exam session</p>
                  <div className="grid grid-cols-2 gap-3">
                    {["May/June 2026", "Oct/Nov 2026", "May/June 2027", "Other"].map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-14 justify-start px-4 font-normal",
                          examSession === option && "border-primary bg-primary/5 ring-1 ring-primary",
                        )}
                        onClick={() => setExamSession(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-t pt-8">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button size="lg" onClick={handleNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-8 text-center duration-500">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="h-8 w-8" aria-hidden />
              </div>

              <h2 className="font-serif text-3xl font-bold tracking-tight">You’re set up</h2>
              <p className="mx-auto max-w-md text-pretty text-muted-foreground">
                {selectedSubjects.length} subject
                {selectedSubjects.length === 1 ? "" : "s"} on your dashboard. Add tasks and past papers when you’re ready.
              </p>

              <div className="flex flex-wrap justify-center gap-2 py-2">
                {selectedSubjects.map((id) => {
                  const subject = SUBJECTS.find((s) => s.id === id);
                  return subject ? (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-md bg-secondary px-3 py-1 text-sm font-medium"
                    >
                      {subject.name}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="pt-4">
                <Button
                  size="lg"
                  className="h-12 w-full px-10 text-base sm:w-auto active:scale-[0.98]"
                  onClick={completeOnboarding}
                >
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
