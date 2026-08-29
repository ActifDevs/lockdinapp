import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveMembershipPin = vi.fn();
const dbSelect = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    select: (...args: unknown[]) => dbSelect(...args),
  },
  assessmentComponentsTable: {
    id: "id",
    syllabusVersionId: "syllabusVersionId",
  },
  syllabusTopicsTable: { id: "id", subjectId: "subjectId", unitId: "unitId" },
  syllabusUnitsTable: { id: "id", syllabusVersionId: "syllabusVersionId" },
}));

vi.mock("./resolve-reference-syllabus-version.js", () => ({
  REFERENCE_CONTEXT_UNAVAILABLE: "Reference context is unavailable",
  ReferenceContextLookupError: class ReferenceContextLookupError extends Error {
    constructor() {
      super("Reference context lookup failed");
    }
  },
  resolveMembershipPin: (...args: unknown[]) => resolveMembershipPin(...args),
}));

import {
  assertComponentOnCallerPin,
  assertTopicOnCallerPin,
} from "./pin-reference-writes";

const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function thenableRows(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.from = self;
  builder.innerJoin = self;
  builder.where = self;
  builder.limit = () => Promise.resolve(rows);
  return builder;
}

describe("pin-aware current-context writes", () => {
  beforeEach(() => {
    resolveMembershipPin.mockReset();
    dbSelect.mockReset();
  });

  it("accepts a topic on the caller pin", async () => {
    dbSelect.mockReturnValue(
      thenableRows([
        { topicId: 11, subjectId: 9, syllabusVersionId: 100 },
      ]),
    );
    resolveMembershipPin.mockResolvedValue({
      kind: "membership",
      versionId: 100,
      lifecycle: "published",
    });

    await expect(assertTopicOnCallerPin(USER, 11, 9)).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects a topic from another version of the same subject", async () => {
    dbSelect.mockReturnValue(
      thenableRows([
        { topicId: 22, subjectId: 9, syllabusVersionId: 200 },
      ]),
    );
    resolveMembershipPin.mockResolvedValue({
      kind: "membership",
      versionId: 100,
      lifecycle: "published",
    });

    await expect(assertTopicOnCallerPin(USER, 22, 9)).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Invalid request",
    });
  });

  it("rejects a missing topic with 404", async () => {
    dbSelect.mockReturnValue(thenableRows([]));
    await expect(assertTopicOnCallerPin(USER, 404)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Topic not found",
    });
    expect(resolveMembershipPin).not.toHaveBeenCalled();
  });

  it("rejects an off-pin assessment component", async () => {
    dbSelect.mockReturnValue(
      thenableRows([{ id: 7, syllabusVersionId: 200 }]),
    );
    resolveMembershipPin.mockResolvedValue({
      kind: "membership",
      versionId: 100,
      lifecycle: "published",
    });

    await expect(assertComponentOnCallerPin(USER, 9, 7)).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Invalid request",
    });
  });
});
