import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadStateNotice } from "./read-state-notice";

afterEach(cleanup);

describe("ReadStateNotice", () => {
  it("presents safe status-aware copy and retries", () => {
    const retry = vi.fn();
    const error = Object.assign(new Error("private detail"), { status: 403 });

    render(
      <ReadStateNotice
        title="Subjects are unavailable"
        error={error}
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You don't have permission to view this information.",
    );
    expect(screen.queryByText("private detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("announces stale cached content without removing it", () => {
    render(<ReadStateNotice stale title="Refresh failed" />);
    expect(screen.getByRole("status")).toHaveTextContent("may be outdated");
  });

  it("does not surface cancellation", () => {
    render(
      <ReadStateNotice
        title="Should not render"
        error={new DOMException("Aborted", "AbortError")}
      />,
    );
    expect(screen.queryByText("Should not render")).not.toBeInTheDocument();
  });
});
