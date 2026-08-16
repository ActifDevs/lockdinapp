import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubjectMasteryGrid } from "./subject-mastery-grid";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => true,
}));

function subject(
  id: number,
  syllabusProgress: number,
  recentPaperScore: number | null,
) {
  return {
    id,
    name: `Subject ${id}`,
    code: `S${id}`,
    color: "#0f766e",
    topicsTotal: 10,
    syllabusProgress,
    recentPaperScore,
  };
}

afterEach(cleanup);

describe("SubjectMasteryGrid personal progress", () => {
  it("renders distinct membership progress and paper results without shared placeholders", () => {
    render(
      <SubjectMasteryGrid
        subjects={[subject(1, 25, 61), subject(3, 80, 92)]}
        attention={[]}
        recentPerformance={[
          {
            subjectId: 1,
            subjectName: "Subject 1",
            subjectColor: "#0f766e",
            paperLabel: "Paper 1",
            previousPercentage: 55,
            latestPercentage: 61,
            change: 6,
          },
          {
            subjectId: 3,
            subjectName: "Subject 3",
            subjectColor: "#0f766e",
            paperLabel: "Paper 3",
            previousPercentage: 90,
            latestPercentage: 92,
            change: 2,
          },
        ]}
      />,
    );

    expect(screen.getByText("Subject 1")).toBeVisible();
    expect(screen.getByText("Subject 3")).toBeVisible();
    expect(screen.getByText("25%")).toBeVisible();
    expect(screen.getByText("80%")).toBeVisible();
    expect(screen.getByText("61%")).toBeVisible();
    expect(screen.getByText("92%")).toBeVisible();
    expect(screen.getAllByText("Syllabus progress")).toHaveLength(2);
    expect(screen.queryByText("Weak topics")).not.toBeInTheDocument();
    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  }, 15_000);
});
