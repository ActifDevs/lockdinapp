import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIdempotentControlledNavigation } from "./use-idempotent-controlled-navigation";

type TestTab = "overview" | "syllabus" | "tasks";

describe("useIdempotentControlledNavigation", () => {
  it("suppresses a duplicate request before the controlled value commits", () => {
    const { result } = renderHook(() =>
      useIdempotentControlledNavigation<TestTab>("syllabus"),
    );

    expect(result.current("tasks")).toBe(true);
    expect(result.current("tasks")).toBe(false);
  });

  it("allows each different selection after its controlled value commits", () => {
    const { result, rerender } = renderHook(
      ({ committedValue }) =>
        useIdempotentControlledNavigation<TestTab>(committedValue),
      { initialProps: { committedValue: "syllabus" as TestTab } },
    );

    expect(result.current("tasks")).toBe(true);
    rerender({ committedValue: "tasks" });
    expect(result.current("overview")).toBe(true);
    expect(result.current("overview")).toBe(false);
  });

  it("allows the same destination again after later committed transitions", () => {
    const { result, rerender } = renderHook(
      ({ committedValue }) =>
        useIdempotentControlledNavigation<TestTab>(committedValue),
      { initialProps: { committedValue: "syllabus" as TestTab } },
    );

    expect(result.current("tasks")).toBe(true);
    rerender({ committedValue: "tasks" });
    expect(result.current("syllabus")).toBe(true);
    rerender({ committedValue: "syllabus" });
    expect(result.current("tasks")).toBe(true);
  });

  it("suppresses requests for the already committed value", () => {
    const { result } = renderHook(() =>
      useIdempotentControlledNavigation<TestTab>("overview"),
    );

    expect(result.current("overview")).toBe(false);
  });
});
