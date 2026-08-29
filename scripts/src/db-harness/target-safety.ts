/** Fail-closed target validation for the destructive database harness. */

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;

  try {
    return LOOPBACK_HOSTNAMES.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export interface SafetyCheckResult {
  isSafe: boolean;
  error?: string;
}

export function checkInheritedDbUrls(
  databaseUrl: string | undefined,
  directDatabaseUrl: string | undefined,
): SafetyCheckResult {
  const hasUnsafeUrl =
    Boolean(databaseUrl && !isLoopbackUrl(databaseUrl)) ||
    Boolean(directDatabaseUrl && !isLoopbackUrl(directDatabaseUrl));

  if (hasUnsafeUrl) {
    return {
      isSafe: false,
      error:
        "[db-harness] Target safety rejected: inherited database endpoint is not loopback.",
    };
  }

  return { isSafe: true };
}

export interface DestructiveTargetInput {
  apiUrl: string;
  dbUrl: string;
  runningProjectId: string;
  expectedProjectId: string;
  destructiveAuthorization: string | undefined;
}

/**
 * Destructive work is allowed only when locality, positive running identity,
 * and explicit operator authorization are all independently proven.
 */
export function checkDestructiveTarget(
  input: DestructiveTargetInput,
): SafetyCheckResult {
  if (!isLoopbackUrl(input.apiUrl) || !isLoopbackUrl(input.dbUrl)) {
    return {
      isSafe: false,
      error: "[db-harness] Target safety rejected: endpoint is not loopback.",
    };
  }

  if (
    input.expectedProjectId.length === 0 ||
    input.runningProjectId !== input.expectedProjectId
  ) {
    return {
      isSafe: false,
      error:
        "[db-harness] Target safety rejected: dedicated project identity mismatch.",
    };
  }

  if (input.destructiveAuthorization !== "1") {
    return {
      isSafe: false,
      error:
        "[db-harness] Target safety rejected: explicit destructive authorization is absent.",
    };
  }

  return { isSafe: true };
}

export function assertDestructiveTarget(input: DestructiveTargetInput): void {
  const result = checkDestructiveTarget(input);
  if (!result.isSafe) throw new Error(result.error);
}
