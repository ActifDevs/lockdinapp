import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  routes: vi.fn(),
  mutate: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@workspace/api-client-react", () => ({
  listSubjectAssessmentRoutes: api.routes,
  useAssignCurrentUserSubjectAssessmentRoute: () => ({
    mutate: api.mutate,
    isPending: false,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast }));

import { MembershipAssessmentPanel } from "./membership-assessment-panel";

const catalogue = {
  subjectId: 2,
  syllabusVersionId: 19,
  selectionMode: "explicit" as const,
  routes: [
    {
      id: 14,
      routeKey: "as_single_series",
      displayLabel: "AS Level — Papers 1 + 2 this exam series",
      qualificationTarget: "as_level",
    },
    {
      id: 15,
      routeKey: "a_staged_completion",
      displayLabel: "Complete A Level — carry forward AS, take Papers 3 + 4",
      qualificationTarget: "a_level",
    },
    {
      id: 16,
      routeKey: "a_full_same_series",
      displayLabel: "Full A Level — Papers 1–4 this exam series",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [
    {
      id: 4,
      displayLabel: "AS History Option",
      applicableQualificationTarget: "both" as const,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: 10, displayLabel: "Modern Europe" },
        { id: 11, displayLabel: "History of the USA" },
      ],
    },
    {
      id: 5,
      displayLabel: "Paper 3 Prescribed Topic",
      applicableQualificationTarget: "a_level" as const,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: 13, displayLabel: "First World War" },
        { id: 14, displayLabel: "The Holocaust" },
      ],
    },
    {
      id: 6,
      displayLabel: "Paper 4 Depth Study Option",
      applicableQualificationTarget: "a_level" as const,
      minSelections: 1,
      maxSelections: 1,
      options: [
        { id: 16, displayLabel: "Depth Study 1" },
        { id: 17, displayLabel: "Depth Study 2" },
      ],
    },
  ],
};

const membership = (routeId: number | null, optionIds: number[]) => ({
  subject: {
    id: 2,
    name: "History",
    code: "9489",
    color: "#dc2626",
    topicsTotal: 81,
  },
  syllabusVersion: {
    id: 19,
    label: "2027–2029",
    examBoard: "CAIE",
    qualification: "AS & A Level",
  },
  assessmentRouteId: routeId,
  optionIds,
  intendedExamSession: { year: 2027, series: "May/June" as const },
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
});

describe("MembershipAssessmentPanel hydration and applicability", () => {
  beforeEach(() => {
    api.routes.mockReset();
    api.routes.mockResolvedValue(catalogue);
    api.mutate.mockReset();
    toast.mockReset();
  });

  afterEach(cleanup);

  it("hydrates the persisted Full A Level route and all three saved options", async () => {
    render(
      <MembershipAssessmentPanel membership={membership(16, [10, 14, 17])} />,
    );

    expect(
      await screen.findByRole("radio", {
        name: "Full A Level — Papers 1–4 this exam series",
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("checkbox", { name: "Modern Europe" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "The Holocaust" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Depth Study 2" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Update assessment" }),
    ).toBeEnabled();
  });

  it("filters A-Level-only groups on AS and submits only the applicable option", async () => {
    api.mutate.mockImplementation(
      (
        _input: unknown,
        callbacks: {
          onSuccess: (value: ReturnType<typeof membership>) => void;
        },
      ) => callbacks.onSuccess(membership(14, [10])),
    );
    render(
      <MembershipAssessmentPanel membership={membership(16, [10, 14, 17])} />,
    );

    fireEvent.click(
      await screen.findByRole("radio", {
        name: "AS Level — Papers 1 + 2 this exam series",
      }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Modern Europe" }),
    ).toBeChecked();
    expect(
      screen.queryByText("Paper 3 Prescribed Topic"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Paper 4 Depth Study Option"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update assessment" }));
    expect(api.mutate).toHaveBeenCalledWith(
      {
        subjectId: 2,
        data: { routeId: 14, optionIds: [10] },
      },
      expect.any(Object),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Modern Europe" }),
      ).toBeChecked(),
    );
  });

  it("rehydrates canonical AS state after a refetch and requires groups again on Full", async () => {
    const { rerender } = render(
      <MembershipAssessmentPanel membership={membership(16, [10, 14, 17])} />,
    );
    await screen.findByRole("checkbox", { name: "Depth Study 2" });

    rerender(<MembershipAssessmentPanel membership={membership(14, [10])} />);
    await waitFor(() =>
      expect(
        screen.getByRole("radio", {
          name: "AS Level — Papers 1 + 2 this exam series",
        }),
      ).toHaveAttribute("aria-checked", "true"),
    );
    expect(
      screen.queryByText("Paper 3 Prescribed Topic"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Full A Level — Papers 1–4 this exam series",
      }),
    );
    expect(screen.getByText("Paper 3 Prescribed Topic")).toBeVisible();
    expect(screen.getByText("Paper 4 Depth Study Option")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Update assessment" }),
    ).toBeDisabled();
  });
});
