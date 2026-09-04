/**
 * Hosted catalogue cutover authorization gate (B5B/B5BR).
 * Fail-closed. Callers must supply exact expected vs actual values — no stale hardcoded head/SHA.
 */
import { isLoopbackUrl } from "../db-harness/target-safety.js";

export const HOSTED_CUTOVER_FLAG = "LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER";

/** Documented production project; callers still must pass matching expected/actual. */
export const KNOWN_HOSTED_PROJECT_REF = "hazvcdrcvsxmuwdfiucx";

export type HostedCutoverGateInput = {
  allowFlag: string | undefined;
  /** Exact project ref the owner authorizes for this cutover. */
  expectedProjectRef: string | undefined;
  /** Observed project ref for the target database. */
  actualProjectRef: string | undefined;
  databaseUrl: string | undefined;
  expectedRepositoryCommit: string | undefined;
  actualRepositoryCommit: string | undefined;
  expectedMigrationHead: string | undefined;
  actualMigrationHead: string | undefined;
  backupAcknowledged: boolean;
  expectedFingerprint: string | undefined;
  actualFingerprint: string | undefined;
  /** Optional expected host substring (pooler / project ref). */
  expectedHostFingerprint?: string;
};

export type HostedCutoverGateResult =
  | { allowed: true }
  | { allowed: false; reason: string };

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function requireExactMatch(
  expected: string | undefined,
  actual: string | undefined,
  reason: string,
): HostedCutoverGateResult | null {
  if (!expected || !actual || expected !== actual) {
    return { allowed: false, reason };
  }
  return null;
}

/**
 * Build gate input from explicit env vars (B5C supplies frozen SHA + head).
 */
export function hostedCutoverGateInputFromEnv(env: NodeJS.ProcessEnv = process.env): HostedCutoverGateInput {
  return {
    allowFlag: env[HOSTED_CUTOVER_FLAG],
    expectedProjectRef: env.LOCKDIN_EXPECTED_PROJECT_REF,
    actualProjectRef: env.LOCKDIN_ACTUAL_PROJECT_REF ?? env.LOCKDIN_EXPECTED_PROJECT_REF,
    databaseUrl: env.DATABASE_URL ?? env.DIRECT_DATABASE_URL,
    expectedRepositoryCommit: env.LOCKDIN_EXPECTED_REPOSITORY_COMMIT,
    actualRepositoryCommit:
      env.LOCKDIN_ACTUAL_REPOSITORY_COMMIT ?? env.LOCKDIN_EXPECTED_REPOSITORY_COMMIT,
    expectedMigrationHead: env.LOCKDIN_EXPECTED_MIGRATION_HEAD,
    actualMigrationHead:
      env.LOCKDIN_ACTUAL_MIGRATION_HEAD ?? env.LOCKDIN_EXPECTED_MIGRATION_HEAD,
    backupAcknowledged: env.LOCKDIN_HOSTED_BACKUP_CONFIRMED === "1",
    expectedFingerprint: env.LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT,
    actualFingerprint: env.LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT,
    expectedHostFingerprint:
      env.LOCKDIN_EXPECTED_HOST_FINGERPRINT ?? env.LOCKDIN_EXPECTED_PROJECT_REF,
  };
}

export function checkHostedCatalogueCutoverGate(
  input: HostedCutoverGateInput,
): HostedCutoverGateResult {
  if (input.allowFlag !== "1") {
    return {
      allowed: false,
      reason: `missing ${HOSTED_CUTOVER_FLAG}=1`,
    };
  }

  const projectMismatch = requireExactMatch(
    input.expectedProjectRef,
    input.actualProjectRef,
    "wrong_project_ref",
  );
  if (projectMismatch) return projectMismatch;

  if (!input.databaseUrl || isLoopbackUrl(input.databaseUrl)) {
    return { allowed: false, reason: "hosted_database_url_required" };
  }

  const host = hostFromUrl(input.databaseUrl);
  if (!host) {
    return { allowed: false, reason: "invalid_database_url" };
  }

  const expectedHost =
    input.expectedHostFingerprint ?? input.expectedProjectRef ?? "";
  if (
    !expectedHost ||
    (!host.includes(expectedHost) && !input.databaseUrl.includes(expectedHost))
  ) {
    return { allowed: false, reason: "wrong_database_host" };
  }

  const commitMismatch = requireExactMatch(
    input.expectedRepositoryCommit,
    input.actualRepositoryCommit,
    "wrong_repository_commit",
  );
  if (commitMismatch) return commitMismatch;

  const migrationMismatch = requireExactMatch(
    input.expectedMigrationHead,
    input.actualMigrationHead,
    "wrong_migration_head",
  );
  if (migrationMismatch) return migrationMismatch;

  if (!input.backupAcknowledged) {
    return { allowed: false, reason: "missing_backup_acknowledgement" };
  }

  const fingerprintMismatch = requireExactMatch(
    input.expectedFingerprint,
    input.actualFingerprint,
    "pre_cutover_fingerprint_mismatch",
  );
  if (fingerprintMismatch) return fingerprintMismatch;

  return { allowed: true };
}

export function assertHostedCatalogueCutoverGate(
  input: HostedCutoverGateInput,
): void {
  const result = checkHostedCatalogueCutoverGate(input);
  if (!result.allowed) {
    throw new Error(
      `[hosted-cutover] authorization denied: ${result.reason}`,
    );
  }
}

/**
 * Shared guard for syllabus / applicability / component / route-publication
 * CLIs that must not target hosted by accident.
 *
 * Local path: loopback required (unchanged).
 * Hosted path: only when full cutover gate passes.
 */
export function assertDatabaseMutationTargetAllowed(args: {
  databaseUrl: string | undefined;
  mode: "local" | "hosted-cutover";
  hostedGate?: HostedCutoverGateInput;
  localPublicationFlag?: string | undefined;
  requireLocalPublicationFlag?: boolean;
}): void {
  const url = args.databaseUrl;
  if (!url) {
    throw new Error("DATABASE_URL must be set");
  }

  if (args.mode === "local") {
    if (!isLoopbackUrl(url)) {
      throw new Error(
        "mutation requires loopback DATABASE_URL (use hosted-cutover mode with explicit gate)",
      );
    }
    if (
      args.requireLocalPublicationFlag &&
      args.localPublicationFlag !== "1"
    ) {
      throw new Error(
        "set LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1 for local route publication",
      );
    }
    return;
  }

  if (!args.hostedGate) {
    throw new Error("hosted-cutover mode requires gate input");
  }
  assertHostedCatalogueCutoverGate({
    ...args.hostedGate,
    databaseUrl: args.hostedGate.databaseUrl ?? url,
  });
}
