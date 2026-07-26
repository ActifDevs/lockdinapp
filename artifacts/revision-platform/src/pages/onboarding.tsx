import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { createSubject, createTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { IllustCalm } from "@/components/illustrations";

export default function Onboarding() {
  const { completeOnboarding, firstName } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [examSession, setExamSession] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSubject = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  const greetingName = firstName || "there";

  const finishSetup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0]!;
      const createdSubjects = [];

      for (const code of selectedCodes) {
        const catalog = SUBJECT_CATALOG.find((s) => s.code === code);
        if (!catalog) continue;
        const subject = await createSubject({
          name: catalog.name,
          code: catalog.code,
          color: catalog.color,
        });
        createdSubjects.push(subject);
      }

      // First win: one due-today task per subject (cap at 3 so Day 1 stays finishable)
      for (const subject of createdSubjects.slice(0, 3)) {
        await createTask({
          title: `Review ${subject.name} syllabus overview`,
          subjectId: subject.id,
          priority: "medium",
          deadline: today,
          estimatedMinutes: 30,
        });
      }

      await queryClient.invalidateQueries();
      completeOnboarding({
        level,
        examSession,
        subjectCodes: selectedCodes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not finish setup.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grain flex min-h-[100dvh] flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="relative z-10 mb-8 w-full max-w-2xl text-center">
        <span className="text-3xl font-bold tracking-tight">Scholr</span>
      </div>

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-[0_20px_60px_-20px_hsl(185_100%_23%/0.18)]">
        <div className="h-1.5 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
              <IllustCalm className="mb-2 max-w-[12rem]" />
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
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
                <h2 className="mb-2 text-3xl font-bold tracking-tight">
                  Which subjects are you taking?
                </h2>
                <p className="text-muted-foreground">Select all that apply. You can change this later.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUBJECT_CATALOG.map((subject) => {
                  const isSelected = selectedCodes.includes(subject.code);
                  return (
                    <button
                      key={subject.code}
                      type="button"
                      onClick={() => toggleSubject(subject.code)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2.5 w-2.5 rounded-sm", subject.swatchClass)} />
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
                <Button size="lg" onClick={handleNext} disabled={selectedCodes.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 space-y-8 duration-500">
              <div>
                <h2 className="mb-2 text-3xl font-bold tracking-tight">Study details</h2>
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

              <h2 className="text-3xl font-bold tracking-tight">You're set up</h2>
              <p className="mx-auto max-w-md text-pretty text-muted-foreground">
                We’ll add {selectedCodes.length} subject
                {selectedCodes.length === 1 ? "" : "s"} and seed today’s first revision tasks so you
                can start immediately.
              </p>

              <div className="flex flex-wrap justify-center gap-2 py-2">
                {selectedCodes.map((code) => {
                  const subject = SUBJECT_CATALOG.find((s) => s.code === code);
                  return subject ? (
                    <span
                      key={code}
                      className="inline-flex items-center rounded-md bg-secondary px-3 py-1 text-sm font-medium"
                    >
                      {subject.name}
                    </span>
                  ) : null;
                })}
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="pt-4">
                <Button
                  size="lg"
                  className="h-12 w-full px-10 text-base sm:w-auto active:scale-[0.98]"
                  onClick={finishSetup}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Setting up…
                    </>
                  ) : (
                    "Go to dashboard"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
