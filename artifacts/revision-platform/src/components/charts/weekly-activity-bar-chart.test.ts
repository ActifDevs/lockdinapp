import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  xAxis: null as Record<string, unknown> | null,
}));

vi.mock("recharts", async () => {
  const { createElement: create } = await import("react");
  const Container = ({ children }: { children?: ReactNode }) =>
    create("div", null, children);
  return {
    Bar: () => null,
    BarChart: Container,
    CartesianGrid: () => null,
    ResponsiveContainer: Container,
    Tooltip: () => null,
    XAxis: (props: Record<string, unknown>) => {
      captured.xAxis = props;
      const Tick = props.tick;
      if (typeof Tick === "function") {
        return create(Tick, { payload: { value: "2026-11-12" } });
      }
      return create("text", null, "2026-11-12");
    },
    YAxis: () => null,
  };
});

import WeeklyActivityBarChart from "./weekly-activity-bar-chart";

afterEach(() => {
  cleanup();
  captured.xAxis = null;
});

const week = [{ date: "2026-11-12", tasksCompleted: 0 }];

describe("WeeklyActivityBarChart compact ticks", () => {
  it("renders weekday abbreviations from the compact tick, not ISO dates", () => {
    render(
      createElement(WeeklyActivityBarChart, {
        data: week,
        height: 140,
        compact: true,
      }),
    );

    expect(typeof captured.xAxis?.tick).toBe("function");
    expect(captured.xAxis?.interval).toBe(0);
    expect(screen.getByText("Thu")).toBeVisible();
    expect(screen.queryByText("2026-11-12")).toBeNull();
  });

  it("leaves the full Progress chart on ISO date ticks", () => {
    render(
      createElement(WeeklyActivityBarChart, {
        data: week,
        height: 250,
      }),
    );

    expect(captured.xAxis?.tick).toEqual({
      fontSize: 12,
      fill: "currentColor",
      opacity: 0.5,
    });
    expect(captured.xAxis?.tickFormatter).toBeUndefined();
    expect(screen.getByText("2026-11-12")).toBeVisible();
    expect(screen.queryByText("Thu")).toBeNull();
  });
});
