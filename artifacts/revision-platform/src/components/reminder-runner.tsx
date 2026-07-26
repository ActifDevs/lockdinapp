import { useEffect, useRef } from "react";
import {
  listTasks,
  listExamDates,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { toast } from "@/hooks/use-toast";

const MORNING_KEY = "scholr_morning_ping";
const DEADLINE_KEY = "scholr_deadline_ping";
const EXAM_KEY = "scholr_exam_ping";

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

function alreadyPinged(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === todayKey();
  } catch {
    return true;
  }
}

function markPinged(storageKey: string) {
  try {
    localStorage.setItem(storageKey, todayKey());
  } catch {
    /* ignore */
  }
}

async function maybeNotify(title: string, body: string) {
  if (typeof window === "undefined") return;

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.svg" });
      return;
    } catch {
      /* fall through to toast */
    }
  }

  toast({ title, description: body });
}

/**
 * Client-side reminder loop: checks prefs on load and periodically,
 * surfaces morning / deadline / exam nudges via browser Notification or toast.
 */
export function ReminderRunner() {
  const { isAuthenticated, isOnboarded } = useAuth();
  const { prefs } = useNotificationPrefs();
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isOnboarded) return;

    let cancelled = false;

    const runChecks = async () => {
      if (cancelled) return;

      try {
        if (prefs.morningSummary && !alreadyPinged(MORNING_KEY)) {
          const hour = new Date().getHours();
          if (hour >= 6 && hour < 12) {
            const tasks = await listTasks({ filter: "today" });
            const remaining = tasks.filter((t) => !t.completed).length;
            await maybeNotify(
              "Morning revision summary",
              remaining > 0
                ? `You have ${remaining} task${remaining === 1 ? "" : "s"} due today. Open your mission to stay on streak.`
                : "No tasks due yet — add one to keep your streak alive.",
            );
            markPinged(MORNING_KEY);
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        }

        if (prefs.deadlineReminders && !alreadyPinged(DEADLINE_KEY)) {
          const tasks = await listTasks({ filter: "upcoming" });
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowKey = tomorrow.toISOString().split("T")[0];
          const dueSoon = tasks.filter((t) => !t.completed && t.deadline === tomorrowKey);
          if (dueSoon.length > 0) {
            await maybeNotify(
              "Deadline tomorrow",
              `${dueSoon.length} task${dueSoon.length === 1 ? "" : "s"} due tomorrow — plan a focused block today.`,
            );
            markPinged(DEADLINE_KEY);
          }
        }

        if (prefs.examAlerts && !alreadyPinged(EXAM_KEY)) {
          const exams = await listExamDates();
          const within30 = exams.filter((e) => {
            const days = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000);
            return days >= 0 && days <= 30;
          });
          if (within30.length > 0) {
            const nearest = within30.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            )[0]!;
            const days = Math.ceil((new Date(nearest.date).getTime() - Date.now()) / 86400000);
            await maybeNotify(
              "Exam approaching",
              `${nearest.subjectName} (${nearest.paperCode}) in ${days} day${days === 1 ? "" : "s"}.`,
            );
            markPinged(EXAM_KEY);
          }
        }
      } catch {
        /* API may be offline — skip quietly */
      }
    };

    // Run once shortly after mount, then every 15 minutes while the tab is open
    const kickoff = window.setTimeout(() => {
      if (!ranRef.current) {
        ranRef.current = true;
        void runChecks();
      }
    }, 2500);
    const interval = window.setInterval(() => void runChecks(), 15 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, isOnboarded, prefs, queryClient]);

  return null;
}
