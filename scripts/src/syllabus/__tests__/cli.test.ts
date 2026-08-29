import { afterEach, describe, expect, it, vi } from "vitest";
import { runSyllabusCli, type SyllabusImporter } from "../cli.js";
import type { UpsertCounts } from "../db-upsert.js";

const SUCCESS_COUNTS: UpsertCounts = {
  subject: "existing",
  version: "unchanged",
  units: { created: 0, updated: 0, unchanged: 27 },
  topics: { created: 0, updated: 0, unchanged: 81 },
  learningOutcomes: { created: 0, updated: 0, unchanged: 373 },
  components: { created: 0, updated: 0, unchanged: 5 },
  relationships: { created: 518 },
};

function captureOutput() {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  return {
    logs,
    errors,
    warnings,
    output: {
      log: (...values: unknown[]) => logs.push(values.join(" ")),
      error: (...values: unknown[]) => errors.push(values.join(" ")),
      warn: (...values: unknown[]) => warnings.push(values.join(" ")),
    },
  };
}

function clearDatabaseEnvironment() {
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("DIRECT_DATABASE_URL", undefined);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("syllabus CLI database isolation", () => {
  it("validates a real source file without database configuration or importer loading", async () => {
    clearDatabaseEnvironment();
    const loadImporter = vi.fn<() => Promise<SyllabusImporter>>();
    const captured = captureOutput();

    const exitCode = await runSyllabusCli(["--mode=validate", "--files=9702"], {
      loadImporter,
      output: captured.output,
    });

    expect(exitCode).toBe(0);
    expect(loadImporter).not.toHaveBeenCalled();
    expect(captured.errors).toEqual([]);
    expect(captured.logs).toContainEqual(
      expect.stringContaining("9702_physics.csv"),
    );
    expect(captured.logs).toContain("\nOverall: OK");
  });

  it("dry-runs a filtered import without database configuration, writes, or importer loading", async () => {
    clearDatabaseEnvironment();
    const loadImporter = vi.fn<() => Promise<SyllabusImporter>>();
    const captured = captureOutput();

    const exitCode = await runSyllabusCli(
      ["--mode=import", "--dry-run", "--files=9702"],
      { loadImporter, output: captured.output },
    );

    expect(exitCode).toBe(0);
    expect(loadImporter).not.toHaveBeenCalled();
    expect(captured.errors).toEqual([]);
    expect(captured.logs).toContainEqual(
      expect.stringContaining("9702_physics.csv                    DRY RUN"),
    );
    expect(captured.logs).toContainEqual(
      expect.stringContaining("9231_further_mathematics.csv        SKIPPED"),
    );
    expect(captured.logs).toContain("\nOverall: OK");
  });

  it("fails explicitly when a real import has no database configuration", async () => {
    clearDatabaseEnvironment();
    const captured = captureOutput();

    await expect(
      runSyllabusCli(["--mode=import", "--files=9702"], {
        output: captured.output,
      }),
    ).rejects.toThrow(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  });

  it("closes the real-import resource once after a successful import", async () => {
    clearDatabaseEnvironment();
    const upsertSyllabus = vi.fn().mockResolvedValue(SUCCESS_COUNTS);
    const close = vi.fn().mockResolvedValue(undefined);
    const loadImporter = vi.fn().mockResolvedValue({ upsertSyllabus, close });
    const captured = captureOutput();

    const exitCode = await runSyllabusCli(["--mode=import", "--files=9702"], {
      loadImporter,
      output: captured.output,
    });

    expect(exitCode).toBe(0);
    expect(loadImporter).toHaveBeenCalledOnce();
    expect(upsertSyllabus).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(upsertSyllabus.mock.invocationCallOrder[0]).toBeLessThan(
      close.mock.invocationCallOrder[0],
    );
    expect(captured.logs).toContainEqual(
      expect.stringContaining("9702_physics.csv                    IMPORTED"),
    );
  });

  it("closes the real-import resource after a subject transaction failure", async () => {
    clearDatabaseEnvironment();
    const upsertSyllabus = vi
      .fn()
      .mockRejectedValue(new Error("database write failed"));
    const close = vi.fn().mockResolvedValue(undefined);
    const loadImporter = vi.fn().mockResolvedValue({ upsertSyllabus, close });
    const captured = captureOutput();

    const exitCode = await runSyllabusCli(["--mode=import", "--files=9702"], {
      loadImporter,
      output: captured.output,
    });

    expect(exitCode).toBe(1);
    expect(upsertSyllabus).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(captured.logs).toContainEqual(
      expect.stringContaining(
        "IMPORT FAILED — database write failed (transaction rolled back, no partial data)",
      ),
    );
    expect(captured.logs).toContain("\nOverall: FAILED");
  });

  it("does not swallow a real-import cleanup failure", async () => {
    clearDatabaseEnvironment();
    const upsertSyllabus = vi.fn().mockResolvedValue(SUCCESS_COUNTS);
    const close = vi
      .fn()
      .mockRejectedValue(new Error("database cleanup failed"));
    const loadImporter = vi.fn().mockResolvedValue({ upsertSyllabus, close });
    const captured = captureOutput();

    await expect(
      runSyllabusCli(["--mode=import", "--files=9702"], {
        loadImporter,
        output: captured.output,
      }),
    ).rejects.toThrow("database cleanup failed");

    expect(upsertSyllabus).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
