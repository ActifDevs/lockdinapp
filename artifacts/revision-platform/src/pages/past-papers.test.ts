import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "past-papers.tsx"),
  "utf8",
);

describe("past-paper ownership and year UI wiring", () => {
  it("requires an explicit four-digit paper year and sends it on create", () => {
    expect(source).toMatch(
      /year:\s*z\.coerce\s*\.number\(\)\s*\.int\(\)\s*\.min\(1000/,
    );
    expect(source).toMatch(/max\(9999/);
    expect(source).toMatch(/name="year"/);
    expect(source).toMatch(/<FormLabel>Paper Year<\/FormLabel>/);
    expect(source).toMatch(/year:\s*data\.year/);
    expect(source).not.toMatch(/year:\s*new Date\(\)\.getFullYear/);
  });

  it("shows year in paper identity and provides create/delete only", () => {
    expect(source).toMatch(/`\$\{p\.session\} \$\{p\.year\}`/);
    expect(source).toMatch(/\{paper\.session\} \{paper\.year\}/);
    expect(source).toMatch(/useCreatePastPaperAttempt/);
    expect(source).toMatch(/useDeletePastPaperAttempt/);
    expect(source).not.toMatch(/useUpdatePastPaperAttempt|\.patch\(/);
    expect(source).not.toMatch(/userId:\s*data|ownerId:\s*data/);
  });

  it("invalidates every affected caller-owned aggregate after create/delete", () => {
    for (const key of [
      "getListPastPaperAttemptsQueryKey",
      "getGetDashboardSummaryQueryKey",
      "getGetProgressOverviewQueryKey",
      "getGetSubjectPerformanceQueryKey",
    ]) {
      expect(source.match(new RegExp(key, "g"))?.length).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});
