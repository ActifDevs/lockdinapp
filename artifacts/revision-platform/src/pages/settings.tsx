import {
  useListSubjects,
  getListSubjectsQueryKey,
  useCreateSubject,
  useDeleteSubject,
  getGetDashboardSummaryQueryKey,
  getGetProgressOverviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Palette, BookOpen, Calendar as CalendarIcon, Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { SUBJECT_CATALOG } from "@/lib/subject-catalog";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState, type ElementType } from "react";
import { PageHeader } from "@/components/page-header";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";

function ComingSoonBadge() {
  return (
    <Badge variant="secondary" className="shrink-0 text-xs font-medium">
      Coming soon
    </Badge>
  );
}

function SettingsSectionCard({
  icon: Icon,
  title,
  description,
  tint = "cream",
  children,
  className,
}: {
  icon: ElementType;
  title: string;
  description: string;
  tint?: "cream" | "teal" | "coral" | "amber";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "dash-stat-card overflow-hidden border-0 shadow-[var(--elev-2)]",
        tint === "cream" && "card-tint-cream",
        tint === "teal" && "card-tint-teal",
        tint === "coral" && "card-tint-coral",
        tint === "amber" && "card-tint-amber",
        className,
      )}
    >
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-5">
        <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-[-0.01em]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden strokeWidth={2} />
          </span>
          {title}
        </CardTitle>
        <CardDescription className="max-w-prose">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}

