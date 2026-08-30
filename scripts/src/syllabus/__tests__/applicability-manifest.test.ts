import { describe, expect, it } from "vitest";
import {
  loadApplicabilityManifest,
  parseApplicabilityManifest,
  windowIsNull,
  windowsEqual,
} from "../applicability-manifest.js";

describe("applicability manifest", () => {
  it("loads the committed nine-version write set", () => {
    const manifest = loadApplicabilityManifest();
    expect(manifest.versions).toHaveLength(9);
    expect(manifest.versions.map((row) => row.logicalRevisionKey)).toEqual([
      "9231-r001",
      "9489-r001",
      "9609-r001",
      "9618-r001",
      "9700-r001",
      "9701-r001",
      "9702-r001",
      "9708-r001",
      "9709-r001",
    ]);
    expect(
      manifest.versions.every(
        (row) =>
          row.seriesPolicy["Feb/Mar"] === false &&
          row.seriesPolicy["May/June"] === true &&
          row.seriesPolicy["Oct/Nov"] === true,
      ),
    ).toBe(true);
    expect(manifest.versions.every((row) => row.expectedContentSha256.length === 64)).toBe(
      true,
    );
  });

  it("accepts a synthetic future-revision write-set", () => {
    const raw = {
      schemaVersion: 1,
      provenance: {
        report: "synthetic",
        researchArtifact: "synthetic",
        ownerDecision: "fixture only",
      },
      versions: [
        {
          subjectCode: "9702",
          logicalRevisionKey: "9702-r002",
          expectedContentSha256: "a".repeat(64),
          applicability: {
            from: { year: 2031, series: "May/June" },
            to: { year: 2033, series: "Oct/Nov" },
          },
          seriesPolicy: {
            "Feb/Mar": false,
            "May/June": true,
            "Oct/Nov": true,
          },
        },
      ],
    };
    expect(parseApplicabilityManifest(raw).versions[0]?.logicalRevisionKey).toBe(
      "9702-r002",
    );
  });

  it("rejects a mutated Feb/Mar policy", () => {
    const raw = structuredClone(loadApplicabilityManifest()) as unknown as {
      versions: Array<{ seriesPolicy: { "Feb/Mar": boolean } }>;
    };
    raw.versions[0]!.seriesPolicy["Feb/Mar"] = true;
    expect(() => parseApplicabilityManifest(raw)).toThrow(/seriesPolicy/);
  });

  it("compares null and exact windows", () => {
    expect(
      windowIsNull({
        applicableFromYear: null,
        applicableFromSeries: null,
        applicableToYear: null,
        applicableToSeries: null,
      }),
    ).toBe(true);
    expect(
      windowsEqual(
        {
          applicableFromYear: 2025,
          applicableFromSeries: "May/June",
          applicableToYear: 2030,
          applicableToSeries: "Oct/Nov",
        },
        {
          from: { year: 2025, series: "May/June" },
          to: { year: 2030, series: "Oct/Nov" },
        },
      ),
    ).toBe(true);
  });
});
