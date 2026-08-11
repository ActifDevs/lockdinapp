import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Subject, UserSubjectMembership } from "@workspace/api-client-react";
import { selectMembershipSubjects } from "@/lib/selected-subjects";
import { SubjectMasteryGrid } from "./subject-mastery-grid";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => true,
}));

function subject(id: number): Subject {
  return {
    id,
    name: `Subject ${id}`,
    code: `S${id}`,
    color: "#0f766e",
    syllabusProgress: id * 10,
    topicsTotal: 10,
    topicsCompleted: id,
    topicsInProgress: 0,
    upcomingTasksCount: 0,
    recentPaperScore: null,
    recentPaperLabel: null,
  };
}

function membership(selectedSubject: Subject): UserSubjectMembership {
  return {
    subject: selectedSubject,
    syllabusVersion: {
      id: selectedSubject.id,
      label: "Current syllabus",
      examBoard: "Cambridge",
      qualification: "A Level",
    },
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt: "2026-08-11T00:00:00.000Z",
  };
}

afterEach(cleanup);

describe("SubjectMasteryGrid membership scoping", () => {
  it("renders only the current user's selected subjects and updates on user switch", () => {
    const subjects = [subject(1), subject(2), subject(3), subject(4)];
    const userA = [membership(subjects[0]!), membership(subjects[2]!)];
    const userB = [membership(subjects[1]!)];

    const { rerender } = render(
      <SubjectMasteryGrid
        subjects={selectMembershipSubjects(subjects, userA)}
        attention={[]}
      />,
    );

    expect(screen.getByText("Subject 1")).toBeVisible();
    expect(screen.getByText("Subject 3")).toBeVisible();
    expect(screen.queryByText("Subject 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Subject 4")).not.toBeInTheDocument();

    rerender(
      <SubjectMasteryGrid
        subjects={selectMembershipSubjects(subjects, userB)}
        attention={[]}
      />,
    );

    expect(screen.getByText("Subject 2")).toBeVisible();
    expect(screen.queryByText("Subject 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Subject 3")).not.toBeInTheDocument();
  });
});
