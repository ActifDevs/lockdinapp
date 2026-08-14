import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeNewAchievements,
  readLongestStreak,
  syncLongestStreak,
  type Achievement,
} from "./dashboard-gamification";

const unlocked: Achievement = {
  id: "first-a",
  icon: "trophy",
  title: "First A Grade",
  description: "Hit 80%+ on a past paper",
  unlocked: true,
};

beforeEach(() => localStorage.clear());

describe("user-scoped gamification persistence", () => {
  it("isolates A from B and restores A-qualified state", () => {
    expect(syncLongestStreak("user-a", 8)).toBe(8);
    expect(syncLongestStreak("user-b", 2)).toBe(2);
    expect(readLongestStreak("user-b")).toBe(2);
    expect(syncLongestStreak("user-a", 3)).toBe(8);
    expect(readLongestStreak("user-a")).toBe(8);

    expect(consumeNewAchievements("user-a", [unlocked])).toEqual([]);
    expect(consumeNewAchievements("user-b", [])).toEqual([]);
    expect(consumeNewAchievements("user-b", [unlocked])).toEqual([unlocked]);
    expect(consumeNewAchievements("user-a", [unlocked])).toEqual([]);
  });
});
