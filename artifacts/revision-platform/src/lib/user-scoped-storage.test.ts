import { describe, expect, it } from "vitest";
import {
  LEGACY_PERSONAL_STORAGE_KEYS,
  userScopedStorageKey,
} from "./user-scoped-storage";

describe("user-scoped storage keys", () => {
  it("creates deterministic user-qualified keys", () => {
    expect(userScopedStorageKey("lockdin_longest_streak", "user-a")).toBe(
      "lockdin_longest_streak:user-a",
    );
    expect(userScopedStorageKey("lockdin_longest_streak", "user-b")).toBe(
      "lockdin_longest_streak:user-b",
    );
  });

  it("lists every ambiguous legacy personal key", () => {
    expect(LEGACY_PERSONAL_STORAGE_KEYS).toEqual([
      "lockdin_longest_streak",
      "lockdin_unlocked_achievements",
      "lockdin_achievements_seeded",
      "lockdin_morning_ping",
      "lockdin_deadline_ping",
      "lockdin_exam_ping",
    ]);
  });
});
