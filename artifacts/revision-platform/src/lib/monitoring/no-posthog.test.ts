import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("PostHog / Sentry role split", () => {
  it("does not introduce PostHog exception capture in monitoring", () => {
    const client = readFileSync(join(here, "client.ts"), "utf8");
    expect(client).not.toMatch(/posthog/i);
    expect(client).not.toMatch(/captureException.*posthog/i);
  });

  it("does not add Sentry to the product analytics module", () => {
    const analytics = readFileSync(
      join(here, "..", "analytics", "index.ts"),
      "utf8",
    );
    expect(analytics).not.toMatch(/sentry/i);
  });
});
