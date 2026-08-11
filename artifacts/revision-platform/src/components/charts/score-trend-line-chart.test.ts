import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  tooltipProps: null as Record<string, unknown> | null,
}));

vi.mock("recharts", async () => {
  const { createElement: create } = await import("react");
  const Container = ({ children }: { children?: ReactNode }) =>
    create("div", null, children);
  return {
    CartesianGrid: () => null,
    Line: () => null,
    LineChart: Container,
    ResponsiveContainer: Container,
    Tooltip: (props: Record<string, unknown>) => {
      captured.tooltipProps = props;
      return create("div", { "data-testid": "score-tooltip" });
    },
    XAxis: () => null,
    YAxis: () => null,
  };
});

import ScoreTrendLineChart from "./score-trend-line-chart";

afterEach(() => {
  cleanup();
  captured.tooltipProps = null;
});

describe("ScoreTrendLineChart tooltip", () => {
  it("uses valid HSL-backed foreground, background, and border tokens", () => {
    render(
      createElement(ScoreTrendLineChart, {
        data: [{ label: "First", percentage: 66.666666 }],
        xKey: "label",
        stroke: "hsl(var(--semantic-progress))",
      }),
    );

    expect(screen.getByTestId("score-tooltip")).toBeInTheDocument();
    expect(captured.tooltipProps?.contentStyle).toEqual({
      borderRadius: "8px",
      border: "1px solid hsl(var(--border))",
      backgroundColor: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
    });
    expect(captured.tooltipProps?.itemStyle).toEqual({
      color: "hsl(var(--foreground))",
    });
    expect(captured.tooltipProps?.labelStyle).toEqual({
      color: "hsl(var(--foreground))",
    });
  });

  it("formats tooltip percentages with the shared formatter", () => {
    render(
      createElement(ScoreTrendLineChart, {
        data: [{ label: "First", percentage: 66.666666 }],
        xKey: "label",
        stroke: "hsl(var(--semantic-progress))",
      }),
    );

    const formatter = captured.tooltipProps?.formatter as
      | ((value: number) => [string, string])
      | undefined;
    expect(formatter?.(66.666666)).toEqual(["66.7%", "Score"]);
    expect(screen.getByText(/latest 66\.7%/)).toBeInTheDocument();
  });
});
