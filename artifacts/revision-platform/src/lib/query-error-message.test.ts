import { describe, expect, it } from "vitest";
import { getQueryErrorMessage } from "./query-error-message";

describe("getQueryErrorMessage", () => {
  it("maps generic HTTP 500 to production-safe copy", () => {
    expect(getQueryErrorMessage(new Error("HTTP 500 Internal Server Error"))).toBe(
      "The API returned a server error. Please retry while we investigate.",
    );
  });

  it("maps structured HTTP 500 payloads to production-safe copy", () => {
    expect(
      getQueryErrorMessage(new Error("HTTP 500 Internal Server Error: Internal server error")),
    ).toBe("The API returned a server error. Please retry while we investigate.");
  });

  it("maps other 5xx statuses to production-safe copy", () => {
    expect(getQueryErrorMessage(new Error("HTTP 503 Service Unavailable"))).toBe(
      "The API returned a server error. Please retry while we investigate.",
    );
  });

  it("keeps local-dev guidance for connection failures", () => {
    expect(getQueryErrorMessage(new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:8080"))).toBe(
      "Could not reach the API. Make sure the API server is running (pnpm dev from the project root).",
    );
  });

  it("passes through non-5xx messages", () => {
    expect(getQueryErrorMessage(new Error("HTTP 404 Not Found: Subject not found"))).toBe(
      "HTTP 404 Not Found: Subject not found",
    );
  });

  it("handles non-Error values", () => {
    expect(getQueryErrorMessage("nope")).toBe("Please check your connection and try again.");
  });
});
