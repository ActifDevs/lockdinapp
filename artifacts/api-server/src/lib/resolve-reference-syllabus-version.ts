import { and, eq } from "drizzle-orm";
import {
  db,
  syllabusVersionsTable,
  userSubjectsTable,
} from "@workspace/db";

export const REFERENCE_CONTEXT_UNAVAILABLE = "Reference context is unavailable";

export class ReferenceContextLookupError extends Error {
  readonly code = "REFERENCE_CONTEXT_LOOKUP_FAILED" as const;

  constructor() {
    super("Reference context lookup failed");
    this.name = "ReferenceContextLookupError";
  }
}

export type VersionLifecycle = "draft" | "published" | "retired" | "archived";

export type ResolvedSyllabusVersion = {
  versionId: number;
  lifecycle: VersionLifecycle;
};

export type ReferenceSyllabusResolution =
  | ({ kind: "membership" } & ResolvedSyllabusVersion)
  | ({ kind: "default" } & ResolvedSyllabusVersion)
  | { kind: "none" }
  | { kind: "invariant"; reason: "draft_pin" | "broken_pin" };

type VersionRow = {
  id: number;
  subjectId: number;
  lifecycle: VersionLifecycle;
};

export type ReferenceSyllabusStore = {
  findMembership(
    userId: string,
    subjectId: number,
  ): Promise<{ syllabusVersionId: number } | null>;
  findVersion(versionId: number): Promise<VersionRow | null>;
  findDefaultVersion(subjectId: number): Promise<VersionRow | null>;
};

const drizzleStore: ReferenceSyllabusStore = {
  async findMembership(userId, subjectId) {
    const [row] = await db
      .select({
        syllabusVersionId: userSubjectsTable.syllabusVersionId,
      })
      .from(userSubjectsTable)
      .where(
        and(
          eq(userSubjectsTable.userId, userId),
          eq(userSubjectsTable.subjectId, subjectId),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  async findVersion(versionId) {
    const [row] = await db
      .select({
        id: syllabusVersionsTable.id,
        subjectId: syllabusVersionsTable.subjectId,
        lifecycle: syllabusVersionsTable.lifecycle,
      })
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.id, versionId))
      .limit(1);
    return row ?? null;
  },
  async findDefaultVersion(subjectId) {
    const [row] = await db
      .select({
        id: syllabusVersionsTable.id,
        subjectId: syllabusVersionsTable.subjectId,
        lifecycle: syllabusVersionsTable.lifecycle,
      })
      .from(syllabusVersionsTable)
      .where(
        and(
          eq(syllabusVersionsTable.subjectId, subjectId),
          eq(syllabusVersionsTable.isCurrent, true),
        ),
      )
      .limit(1);
    return row ?? null;
  },
};

async function runLookup<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ReferenceContextLookupError) throw error;
    throw new ReferenceContextLookupError();
  }
}

function pinFromMembership(
  membership: { syllabusVersionId: number },
  version: VersionRow | null,
  subjectId: number,
): ReferenceSyllabusResolution {
  if (!version || version.subjectId !== subjectId) {
    return { kind: "invariant", reason: "broken_pin" };
  }
  if (version.lifecycle === "draft") {
    return { kind: "invariant", reason: "draft_pin" };
  }
  return {
    kind: "membership",
    versionId: version.id,
    lifecycle: version.lifecycle,
  };
}

function defaultFromVersion(
  version: VersionRow | null,
): ReferenceSyllabusResolution {
  if (!version) return { kind: "none" };
  return {
    kind: "default",
    versionId: version.id,
    lifecycle: version.lifecycle,
  };
}

/** Existing membership pin only. Never substitutes DEFAULT. */
export async function resolveMembershipPin(
  userId: string,
  subjectId: number,
  store: ReferenceSyllabusStore = drizzleStore,
): Promise<ReferenceSyllabusResolution> {
  const membership = await runLookup(() =>
    store.findMembership(userId, subjectId),
  );
  if (!membership) return { kind: "none" };

  const version = await runLookup(() =>
    store.findVersion(membership.syllabusVersionId),
  );
  return pinFromMembership(membership, version, subjectId);
}

/**
 * Catalogue / optional-auth reference context.
 * DEFAULT is used only after a successful lookup proves no membership row.
 */
export async function resolveReferenceSyllabusVersion(
  subjectId: number,
  userId: string | null | undefined,
  store: ReferenceSyllabusStore = drizzleStore,
): Promise<ReferenceSyllabusResolution> {
  if (userId) {
    const membership = await runLookup(() =>
      store.findMembership(userId, subjectId),
    );
    if (membership) {
      const version = await runLookup(() =>
        store.findVersion(membership.syllabusVersionId),
      );
      return pinFromMembership(membership, version, subjectId);
    }
  }

  const current = await runLookup(() => store.findDefaultVersion(subjectId));
  return defaultFromVersion(current);
}

export function resolvedVersionId(
  resolution: ReferenceSyllabusResolution,
): number | null {
  if (resolution.kind === "membership" || resolution.kind === "default") {
    return resolution.versionId;
  }
  return null;
}
