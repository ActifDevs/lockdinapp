import { describe, expect, it } from "vitest";
import { getQueryErrorMessage } from "./query-error-message";

describe("getQueryErrorMessage", () => {
  it("does not blame a stopped local API for HTTP 500", () => {
    expect(getQueryErrorMessage(new Error("HTTP 500 Internal Server Error"))).toBe(
      "The dashboard API returned a server error. Please retry while we investigate.",
    );
  });

  it("still guides toward pnpm dev for connection refused", () => {
    expect(getQueryErrorMessage(new Error("Failed to fetch"))).toMatch(/pnpm dev/);
  });
});
