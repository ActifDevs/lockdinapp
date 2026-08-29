import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = (name: string) => readFileSync(path.join(dir, name), "utf8");

describe("Slice 5 frontend reconciliation contracts", () => {
  it("My Subjects composes caller-owned progress, tasks, attempts, and syllabus", () => {
    const text = source("subjects.tsx");
    for (const hook of [
      "useListCurrentUserSubjects",
      "useGetProgressOverview",
      "useListTasks",
      "useListPastPaperAttempts",
      "useGetSubjectSyllabus",
    ]) {
      expect(text).toContain(hook);
    }
    expect(text).toContain("completedTopics");
    expect(text).toContain("openTaskCount");
    expect(text).toContain("latestPaper");
    expect(text).not.toMatch(
      /subject\.(syllabusProgress|topicsCompleted|upcomingTasksCount|recentPaperScore)/,
    );
  });

  it("Subject Detail header uses live task and performance metrics", () => {
    const text = source("subject-detail.tsx");
    expect(text).toMatch(/\{pendingTasks\.length\}/);
    expect(text).toMatch(/performance\?\.latestScore/);
    expect(text).not.toMatch(
      /subject\.upcomingTasksCount|subject\.recentPaperScore/,
    );
  });

  it("all Study Plan task mutations invalidate task, dashboard, and progress families", () => {
    const text = source("study-plan.tsx");
    expect(text).toContain("invalidateTaskAggregates");
    expect(text.match(/invalidateTaskAggregates\(\)/g)).toHaveLength(3);
    expect(text).toContain("getListTasksQueryKey()");
    expect(text).toContain("getGetDashboardSummaryQueryKey()");
    expect(text).toContain("getGetProgressOverviewQueryKey()");
  });

  it("Settings writes membership response and invalidates dependent aggregates", () => {
    const text = source("settings.tsx");
    expect(text).toContain(
      "setQueryData(getListCurrentUserSubjectsQueryKey(), updated)",
    );
    expect(text).toContain("getGetDashboardSummaryQueryKey()");
    expect(text).toContain("getGetProgressOverviewQueryKey()");
    expect(text).toContain("getGetSubjectSyllabusQueryKey");
    expect(text).toContain("getListAssessmentComponentsQueryKey");
    expect(text).not.toContain("queryClient.clear()");
  });

  it("account switch clears pin-sensitive query cache", () => {
    const text = source("../components/auth-provider.tsx");
    expect(text).toContain("previousUserId !== nextUserId");
    expect(text).toMatch(/queryClient\.clear\(\)/);
  });
});
