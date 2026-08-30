import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SyllabusOperatorError } from "./errors.js";

export const EXAM_SITTING_SERIES = ["Feb/Mar", "May/June", "Oct/Nov"] as const;
export type ExamSittingSeries = (typeof EXAM_SITTING_SERIES)[number];

export type ApplicabilityWindow = {
  from: { year: number; series: ExamSittingSeries };
  to: { year: number; series: ExamSittingSeries };
};

export type SeriesPolicy = Record<ExamSittingSeries, boolean>;

export type ApplicabilityManifestEntry = {
  subjectCode: string;
  logicalRevisionKey: string;
  expectedContentSha256: string;
  applicability: ApplicabilityWindow;
  seriesPolicy: SeriesPolicy;
};

export type ApplicabilityManifest = {
  schemaVersion: number;
  provenance: {
    report: string;
    researchArtifact: string;
    ownerDecision: string;
  };
  versions: ApplicabilityManifestEntry[];
};

const SHA256_RE = /^[a-f0-9]{64}$/;

export const DEFAULT_APPLICABILITY_MANIFEST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/reference-data/syllabus-applicability/population-manifest.json",
);

function isSeries(value: unknown): value is ExamSittingSeries {
  return (
    typeof value === "string" &&
    (EXAM_SITTING_SERIES as readonly string[]).includes(value)
  );
}

function parseWindow(
  raw: unknown,
  field: string,
): { year: number; series: ExamSittingSeries } {
  if (!raw || typeof raw !== "object") {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      `${field} is required`,
    );
  }
  const year = (raw as { year?: unknown }).year;
  const series = (raw as { series?: unknown }).series;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      `${field}.year must be a four-digit year`,
    );
  }
  if (!isSeries(series)) {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      `${field}.series must be an exam sitting series`,
    );
  }
  return { year, series };
}

export function parseApplicabilityManifest(raw: unknown): ApplicabilityManifest {
  if (!raw || typeof raw !== "object") {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      "manifest must be an object",
    );
  }
  const doc = raw as Record<string, unknown>;
  if (doc.schemaVersion !== 1) {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      "unsupported applicability manifest schemaVersion",
    );
  }
  if (!Array.isArray(doc.versions) || doc.versions.length !== 9) {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      "manifest must contain exactly nine versions",
    );
  }

  const versions = doc.versions.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}] is invalid`,
      );
    }
    const row = entry as Record<string, unknown>;
    const subjectCode = row.subjectCode;
    const logicalRevisionKey = row.logicalRevisionKey;
    const expectedContentSha256 = row.expectedContentSha256;
    if (typeof subjectCode !== "string" || !/^\d{4}$/.test(subjectCode)) {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].subjectCode is invalid`,
      );
    }
    if (
      typeof logicalRevisionKey !== "string" ||
      logicalRevisionKey !== `${subjectCode}-r001`
    ) {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].logicalRevisionKey must be ${subjectCode}-r001`,
      );
    }
    if (
      typeof expectedContentSha256 !== "string" ||
      !SHA256_RE.test(expectedContentSha256)
    ) {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].expectedContentSha256 is invalid`,
      );
    }
    const applicabilityRaw = row.applicability;
    if (!applicabilityRaw || typeof applicabilityRaw !== "object") {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].applicability is required`,
      );
    }
    const applicability = {
      from: parseWindow(
        (applicabilityRaw as { from?: unknown }).from,
        `versions[${index}].applicability.from`,
      ),
      to: parseWindow(
        (applicabilityRaw as { to?: unknown }).to,
        `versions[${index}].applicability.to`,
      ),
    };
    const policyRaw = row.seriesPolicy;
    if (!policyRaw || typeof policyRaw !== "object") {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].seriesPolicy is required`,
      );
    }
    const seriesPolicy = policyRaw as Record<string, unknown>;
    if (
      seriesPolicy["Feb/Mar"] !== false ||
      seriesPolicy["May/June"] !== true ||
      seriesPolicy["Oct/Nov"] !== true
    ) {
      throw new SyllabusOperatorError(
        "invalid_applicability_manifest",
        `versions[${index}].seriesPolicy must be Feb/Mar false, May/June true, Oct/Nov true`,
      );
    }
    return {
      subjectCode,
      logicalRevisionKey,
      expectedContentSha256,
      applicability,
      seriesPolicy: {
        "Feb/Mar": false,
        "May/June": true,
        "Oct/Nov": true,
      } satisfies SeriesPolicy,
    };
  });

  const codes = new Set(versions.map((row) => row.subjectCode));
  if (codes.size !== 9) {
    throw new SyllabusOperatorError(
      "invalid_applicability_manifest",
      "manifest subject codes must be unique",
    );
  }

  return {
    schemaVersion: 1,
    provenance: doc.provenance as ApplicabilityManifest["provenance"],
    versions,
  };
}

export function loadApplicabilityManifest(
  filePath = DEFAULT_APPLICABILITY_MANIFEST_PATH,
): ApplicabilityManifest {
  return parseApplicabilityManifest(
    JSON.parse(readFileSync(filePath, "utf8")) as unknown,
  );
}

export function windowsEqual(
  actual: {
    applicableFromYear: number | null;
    applicableFromSeries: string | null;
    applicableToYear: number | null;
    applicableToSeries: string | null;
  },
  desired: ApplicabilityWindow,
): boolean {
  return (
    actual.applicableFromYear === desired.from.year &&
    actual.applicableFromSeries === desired.from.series &&
    actual.applicableToYear === desired.to.year &&
    actual.applicableToSeries === desired.to.series
  );
}

export function windowIsNull(actual: {
  applicableFromYear: number | null;
  applicableFromSeries: string | null;
  applicableToYear: number | null;
  applicableToSeries: string | null;
}): boolean {
  return (
    actual.applicableFromYear === null &&
    actual.applicableFromSeries === null &&
    actual.applicableToYear === null &&
    actual.applicableToSeries === null
  );
}
