import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagesDir = path.dirname(fileURLToPath(import.meta.url));
const onboarding = readFileSync(path.join(pagesDir, "onboarding.tsx"), "utf8");
const settings = readFileSync(path.join(pagesDir, "settings.tsx"), "utf8");

describe("controlled subject visibility frontend boundary", () => {
  it.each([
    ["Onboarding", onboarding],
    ["Settings", settings],
  ])("keeps %s driven by the shared server catalogues", (_name, source) => {
    expect(source).toMatch(/useListSubjects/);
    expect(source).toMatch(/useListSubjectAssignmentSessions/);
    expect(source).not.toMatch(/8021|9093|9626|9696|9699|9706|9990/);
    expect(source).not.toMatch(/selectableForNewMemberships|visibilityGrant/);
    expect(source).not.toMatch(/user\.email.*subject|subject.*user\.email/i);
  });
});
