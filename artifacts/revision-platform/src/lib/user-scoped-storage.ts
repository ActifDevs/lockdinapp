export const LEGACY_PERSONAL_STORAGE_KEYS = [
  "lockdin_longest_streak",
  "lockdin_unlocked_achievements",
  "lockdin_achievements_seeded",
  "lockdin_morning_ping",
  "lockdin_deadline_ping",
  "lockdin_exam_ping",
  "lockdin_notification_prefs",
] as const;

export type PersonalStorageBaseKey =
  (typeof LEGACY_PERSONAL_STORAGE_KEYS)[number];

export function userScopedStorageKey(
  baseKey: PersonalStorageBaseKey,
  userId: string,
): string {
  return `${baseKey}:${userId}`;
}
