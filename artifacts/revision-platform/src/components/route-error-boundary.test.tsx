import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const reportBoundaryError = vi.fn();

vi.mock("@/lib/monitoring", () => ({
  reportBoundaryError: (...args: unknown[]) => reportBoundaryError(...args),
}));

import { RouteErrorBoundary } from "./route-error-boundary";

function Boom(): never {
  throw new Error("boundary boom");
}

describe("RouteErrorBoundary", () => {
  it("reports a caught error once and keeps the fallback usable", () => {
    reportBoundaryError.mockReset();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <RouteErrorBoundary label="Dashboard">
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong on Dashboard/)).toBeInTheDocument();
    expect(reportBoundaryError).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
