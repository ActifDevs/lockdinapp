import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("PostHog / Sentry role split", () => {
  it("does not call PostHog from Sentry monitoring", () => {
    const client = readFileSync(join(here, "client.ts"), "utf8");
    expect(client).not.toMatch(/posthog/i);
  });

  it("does not add exception capture to PostHog analytics", () => {
    const analytics = readFileSync(join(here, "..", "analytics", "client.ts"), "utf8");
    expect(analytics).not.toMatch(/sentry/i);
    expect(analytics).not.toMatch(/captureException/);
  });
});
