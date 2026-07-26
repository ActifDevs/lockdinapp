import { useCallback, useState } from "react";

const PREFS_KEY = "scholr_notification_prefs";

export type NotificationPrefs = {
  morningSummary: boolean;
  deadlineReminders: boolean;
  examAlerts: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  morningSummary: true,
  deadlineReminders: true,
  examAlerts: false,
};

function readPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: NotificationPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => readPrefs());

  const updatePref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      writePrefs(next);
      return next;
    });
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }, []);

  return { prefs, updatePref, requestBrowserPermission };
}
