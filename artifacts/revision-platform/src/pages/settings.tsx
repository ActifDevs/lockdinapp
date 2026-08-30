import {
  useListSubjects,
  getListSubjectsQueryKey,
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  useReplaceCurrentUserSubjects,
  getGetDashboardSummaryQueryKey,
  getGetProgressOverviewQueryKey,
  getGetSubjectSyllabusQueryKey,
  getListAssessmentComponentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Palette,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState, type ElementType } from "react";
import { PageHeader } from "@/components/page-header";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "wouter";
import {
  LEVEL_OPTIONS,
  getUpcomingExamSessions,
  structuredSessionFromPickerLabel,
} from "@/lib/exam-sessions";
import { ReadStateNotice } from "@/components/read-state-notice";
import {
  omitDefaultQueryValue,
  resolveQueryParam,
  updateQueryParams,
} from "@/lib/navigation-query-state";
import { useIdempotentControlledNavigation } from "@/hooks/use-idempotent-controlled-navigation";

const SETTINGS_TABS = [
  "account",
  "subjects",
  "appearance",
  "notifications",
] as const;

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
      <CardHeader className="bg-muted/15 pb-5">
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
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
      )}
    >
      {preview}
      <span className="text-sm font-medium">{label}</span>
      {selected && (
        <Check
          className="absolute right-2 top-2 h-4 w-4 text-primary"
          aria-hidden
          strokeWidth={2}
        />
      )}
    </button>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { value: activeTab, needsNormalization: tabNeedsNormalization } =
    resolveQueryParam(searchParams, "tab", SETTINGS_TABS, "account");
  const shouldNavigateToTab = useIdempotentControlledNavigation(activeTab);
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const { prefs, updatePref, requestBrowserPermission } =
    useNotificationPrefs();
  const {
    data: subjects,
    isLoading: subjectsLoading,
    isError: subjectsError,
    error: subjectsLoadError,
    refetch: refetchSubjects,
  } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() },
  });
  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const [name, setName] = useState(user?.name || "");
  const [level, setLevel] = useState(user?.level || "");
  const [examSession, setExamSession] = useState(user?.examSession || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const catalogueUnavailable = subjectsError && subjects === undefined;
  const catalogueRefreshFailed = subjectsError && subjects !== undefined;
  const examOptions = [...getUpcomingExamSessions(), "Other"];

  useEffect(() => {
    if (!tabNeedsNormalization) return;
    setSearchParams((current) => updateQueryParams(current, [["tab", null]]), {
      replace: true,
    });
  }, [setSearchParams, tabNeedsNormalization]);

  const handleTabChange = (value: string) => {
    if (!SETTINGS_TABS.includes(value as (typeof SETTINGS_TABS)[number])) {
      return;
    }
    if (!shouldNavigateToTab(value as (typeof SETTINGS_TABS)[number])) return;
    setSearchParams(
      (current) =>
        updateQueryParams(current, [
          [
            "tab",
            omitDefaultQueryValue(
              value as (typeof SETTINGS_TABS)[number],
              "account",
            ),
          ],
        ]),
      { replace: false },
    );
  };

  useEffect(() => {
    setName(user?.name || "");
    setLevel(user?.level || "");
    setExamSession(user?.examSession || "");
  }, [user?.name, user?.level, user?.examSession]);

  const membershipKey =
    memberships?.map((membership) => membership.subject.id).join(",") ?? "";
  useEffect(() => {
    if (memberships) {
      setSelectedSubjectIds(
        memberships.map((membership) => membership.subject.id),
      );
    }
  }, [membershipKey, memberships]);

  const replaceSubjects = useReplaceCurrentUserSubjects();
  const toggleSelectedSubject = (subjectId: number) => {
    setSelectedSubjectIds((current) => {
      if (current.includes(subjectId))
        return current.filter((id) => id !== subjectId);
      if (current.length >= 5) {
        toast({
          title: "Five subjects selected",
          description: "Deselect one subject before choosing another.",
        });
        return current;
      }
      return [...current, subjectId];
    });
  };

  const saveSubjects = async () => {
    if (selectedSubjectIds.length < 1 || selectedSubjectIds.length > 5) return;
    const currentIds = new Set(
      (memberships ?? []).map((membership) => membership.subject.id),
    );
    const addsSubjects = selectedSubjectIds.some((id) => !currentIds.has(id));
    const intendedExamSession = structuredSessionFromPickerLabel(examSession);
    if (addsSubjects && !intendedExamSession) {
      toast({
        title: "Choose a supported exam session",
        description:
          "Adding a subject needs May/June or Oct/Nov. Other is profile-only.",
        variant: "destructive",
      });
      return;
    }
    try {
      const updated = await replaceSubjects.mutateAsync({
        data: {
          subjectIds: selectedSubjectIds,
          ...(intendedExamSession ? { intendedExamSession } : {}),
        },
      });
      queryClient.setQueryData(getListCurrentUserSubjectsQueryKey(), updated);
      const subjectIdsToRefresh = [
        ...new Set([
          ...selectedSubjectIds,
          ...updated.map((membership) => membership.subject.id),
        ]),
      ];
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetProgressOverviewQueryKey(),
        }),
        ...subjectIdsToRefresh.map((subjectId) =>
          queryClient.invalidateQueries({
            queryKey: getGetSubjectSyllabusQueryKey(subjectId),
          }),
        ),
        ...subjectIdsToRefresh.map((subjectId) =>
          queryClient.invalidateQueries({
            queryKey: getListAssessmentComponentsQueryKey(subjectId),
          }),
        ),
      ]);
      toast({
        title: "Subjects updated",
        description: `${updated.length} subject${updated.length === 1 ? "" : "s"} selected.`,
      });
    } catch {
      toast({
        title: "Could not update subjects",
        description: "Your previous selection is unchanged. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUser({
        fullName: name.trim(),
        level: level.trim() || undefined,
        examSession: examSession.trim() || undefined,
      });
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Profile updated" });
    } catch {
      toast({
        title: "Could not save profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrefToggle = async (
    key: keyof typeof prefs,
    checked: boolean,
  ) => {
    updatePref(key, checked);
    if (checked) {
      const permission = await requestBrowserPermission();
      if (permission === "granted") {
        toast({
          title: "Alerts enabled",
          description:
            "We'll nudge you in this browser when reminders are due.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Browser alerts blocked",
          description:
            "Prefs are saved. Enable notifications in your browser to get desktop nudges.",
        });
      } else {
        toast({
          title: "Preference saved",
          description: "In-app reminders will still appear.",
        });
      }
    }
  };

  return (
    <div className="app-page mx-auto max-w-4xl animate-in fade-in duration-300">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and workspace."
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
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
                  value={user?.email || ""}
                  readOnly
                  className="max-w-md bg-muted/40"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your Auth account.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={user?.username || ""}
                  readOnly
                  className="max-w-md bg-muted/40"
                />
                <p className="text-xs text-muted-foreground">
                  Username is set during onboarding.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select level</option>
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {level &&
                    !LEVEL_OPTIONS.includes(
                      level as (typeof LEVEL_OPTIONS)[number],
                    ) && <option value={level}>{level}</option>}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="examSession">Exam session</Label>
                <p className="text-xs text-muted-foreground">
                  May/June and Oct/Nov are used when adding subjects. Other updates
                  profile text only and does not create memberships.
                </p>
                <select
                  id="examSession"
                  value={examSession}
                  onChange={(e) => setExamSession(e.target.value)}
                  className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select session</option>
                  {examOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {examSession && !examOptions.includes(examSession) && (
                    <option value={examSession}>{examSession}</option>
                  )}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => void saveProfile()} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
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
            title="My subjects"
            description="Choose between 1 and 5 A-Level subjects. Your selection is saved to your account."
            tint="teal"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" role="status">
                Selected {selectedSubjectIds.length} / 5
                {selectedSubjectIds.length === 5 ? " · Maximum reached" : ""}
              </p>
              <Button
                onClick={() => void saveSubjects()}
                disabled={
                  membershipsLoading ||
                  catalogueUnavailable ||
                  subjectsLoading ||
                  replaceSubjects.isPending ||
                  selectedSubjectIds.length < 1
                }
              >
                {replaceSubjects.isPending ? "Saving…" : "Save subjects"}
              </Button>
            </div>
            {membershipsError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">
                  We couldn't load your saved subjects. Your selection has not
                  been changed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refetchMemberships()}
                >
                  Try again
                </Button>
              </div>
            ) : membershipsLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading your subjects…
              </p>
            ) : subjectsLoading && subjects === undefined ? (
              <div
                className="space-y-3"
                role="status"
                aria-label="Loading subject catalogue"
              >
                <span className="sr-only">Loading subject catalogue</span>
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="dash-skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : catalogueUnavailable ? (
              <ReadStateNotice
                title="Subject catalogue is unavailable"
                error={subjectsLoadError}
                description="Your saved subjects have not changed. Reload the catalogue before editing them."
                onRetry={() => void refetchSubjects()}
              />
            ) : subjects && subjects.length > 0 ? (
              <div className="space-y-4">
                {catalogueRefreshFailed && (
                  <ReadStateNotice
                    stale
                    compact
                    title="Subject catalogue refresh failed"
                    error={subjectsLoadError}
                    onRetry={() => void refetchSubjects()}
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {subjects.map((subject) => {
                    const selected = selectedSubjectIds.includes(subject.id);
                    const disabled =
                      !selected && selectedSubjectIds.length >= 5;
                    const accent = resolveSubjectAccent({
                      code: subject.code,
                      name: subject.name,
                      color: subject.color,
                    });
                    return (
                      <div
                        key={subject.id}
                        className={cn(
                          "dash-list-row !items-center rounded-xl border px-3 py-3",
                          selected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/50 bg-muted/20",
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() => toggleSelectedSubject(subject.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {subject.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subject.code}
                            </p>
                          </div>
                          {selected && (
                            <Check
                              className="ml-auto h-4 w-4 shrink-0 text-primary"
                              aria-hidden
                            />
                          )}
                        </button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/subjects/${subject.id}`}>View</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The subject catalogue is currently empty.
              </p>
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
                  description:
                    "A morning nudge with how many tasks you have today.",
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
                <div
                  key={id}
                  className="dash-list-row !items-center gap-4 px-4 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label htmlFor={id} className="text-base font-medium">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    id={id}
                    checked={prefs[key]}
                    onCheckedChange={(checked) =>
                      void handlePrefToggle(key, checked)
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Email delivery is not available yet — these alerts run while
              Lockdin is open in your browser.
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
                  <p className="text-sm text-muted-foreground">
                    Sync your tasks and deadlines
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                disabled
                aria-disabled
                className="shrink-0"
              >
                Connect
              </Button>
            </div>
          </SettingsSectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
