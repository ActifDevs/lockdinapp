import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../parse-csv.js", () => ({
  parseAndValidateCsv: () => {
    throw new Error("CSV must not be parsed during publish");
  },
}));

vi.mock("../normalize.js", () => ({
  normalizeSyllabus: () => {
    throw new Error("CSV must not be normalized during publish");
  },
}));

import { runSyllabusCli } from "../cli.js";

describe("publish CLI source independence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("publishes from subject code and revision only", async () => {
    const publishSyllabusRevision = vi.fn().mockResolvedValue({
      operation: "published",
      versionId: 9,
      logicalRevisionKey: "rev",
      isCurrent: true,
      retiredRevisionKey: null,
    });
    const close = vi.fn().mockResolvedValue(undefined);
    const exitCode = await runSyllabusCli(
      ["--mode=publish", "--files=9702", "--revision=rev", "--make-default"],
      {
        loadImporter: async () => ({
          importSyllabusRevision: vi.fn(),
          adoptLegacyIdentity: vi.fn(),
          publishSyllabusRevision,
          close,
        }),
      },
    );
    expect(exitCode).toBe(0);
    expect(publishSyllabusRevision).toHaveBeenCalledOnce();
  });
});
