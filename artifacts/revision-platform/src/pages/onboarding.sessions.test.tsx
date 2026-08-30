import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  complete: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data: unknown;
    constructor(status: number, data: unknown) {
      super("API request failed");
      this.status = status;
      this.data = data;
    }
  },
}));

vi.mock("@workspace/api-client-react", () => ({
  ApiError: api.ApiError,
  useListSubjects: () => ({
    data: [
      { id: 1, name: "Chemistry", code: "9701" },
      { id: 2, name: "History", code: "9489" },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useListSubjectAssignmentSessions: () => ({
    data: [
      {
        subjectId: 1,
        sessions: [
          { year: 2026, series: "Oct/Nov", label: "Oct/Nov 2026" },
          { year: 2027, series: "May/June", label: "May/June 2027" },
        ],
      },
      {
        subjectId: 2,
        sessions: [{ year: 2027, series: "May/June", label: "May/June 2027" }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    firstName: "Amina",
    user: { name: "Amina Yusuf" },
    completeOnboarding: api.complete,
  }),
}));

import Onboarding from "./onboarding";

async function reachSessions(selectedSubjects = ["Chemistry", "History"]) {
  const user = userEvent.setup();
  render(<Onboarding />);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await user.type(screen.getByLabelText("Username"), "amina_chem");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  for (const subject of selectedSubjects) {
    await user.click(
      screen.getByRole("button", { name: new RegExp(subject, "i") }),
    );
  }
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await user.click(screen.getByRole("button", { name: "AS Level (Year 12)" }));
  return user;
}

beforeEach(() => {
  api.complete.mockReset();
  api.complete.mockResolvedValue({});
});

afterEach(() => cleanup());

describe("Onboarding multi-session assignment", () => {
  it("requires a visible override for a subject that cannot use the global default", async () => {
    const user = await reachSessions();
    await user.click(screen.getByRole("button", { name: "Oct/Nov 2026" }));

    expect(
      screen.getByText(/History is not available for Oct\/Nov 2026/i),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(
      screen
        .getAllByRole("alert")
        .some((alert) => /History/i.test(alert.textContent ?? "")),
    ).toBe(true);

    await user.selectOptions(
      screen.getByLabelText("Exam session for History"),
      "May/June 2027",
    );
    expect(screen.getByText("Override")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
    expect(api.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        intendedExamSession: { year: 2026, series: "Oct/Nov" },
        subjectSessionOverrides: [
          { subjectId: 2, year: 2027, series: "May/June" },
        ],
      }),
    );
    expect(api.complete.mock.calls[0]?.[0]).not.toHaveProperty(
      "syllabusVersionId",
    );
  });

  it("does not allow Other to create a membership", async () => {
    const user = await reachSessions(["Chemistry"]);
    await user.click(screen.getByRole("button", { name: "Other" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Other cannot create subjects/i,
    );
    expect(api.complete).not.toHaveBeenCalled();
  });

  it("surfaces a safe strict-assignment rejection", async () => {
    api.complete.mockRejectedValue(
      new api.ApiError(409, {
        error: "No syllabus matches that exam session.",
      }),
    );
    const user = await reachSessions(["Chemistry"]);
    await user.click(screen.getByRole("button", { name: "May/June 2027" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No syllabus matches that exam session.",
    );
  });
});