function ThemeOption({
  label,
  selected,
  onSelect,
  preview,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
      )}
    >
      {preview}
      <span className="text-sm font-medium">{label}</span>
      {selected && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" aria-hidden strokeWidth={2} />}
    </button>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const { prefs, updatePref, requestBrowserPermission } = useNotificationPrefs();
  const queryClient = useQueryClient();
  const { data: subjects } = useListSubjects({ query: { queryKey: getListSubjectsQueryKey() } });
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [level, setLevel] = useState(user?.level || "");
  const [examSession, setExamSession] = useState(user?.examSession || "");
  const [saved, setSaved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const defaultTab = (() => {
    try {
      return new URLSearchParams(window.location.search).get("tab") || "account";
    } catch {
      return "account";
    }
  })();

  const invalidateSubjects = () => {
    queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProgressOverviewQueryKey() });
  };

  const createSubject = useCreateSubject({
    mutation: {
      onSuccess: (subject) => {
        invalidateSubjects();
        setAddOpen(false);
        toast({ title: `${subject.name} added`, description: "Starter syllabus topics are ready." });
      },
      onError: (err) => {
        toast({
          title: "Could not add subject",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      },
    },
  });

  const deleteSubject = useDeleteSubject({
    mutation: {
      onSuccess: () => {
        invalidateSubjects();
        toast({ title: "Subject removed" });
      },
      onError: (err) => {
        toast({
          title: "Could not remove subject",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      },
    },
  });

  const saveProfile = () => {
    updateUser({
      name: name.trim() || user?.name,
      email: email.trim(),
      level: level || null,
      examSession: examSession || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeCodes = new Set((subjects ?? []).map((s) => s.code));
  const availableToAdd = SUBJECT_CATALOG.filter((s) => !activeCodes.has(s.code));

  useEffect(() => {
    if (defaultTab === "subjects" && availableToAdd.length > 0 && (subjects?.length ?? 0) === 0) {
      setAddOpen(true);
    }
  }, [defaultTab, availableToAdd.length, subjects?.length]);

  const handlePrefToggle = async (key: keyof typeof prefs, checked: boolean) => {
    updatePref(key, checked);
    if (checked) {
      const permission = await requestBrowserPermission();
      if (permission === "granted") {
        toast({
          title: "Alerts enabled",
          description: "We'll nudge you in this browser when reminders are due.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Browser alerts blocked",
          description: "Prefs are saved. Enable notifications in your browser to get desktop nudges.",
        });
      } else {
        toast({ title: "Preference saved", description: "In-app reminders will still appear." });
      }
    }
  };

  return (
    <div className="app-page mx-auto max-w-4xl animate-in fade-in duration-300">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and workspace."
      />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="settings-tabs-list flex h-auto w-full flex-wrap justify-start gap-1 lg:w-auto tabs-scroll lg:overflow-visible">
          <TabsTrigger
            value="account"
            className="settings-tabs-trigger data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Account
          </TabsTrigger>
          <TabsTrigger
            value="subjects"
            className="settings-tabs-trigger data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Subjects
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="settings-tabs-trigger data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="settings-tabs-trigger data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6 space-y-6">
          <SettingsSectionCard
            icon={User}
            title="Profile"
            description="Update your personal information and exam session details."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Mensah"
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="AS Level (Year 12)"
                  className="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examSession">Exam session</Label>
                <Input
                  id="examSession"
                  value={examSession}
                  onChange={(e) => setExamSession(e.target.value)}
                  placeholder="May/June 2026"
                  className="max-w-md"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveProfile}>Save changes</Button>
                {saved && (
                  <span className="text-sm text-muted-foreground" role="status">
                    Saved
                  </span>
                )}
              </div>
            </div>
          </SettingsSectionCard>
        </TabsContent>

        <TabsContent value="subjects" className="mt-6 space-y-6">
          <SettingsSectionCard
            icon={BookOpen}
            title="Active subjects"
            description="Add or remove the subjects on your dashboard."
            tint="teal"
          >
              {subjects && subjects.length > 0 ? (
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  {subjects.map((subject) => {
                    const accent = resolveSubjectAccent({
                      code: subject.code,
                      name: subject.name,
                      color: subject.color,
                    });
                    return (
                    <div
                      key={subject.id}
                      className="dash-list-row !items-center rounded-xl border border-border/50 bg-muted/20 px-3 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: accent }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/subjects/${subject.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${subject.name}`}
                          disabled={deleteSubject.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${subject.name}? Tasks and papers for this subject will also be deleted.`,
                              )
                            ) {
                              deleteSubject.mutate({ subjectId: subject.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-6 text-sm text-muted-foreground">
                  No subjects yet — add your A-Levels to unlock syllabus tracking and predicted grades.
                </p>
              )}
              <Button
                onClick={() => setAddOpen(true)}
                disabled={availableToAdd.length === 0}
                className="gap-2"
              >
                <Plus className="h-4 w-4" aria-hidden strokeWidth={2} />
                Add subject
              </Button>
              {availableToAdd.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">All catalog subjects are already added.</p>
              )}
            </SettingsSectionCard>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-6">
          <SettingsSectionCard
            icon={Palette}
            title="Theme"
            description="Select your preferred visual style for the workspace."
            tint="cream"
          >
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              <ThemeOption
                label="Light"
                selected={theme === "light"}
                onSelect={() => setTheme("light")}
                preview={
                  <div className="mb-3 flex h-20 w-full flex-col gap-2 rounded-md border bg-white p-2 shadow-sm">
                    <div className="h-2 w-1/2 rounded bg-muted" />
                    <div className="h-10 w-full rounded border bg-muted/40" />
                  </div>
                }
              />
              <ThemeOption
                label="Dark"
                selected={theme === "dark"}
                onSelect={() => setTheme("dark")}
                preview={
                  <div className="mb-3 flex h-20 w-full flex-col gap-2 rounded-md border border-border bg-card p-2 shadow-sm">
                    <div className="h-2 w-1/2 rounded bg-muted" />
                    <div className="h-10 w-full rounded border border-border bg-muted/60" />
                  </div>
                }
              />
              <ThemeOption
                label="System"
                selected={theme === "system"}
                onSelect={() => setTheme("system")}
                preview={
                  <div className="mb-3 flex h-20 w-full overflow-hidden rounded-md border shadow-sm">
                    <div className="w-1/2 bg-background p-2">
                      <div className="h-2 w-3/4 rounded bg-muted" />
                    </div>
                    <div className="w-1/2 border-l border-border bg-card p-2">
                      <div className="h-2 w-3/4 rounded bg-muted" />
                    </div>
                  </div>
                }
              />
            </div>
          </SettingsSectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <SettingsSectionCard
            icon={Bell}
            title="Study reminders"
            description="Local reminders in this browser (and desktop notifications when allowed). Prefs save on this device."
            tint="coral"
          >
            <div className="dash-list-rows divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/15">
              {[
                {
                  id: "morning-summary" as const,
                  key: "morningSummary" as const,
                  label: "Morning summary",
                  description: "A morning nudge with how many tasks you have today.",
                },
                {
                  id: "deadline-reminders" as const,
                  key: "deadlineReminders" as const,
                  label: "Deadline reminders",
                  description: "Get notified when a task is due tomorrow.",
                },
                {
                  id: "exam-alerts" as const,
                  key: "examAlerts" as const,
                  label: "Exam approaching alerts",
                  description: "Reminders when an exam is within 30 days.",
                },
              ].map(({ id, key, label, description }) => (
                <div key={id} className="dash-list-row !items-center gap-4 px-4 py-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label htmlFor={id} className="text-base font-medium">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    id={id}
                    checked={prefs[key]}
                    onCheckedChange={(checked) => void handlePrefToggle(key, checked)}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Email delivery is not available yet — these alerts run while Lockdin is open in your browser.
            </p>
          </SettingsSectionCard>

          <SettingsSectionCard
            icon={CalendarIcon}
            title="Integrations"
            description="Connect Lockdin with your other tools."
            tint="cream"
          >
            <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded border bg-card shadow-sm">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"
                        fill="#4285F4"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">Google Calendar</h4>
                      <ComingSoonBadge />
                    </div>
                    <p className="text-sm text-muted-foreground">Sync your tasks and deadlines</p>
                  </div>
                </div>
                <Button variant="outline" disabled aria-disabled className="shrink-0">
                  Connect
                </Button>
              </div>
          </SettingsSectionCard>
        </TabsContent>
      </Tabs>

      <ResponsiveFormPanel
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add a subject"
        className="sm:max-w-md"
      >
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto py-2">
            {availableToAdd.map((item) => (
              <button
                key={item.code}
                type="button"
                disabled={createSubject.isPending}
                onClick={() =>
                  createSubject.mutate({
                    data: { name: item.name, code: item.code, color: item.color },
                  })
                }
                className="flex items-center justify-between rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("h-2.5 w-2.5 rounded-sm", item.swatchClass)} />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              </button>
            ))}
          </div>
      </ResponsiveFormPanel>
    </div>
  );
}
