import type {
  DashboardSummary,
  ProgressOverview,
  RecentPerformanceItem,
  Task,
} from "@workspace/api-client-react";
import { percentageToGrade } from "./cambridge-grades";

const LONGEST_STREAK_KEY = "scholr_longest_streak";

const SCHOLAR_TITLES = [
  "Novice",
  "Apprentice",
  "Scholar",
  "Strategist",
  "Specialist",
  "Expert",
  "Master",
  "Fellow",
  "Laureate",
];

export type Achievement = {
  id: string;
  icon: "trophy" | "flame" | "book" | "target" | "star";
  title: string;
  description: string;
  unlocked: boolean;
};

export function syncLongestStreak(current: number): number {
  try {
    const stored = Number(localStorage.getItem(LONGEST_STREAK_KEY) ?? 0);
    const next = Math.max(stored, current);
    localStorage.setItem(LONGEST_STREAK_KEY, String(next));
    return next;
  } catch {
    return current;
  }
}

export function readLongestStreak(): number {
  try {
    return Number(localStorage.getItem(LONGEST_STREAK_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function computeTotalXp(
  summary: DashboardSummary,
  progress?: ProgressOverview | null,
): number {
  const syllabusAvg =
    summary.subjectProgressSummary.length > 0
      ? summary.subjectProgressSummary.reduce((s, x) => s + x.syllabusProgress, 0) /
        summary.subjectProgressSummary.length
      : 0;

  return (
    summary.studyStreakDays * 35 +
    summary.todayTasksCompleted * 80 +
    (progress?.totalTasksCompleted ?? 0) * 12 +
    (progress?.totalPapersLogged ?? 0) * 45 +
    Math.round(syllabusAvg * 4)
  );
}

export function computeLevel(totalXp: number) {
  const level = Math.min(Math.floor(totalXp / 450) + 1, 9);
  const xpInLevel = totalXp % 450;
  return {
    level,
    title: SCHOLAR_TITLES[level - 1] ?? "Scholar",
    xpInLevel,
    xpToNext: 450 - xpInLevel,
    progressPct: Math.round((xpInLevel / 450) * 100),
  };
}

export function computeMissionXp(tasks: Task[]): number {
  const incomplete = tasks.filter((t) => !t.completed);
  const minutes = incomplete.reduce((s, t) => s + (t.estimatedMinutes ?? 45), 0);
  return incomplete.length * 75 + Math.round(minutes * 1.5);
}

export function computeTodayXpEarned(completed: number, total: number): number {
  const base = completed * 75;
  const bonus = total > 0 && completed === total ? 200 : 0;
  return base + bonus;
}

export function pickMissionFocus(tasks: Task[], attentionReason?: string | null): string {
  const next = tasks.find((t) => !t.completed);
  if (next?.topicTitle) return next.topicTitle;
  if (next?.title) return next.title;
  if (attentionReason) return attentionReason.split(".")[0] ?? attentionReason;
  if (tasks.length === 0) return "Set today's revision targets";
  return "Complete your remaining mission tasks";
}

export function motivationalLine(
  streak: number,
  daysToExam: number | null,
  todayPct: number,
): string {
  if (todayPct === 100) return "Mission complete. You're building exam-day confidence.";
  if (streak >= 14) return "Elite consistency — top grades are built exactly like this.";
  if (daysToExam !== null && daysToExam <= 14) return "Final stretch mode. Every session counts now.";
  if (daysToExam !== null && daysToExam <= 45) return "Exam season is approaching — stay sharp and structured.";
  if (streak >= 7) return "Strong rhythm this week. Keep the momentum rolling.";
  return "Small focused sessions compound into A-grade performance.";
}

export function buildAchievements(
  summary: DashboardSummary,
  progress?: ProgressOverview | null,
  recentPerformance: RecentPerformanceItem[] = [],
): Achievement[] {
  const hasA = recentPerformance.some((p) => p.latestPercentage >= 80);
  const avgSyllabus =
    summary.subjectProgressSummary.length > 0
      ? summary.subjectProgressSummary.reduce((s, x) => s + x.syllabusProgress, 0) /
        summary.subjectProgressSummary.length
      : 0;

  return [
    {
      id: "first-a",
      icon: "trophy",
      title: "First A Grade",
      description: "Score 80%+ on a past paper",
      unlocked: hasA,
    },
    {
      id: "streak-30",
      icon: "flame",
      title: "30 Day Streak",
      description: "Revise 30 days in a row",
      unlocked: summary.studyStreakDays >= 30,
    },
    {
      id: "streak-7",
      icon: "flame",
      title: "Week Warrior",
      description: "7-day study streak",
      unlocked: summary.studyStreakDays >= 7,
    },
    {
      id: "syllabus-50",
      icon: "book",
      title: "Halfway There",
      description: "50% syllabus across subjects",
      unlocked: avgSyllabus >= 50,
    },
    {
      id: "papers-5",
      icon: "target",
      title: "Paper Hunter",
      description: "Log 5 past papers",
      unlocked: (progress?.totalPapersLogged ?? 0) >= 5,
    },
    {
      id: "daily-clear",
      icon: "star",
      title: "Daily Champion",
      description: "Clear all tasks today",
      unlocked:
        summary.todayTasksTotal > 0 &&
        summary.todayTasksCompleted === summary.todayTasksTotal,
    },
  ];
}

const UNLOCKED_KEY = "scholr_unlocked_achievements";
const SEEDED_KEY = "scholr_achievements_seeded";

function readSeenUnlocks(): Set<string> {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenUnlocks(ids: Set<string>) {
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...ids]));
}

/**
 * Returns achievements unlocked since the last visit.
 * First run seeds current unlocks silently (no toast spam for existing progress).
 */
export function consumeNewAchievements(achievements: Achievement[]): Achievement[] {
  const seen = readSeenUnlocks();
  const unlocked = achievements.filter((a) => a.unlocked);

  if (localStorage.getItem(SEEDED_KEY) !== "true") {
    for (const a of unlocked) seen.add(a.id);
    writeSeenUnlocks(seen);
    localStorage.setItem(SEEDED_KEY, "true");
    return [];
  }

  const newlyUnlocked = unlocked.filter((a) => !seen.has(a.id));
  if (newlyUnlocked.length === 0) return [];

  for (const a of newlyUnlocked) seen.add(a.id);
  writeSeenUnlocks(seen);
  return newlyUnlocked;
}

export function predictedGradeFromSubject(
  syllabusProgress: number,
  recentScore: number | null | undefined,
): string {
  const score = recentScore ?? syllabusProgress;
  return percentageToGrade(score);
}
