import { BrandName } from "@/components/brand-name";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useListSubjects, ApiError } from "@workspace/api-client-react";
import { Check, ChevronRight, Loader2, Search } from "lucide-react";
import { IllustCalm } from "@/components/illustrations";
import { getUpcomingExamSessions, LEVEL_OPTIONS } from "@/lib/exam-sessions";
import {
  canProceedWithSubjects,
  filterSubjectsByQuery,
  mapOnboardingConflictError,
  normaliseUsernameInput,
  toggleSubjectSelection,
  validateUsername,
} from "@/lib/onboarding-logic";

export default function Onboarding() {
  const { firstName, user, completeOnboarding } = useAuth();
  const { data: subjects = [], isLoading: subjectsLoading } = useListSubjects();
  const examOptions = useMemo(() => [...getUpcomingExamSessions(), "Other"], []);

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user?.name || "");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [examSession, setExamSession] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const greetingName = firstName || "there";

  const filteredSubjects = useMemo(
    () => filterSubjectsByQuery(subjects, search),
    [subjects, search],
  );

  const selectedSubjects = subjects.filter((s) => selectedIds.includes(s.id));

  const toggleSubject = (id: number) => {
    setSelectedIds((prev) => toggleSubjectSelection(prev, id));
  };

  const goNext = () => {
    setError(null);
    if (step === 2) {
      const nameOk = fullName.trim().length >= 2 && fullName.trim().length <= 100;
      const uErr = validateUsername(username);
      setUsernameError(uErr);
      if (!nameOk) {
        setError("Enter your full name (2–100 characters).");
        return;
      }
      if (uErr) return;
    }
    if (step === 3) {
      const subjectErr = canProceedWithSubjects(selectedIds);
      if (subjectErr) {
        setError(subjectErr);
        return;
      }
    }
    if (step === 4) {
      if (!level || !examSession) {
        setError("Choose your level and exam session.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const finish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        level: level!,
        examSession: examSession!,
        subjectIds: selectedIds,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError &&
        typeof err.data === "object" &&
        err.data &&
        "error" in err.data &&
        typeof (err.data as { error: unknown }).error === "string"
          ? (err.data as { error: string }).error
          : "";
      const mapped = mapOnboardingConflictError(
        err instanceof ApiError ? err.status : 0,
        msg,
      );
      if (mapped.usernameTaken) {
        setUsernameError("That username is already taken.");
        setStep(2);
        setError(null);
      } else {
        setError("Onboarding could not be completed. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grain flex min-h-[100dvh] flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="relative z-10 mb-8 w-full max-w-2xl text-center">
        <BrandName className="text-3xl font-bold tracking-tight" />
      </div>

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-[0_20px_60px_-20px_hsl(185_100%_23%/0.18)]">
        <div className="border-b bg-muted/20 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {step} of 5
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6 text-center">
              <IllustCalm className="mx-auto w-full max-w-[14rem]" />
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome{greetingName !== "there" ? `, ${greetingName}` : ""}
              </h1>
              <p className="text-muted-foreground">
                We’ll set up your username, pick up to three subjects for your first revision
                tasks, and choose your exam session.
              </p>
              <Button className="h-11 cursor-pointer" onClick={() => setStep(2)}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Your identity</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Username is permanent after onboarding — choose carefully.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    const next = normaliseUsernameInput(e.target.value);
                    setUsername(next);
                    setUsernameError(validateUsername(next));
                  }}
                  className={cn("h-11", usernameError && "border-destructive")}
                  placeholder="e.g. aisha_chem"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-xs text-muted-foreground">
                  3–24 characters · lowercase letters, numbers, underscore
                </p>
                {usernameError && (
                  <p className="text-sm text-destructive" role="alert">
                    {usernameError}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Choose subjects</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select 1–3 subjects from the shared Cambridge catalogue. These create your first
                  revision tasks — personal subject membership comes later.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="Search by name or code"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Selected {selectedIds.length} / 3
              </p>
              {subjectsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {filteredSubjects.map((subject) => {
                    const selected = selectedIds.includes(subject.id);
                    const disabled = !selected && selectedIds.length >= 3;
                    return (
                      <li key={subject.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSubject(subject.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                            disabled && "opacity-50",
                          )}
                        >
                          <span>
                            <span className="font-medium">{subject.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {subject.code}
                            </span>
                          </span>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Study context</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us your level and target exam session.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLevel(opt)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm font-medium",
                        level === opt
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exam session</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {examOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExamSession(opt)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm font-medium",
                        examSession === opt
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Review & finish</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm your details. We’ll create your starter tasks in one step.
                </p>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b py-2">
                  <dt className="text-muted-foreground">Full name</dt>
                  <dd className="font-medium">{fullName.trim()}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b py-2">
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="font-medium">{username}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b py-2">
                  <dt className="text-muted-foreground">Subjects</dt>
                  <dd className="text-right font-medium">
                    {selectedSubjects.map((s) => s.name).join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b py-2">
                  <dt className="text-muted-foreground">Level</dt>
                  <dd className="font-medium">{level}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">Exam session</dt>
                  <dd className="font-medium">{examSession}</dd>
                </div>
              </dl>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {step > 1 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
              >
                Back
              </Button>
              {step < 5 ? (
                <Button type="button" className="cursor-pointer" onClick={goNext}>
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="cursor-pointer"
                  disabled={isSubmitting}
                  onClick={() => void finish()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finishing…
                    </>
                  ) : (
                    "Finish setup"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
