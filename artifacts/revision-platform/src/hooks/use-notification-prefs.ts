import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { userScopedStorageKey } from "@/lib/user-scoped-storage";

export const NOTIFICATION_PREFS_BASE_KEY = "lockdin_notification_prefs";

export type NotificationPrefs = {
  morningSummary: boolean;
  deadlineReminders: boolean;
  examAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  morningSummary: true,
  deadlineReminders: true,
  examAlerts: false,
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
    const record = parsed as Record<string, unknown>;
    return {
      morningSummary: isBoolean(record.morningSummary)
        ? record.morningSummary
        : DEFAULT_NOTIFICATION_PREFS.morningSummary,
      deadlineReminders: isBoolean(record.deadlineReminders)
        ? record.deadlineReminders
        : DEFAULT_NOTIFICATION_PREFS.deadlineReminders,
      examAlerts: isBoolean(record.examAlerts)
        ? record.examAlerts
        : DEFAULT_NOTIFICATION_PREFS.examAlerts,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

function discardLegacyGlobalPrefs(): void {
  try {
    localStorage.removeItem(NOTIFICATION_PREFS_BASE_KEY);
  } catch {
    /* ignore quota / private-mode failures */
  }
}

function readScopedPrefs(userId: string): NotificationPrefs {
  try {
    const key = userScopedStorageKey(NOTIFICATION_PREFS_BASE_KEY, userId);
    return parseNotificationPrefs(localStorage.getItem(key));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

function writeScopedPrefs(userId: string, prefs: NotificationPrefs): void {
  try {
    localStorage.setItem(
      userScopedStorageKey(NOTIFICATION_PREFS_BASE_KEY, userId),
      JSON.stringify(prefs),
    );
  } catch {
    /* ignore quota / private-mode failures */
  }
}

export function useNotificationPrefs() {
  const { user, isLoading } = useAuth();
  const userId = !isLoading && user?.id ? user.id : null;

  const [prefs, setPrefs] = useState<NotificationPrefs>(() =>
    userId ? readScopedPrefs(userId) : { ...DEFAULT_NOTIFICATION_PREFS },
  );

  useEffect(() => {
    discardLegacyGlobalPrefs();
    if (!userId) {
      setPrefs({ ...DEFAULT_NOTIFICATION_PREFS });
      return;
    }
    setPrefs(readScopedPrefs(userId));
  }, [userId]);

  const updatePref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      if (!userId) return;
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        writeScopedPrefs(userId, next);
        return next;
      });
    },
    [userId],
  );

  const requestBrowserPermission = useCallback(async (): Promise<
    NotificationPermission | "unsupported"
  > => {
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
