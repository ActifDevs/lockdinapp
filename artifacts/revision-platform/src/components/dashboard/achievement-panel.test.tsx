import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Achievement } from "@/lib/dashboard-gamification";
import {
  AchievementPanel,
  pickNextAchievement,
} from "./achievement-panel";

afterEach(() => {
  cleanup();
});

function item(
  id: Achievement["id"],
  title: string,
  unlocked: boolean,
  icon: Achievement["icon"] = "star",
): Achievement {
  return {
    id,
    icon,
    title,
    description: `${title} description`,
    unlocked,
  };
}

const catalog: Achievement[] = [
  item("first-a", "First A Grade", false, "trophy"),
  item("streak-30", "30 Day Streak", false, "flame"),
  item("streak-7", "Streak Protected", false, "flame"),
  item("syllabus-50", "Topic Mastered", false, "book"),
  item("papers-5", "Paper Hunter", false, "target"),
  item("daily-clear", "Daily Goal Complete", false, "star"),
];

describe("pickNextAchievement", () => {
  it("skips daily-clear when another locked milestone exists", () => {
    const next = pickNextAchievement(
      catalog.map((achievement) =>
        achievement.id === "first-a"
          ? { ...achievement, unlocked: true }
          : achievement,
      ),
    );
    expect(next?.id).toBe("streak-30");
  });
});

describe("AchievementPanel", () => {
  it("uses an h3, lists unlocked titles, and shows one next milestone", () => {
    render(
      <AchievementPanel
        achievements={catalog.map((achievement) =>
          achievement.id === "first-a" || achievement.id === "daily-clear"
            ? { ...achievement, unlocked: true }
            : achievement,
        )}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Achievements" }),
    ).toBeVisible();
    expect(screen.getByText("First A Grade")).toBeVisible();
    expect(screen.getByText("Daily Goal Complete")).toBeVisible();
    expect(screen.getByText("Next: 30 Day Streak")).toBeVisible();
    expect(screen.queryByText("Next: Streak Protected")).toBeNull();
    expect(screen.queryByText("Next: Daily Goal Complete")).toBeNull();
    expect(
      screen.queryByRole("progressbar", { name: "Achievements unlocked" }),
    ).toBeNull();
    expect(screen.getByText("2 of 6")).toBeVisible();
  });
});
