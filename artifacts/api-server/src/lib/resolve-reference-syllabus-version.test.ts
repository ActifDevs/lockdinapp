import { describe, expect, it } from "vitest";
import {
  ReferenceContextLookupError,
  resolveMembershipPin,
  resolveReferenceSyllabusVersion,
  type ReferenceSyllabusStore,
} from "./resolve-reference-syllabus-version";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function store(overrides: Partial<ReferenceSyllabusStore> = {}): ReferenceSyllabusStore {
  return {
    findMembership: async () => null,
    findVersion: async () => null,
    findDefaultVersion: async () => ({
      id: 1,
      subjectId: 9,
      lifecycle: "published",
    }),
    ...overrides,
  };
}

describe("resolveReferenceSyllabusVersion", () => {
  it("uses DEFAULT when there is no authenticated user", async () => {
    const result = await resolveReferenceSyllabusVersion(9, null, store());
    expect(result).toEqual({
      kind: "default",
      versionId: 1,
      lifecycle: "published",
    });
  });

  it("uses DEFAULT when membership lookup succeeds with no row", async () => {
    const result = await resolveReferenceSyllabusVersion(9, USER_A, store());
    expect(result.kind).toBe("default");
  });

  it("does not treat a membership lookup error as no-membership DEFAULT", async () => {
    await expect(
      resolveReferenceSyllabusVersion(
        9,
        USER_A,
        store({
          findMembership: async () => {
            throw new Error("db down");
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ReferenceContextLookupError);
  });

  it("serves an existing published or retired pin instead of DEFAULT", async () => {
    const membershipStore = store({
      findMembership: async (userId) =>
        userId === USER_A ? { syllabusVersionId: 20 } : { syllabusVersionId: 21 },
      findVersion: async (id) =>
        id === 20
          ? { id: 20, subjectId: 9, lifecycle: "retired" }
          : { id: 21, subjectId: 9, lifecycle: "published" },
      findDefaultVersion: async () => ({
        id: 1,
        subjectId: 9,
        lifecycle: "published",
      }),
    });

    expect(await resolveReferenceSyllabusVersion(9, USER_A, membershipStore)).toEqual({
      kind: "membership",
      versionId: 20,
      lifecycle: "retired",
    });
    expect(await resolveReferenceSyllabusVersion(9, USER_B, membershipStore)).toEqual({
      kind: "membership",
      versionId: 21,
      lifecycle: "published",
    });
  });

  it("serves an archived pin", async () => {
    const result = await resolveReferenceSyllabusVersion(
      9,
      USER_A,
      store({
        findMembership: async () => ({ syllabusVersionId: 30 }),
        findVersion: async () => ({
          id: 30,
          subjectId: 9,
          lifecycle: "archived",
        }),
      }),
    );
    expect(result).toEqual({
      kind: "membership",
      versionId: 30,
      lifecycle: "archived",
    });
  });

  it("fails closed on a draft pin without DEFAULT fallback", async () => {
    const result = await resolveReferenceSyllabusVersion(
      9,
      USER_A,
      store({
        findMembership: async () => ({ syllabusVersionId: 40 }),
        findVersion: async () => ({
          id: 40,
          subjectId: 9,
          lifecycle: "draft",
        }),
      }),
    );
    expect(result).toEqual({ kind: "invariant", reason: "draft_pin" });
  });

  it("fails closed when the pin version is missing or for another subject", async () => {
    const missing = await resolveMembershipPin(
      USER_A,
      9,
      store({
        findMembership: async () => ({ syllabusVersionId: 99 }),
        findVersion: async () => null,
      }),
    );
    expect(missing).toEqual({ kind: "invariant", reason: "broken_pin" });

    const mismatch = await resolveMembershipPin(
      USER_A,
      9,
      store({
        findMembership: async () => ({ syllabusVersionId: 50 }),
        findVersion: async () => ({
          id: 50,
          subjectId: 8,
          lifecycle: "published",
        }),
      }),
    );
    expect(mismatch).toEqual({ kind: "invariant", reason: "broken_pin" });
  });

  it("returns none from membership-only resolve when the caller is not enrolled", async () => {
    const result = await resolveMembershipPin(USER_A, 9, store());
    expect(result).toEqual({ kind: "none" });
  });
});
