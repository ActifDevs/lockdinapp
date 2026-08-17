import { describe, expect, it } from "vitest";
import {
  computeSyllabusProgressPercent,
  hasOwnershipField,
  normalizeTopicNotes,
  progressMapFromRows,
} from "../lib/topic-progress";

describe("topic-progress helpers", () => {
  it("rejects ownership fields in request bodies", () => {
    expect(hasOwnershipField({ userId: "x", status: "completed" })).toBe(true);
    expect(hasOwnershipField({ user_id: "x", status: "completed" })).toBe(true);
    expect(hasOwnershipField({ ownerId: "x" })).toBe(true);
    expect(hasOwnershipField({ owner_id: "x" })).toBe(true);
    expect(hasOwnershipField({ status: "completed", notes: "ok" })).toBe(false);
    expect(hasOwnershipField(null)).toBe(false);
  });

  it("trims empty notes to null", () => {
    expect(normalizeTopicNotes(undefined)).toBeNull();
    expect(normalizeTopicNotes(null)).toBeNull();
    expect(normalizeTopicNotes("")).toBeNull();
    expect(normalizeTopicNotes("   ")).toBeNull();
    expect(normalizeTopicNotes("  keep me  ")).toBe("keep me");
  });

  it("maps progress rows by topic id", () => {
    const map = progressMapFromRows([
      { topic_id: 2, status: "completed", notes: "done" },
      { topic_id: 5, status: "in_progress", notes: null },
    ]);
    expect(map.get(2)).toEqual({ status: "completed", notes: "done" });
    expect(map.get(5)).toEqual({ status: "in_progress", notes: null });
    expect(map.get(9)).toBeUndefined();
  });

  it("computes syllabus percent safely", () => {
    expect(computeSyllabusProgressPercent(0, 0)).toBe(0);
    expect(computeSyllabusProgressPercent(4, 1)).toBe(25);
    expect(computeSyllabusProgressPercent(3, 2)).toBe(67);
  });
});
