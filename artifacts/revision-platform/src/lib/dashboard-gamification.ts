import type {
  DashboardSummary,
  ProgressOverview,
  RecentPerformanceItem,
  Task,
} from "@workspace/api-client-react";
import { percentageToGrade } from "./cambridge-grades";
import { userScopedStorageKey } from "./user-scoped-storage";

const LONGEST_STREAK_KEY = "lockdin_longest_streak";

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

export function syncLongestStreak(userId: string, current: number): number {
  const storageKey = userScopedStorageKey(LONGEST_STREAK_KEY, userId);
  try {
    const stored = Number(localStorage.getItem(storageKey) ?? 0);
    const next = Math.max(stored, current);
    localStorage.setItem(storageKey, String(next));
    return next;
  } catch {
    return current;
  }
}

export function readLongestStreak(userId: string): number {
  try {
    return Number(
      localStorage.getItem(userScopedStorageKey(LONGEST_STREAK_KEY, userId)) ??
        0,
    );
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
      ? summary.subjectProgressSummary.reduce(
          (s, x) => s + x.syllabusProgress,
          0,
        ) / summary.subjectProgressSummary.length
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
  const minutes = incomplete.reduce(
    (s, t) => s + (t.estimatedMinutes ?? 45),
    0,
  );
  return incomplete.length * 75 + Math.round(minutes * 1.5);
}

export function computeTodayXpEarned(completed: number, total: number): number {
  const base = completed * 75;
  const bonus = total > 0 && completed === total ? 200 : 0;
  return base + bonus;
}

export function pickMissionFocus(
  tasks: Task[],
  attentionReason?: string | null,
): string {
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
  if (todayPct === 100)
    return "Mission complete. You're building exam-day confidence.";
  if (streak >= 14)
    return "Elite consistency. Top grades are built exactly like this.";
  if (daysToExam !== null && daysToExam <= 14)
    return "Final stretch. Every session counts now.";
  if (daysToExam !== null && daysToExam <= 45)
    return "Exam season is close. Stay sharp and structured.";
  if (streak >= 7) return "Strong rhythm this week. Keep the momentum.";
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
      ? summary.subjectProgressSummary.reduce(
          (s, x) => s + x.syllabusProgress,
          0,
        ) / summary.subjectProgressSummary.length
      : 0;

  return [
    {
      id: "first-a",
      icon: "trophy",
      title: "First A Grade",
      description: "Hit 80%+ on a past paper",
      unlocked: hasA,
    },
    {
      id: "streak-30",
      icon: "flame",
      title: "30 Day Streak",
      description: "Protect your streak for a full month",
      unlocked: summary.studyStreakDays >= 30,
    },
    {
      id: "streak-7",
      icon: "flame",
      title: "Streak Protected",
      description: "7 days of focused revision",
      unlocked: summary.studyStreakDays >= 7,
    },
    {
      id: "syllabus-50",
      icon: "book",
      title: "Topic Mastered",
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
      title: "Daily Goal Complete",
      description: "Clear every task on your mission",
      unlocked:
        summary.todayTasksTotal > 0 &&
        summary.todayTasksCompleted === summary.todayTasksTotal,
    },
  ];
}

const UNLOCKED_KEY = "lockdin_unlocked_achievements";
const SEEDED_KEY = "lockdin_achievements_seeded";

function readSeenUnlocks(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(
      userScopedStorageKey(UNLOCKED_KEY, userId),
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenUnlocks(userId: string, ids: Set<string>) {
  localStorage.setItem(
    userScopedStorageKey(UNLOCKED_KEY, userId),
    JSON.stringify([...ids]),
  );
}

/**
 * Returns achievements unlocked since the last visit.
 * First run seeds current unlocks silently (no toast spam for existing progress).
 */
export function consumeNewAchievements(
  userId: string,
  achievements: Achievement[],
): Achievement[] {
  const seen = readSeenUnlocks(userId);
  const unlocked = achievements.filter((a) => a.unlocked);
  const seededKey = userScopedStorageKey(SEEDED_KEY, userId);

  if (localStorage.getItem(seededKey) !== "true") {
    for (const a of unlocked) seen.add(a.id);
    writeSeenUnlocks(userId, seen);
    localStorage.setItem(seededKey, "true");
    return [];
  }

  const newlyUnlocked = unlocked.filter((a) => !seen.has(a.id));
  if (newlyUnlocked.length === 0) return [];

  for (const a of newlyUnlocked) seen.add(a.id);
  writeSeenUnlocks(userId, seen);
  return newlyUnlocked;
}

export function predictedGradeFromSubject(
  syllabusProgress: number,
  recentScore: number | null | undefined,
): string {
  const score = recentScore ?? syllabusProgress;
  return percentageToGrade(score);
}
