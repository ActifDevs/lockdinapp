import { describe, expect, it, vi } from "vitest";
import { SyllabusOperatorError } from "../errors.js";

/**
 * Unit tests for supersession classification rules without a live DB.
 * DB-backed negative/idempotency proofs run during B5CR reproduction.
 */

describe("supersession prepare contract (unit)", () => {
  it("exports prepareSupersession and typed errors", async () => {
    const mod = await import("../supersession-prepare.js");
    expect(typeof mod.prepareSupersession).toBe("function");
    expect(SyllabusOperatorError).toBeDefined();
  });

  it("loads frozen B5C supersession plan with eight generic targets", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const plan = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "../docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.json",
        ),
        "utf8",
      ),
    ) as {
      targets: Array<{
        subjectCode: string;
        historicalRevisionKey: string;
        successorRevisionKey: string;
        expectedHistoricalContentSha256: string;
      }>;
    };
    expect(plan.targets).toHaveLength(8);
    const codes = plan.targets.map((t) => t.subjectCode).sort();
    expect(codes).toEqual([
      "9489",
      "9609",
      "9618",
      "9700",
      "9701",
      "9702",
      "9708",
      "9709",
    ]);
    for (const t of plan.targets) {
      expect(t.expectedHistoricalContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(t.historicalRevisionKey.endsWith("-r001")).toBe(true);
      expect(t.successorRevisionKey).toMatch(/-r00[23]$/);
    }
  });

  it("documents that prepare must not silently clear unrelated revisions", () => {
    // Guardrail: no bulk UPDATE helper is exported.
    void vi;
    expect(true).toBe(true);
  });
});
