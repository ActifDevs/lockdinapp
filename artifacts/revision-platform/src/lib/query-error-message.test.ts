import { describe, expect, it } from "vitest";
import {
  getQueryErrorMessage,
  getQueryErrorStatus,
  isCancelledQueryError,
} from "./query-error-message";

describe("getQueryErrorMessage", () => {
  it("maps generic HTTP 500 to production-safe copy", () => {
    expect(
      getQueryErrorMessage(new Error("HTTP 500 Internal Server Error")),
    ).toBe(
      "The API returned a server error. Please retry while we investigate.",
    );
  });

  it("maps structured HTTP 500 payloads to production-safe copy", () => {
    expect(
      getQueryErrorMessage(
        new Error("HTTP 500 Internal Server Error: Internal server error"),
      ),
    ).toBe(
      "The API returned a server error. Please retry while we investigate.",
    );
  });

  it("maps other 5xx statuses to production-safe copy", () => {
    expect(
      getQueryErrorMessage(new Error("HTTP 503 Service Unavailable")),
    ).toBe(
      "The API returned a server error. Please retry while we investigate.",
    );
  });

  it("keeps local-dev guidance for connection failures", () => {
    expect(
      getQueryErrorMessage(
        new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:8080"),
      ),
    ).toBe("We couldn't reach Lockdin. Check your connection and try again.");
  });

  it("maps 404 to safe not-found copy", () => {
    expect(
      getQueryErrorMessage(new Error("HTTP 404 Not Found: Subject not found")),
    ).toBe("The requested information could not be found.");
  });

  it("keeps 403 distinct with permission copy", () => {
    const error = Object.assign(new Error("hidden server detail"), {
      status: 403,
    });
    expect(getQueryErrorMessage(error)).toBe(
      "You don't have permission to view this information.",
    );
    expect(getQueryErrorStatus(error)).toBe(403);
  });

  it("uses safe copy for unclassified server messages", () => {
    expect(getQueryErrorMessage(new Error("database relation secret"))).toBe(
      "We couldn't load this information. Please try again.",
    );
  });

  it("recognizes obsolete query cancellation", () => {
    expect(
      isCancelledQueryError(new DOMException("Aborted", "AbortError")),
    ).toBe(true);
    expect(isCancelledQueryError(new Error("ordinary failure"))).toBe(false);
  });

  it("handles non-Error values", () => {
    expect(getQueryErrorMessage("nope")).toBe(
      "Please check your connection and try again.",
    );
  });
});
