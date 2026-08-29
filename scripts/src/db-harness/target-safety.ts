/**
 * Target safety validation for disposable DB harness.
 * Reuses loopback validation logic from require-local-supabase.mjs.
 */

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export function isLoopbackUrl(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function assertLoopbackUrl(name: string, value: string): void {
  if (!isLoopbackUrl(value)) {
    throw new Error(
      `[db-harness] ${name} must use an exact loopback hostname (localhost, 127.0.0.1, ::1). ` +
      `Received: ${value.replace(/:[^:@]*@/, ':****@')}`
    );
  }
}

export function assertNotHostedUrl(name: string, value: string): void {
  if (!value) {
    return; // unset is safe
  }

  if (isLoopbackUrl(value)) {
    return; // loopback is safe
  }

  throw new Error(
    `[db-harness] ${name} appears to be a hosted/non-loopback URL. ` +
    `The disposable harness only targets local Supabase. ` +
    `Received: ${value.replace(/:[^:@]*@/, ':****@')}`
  );
}

export interface SafetyCheckResult {
  isSafe: boolean;
  error?: string;
}

export function checkInheritedDbUrls(
  databaseUrl: string | undefined,
  directDatabaseUrl: string | undefined
): SafetyCheckResult {
  const errors: string[] = [];

  if (databaseUrl) {
    if (!isLoopbackUrl(databaseUrl)) {
      errors.push("DATABASE_URL is set to a non-loopback URL");
    }
  }

  if (directDatabaseUrl) {
    if (!isLoopbackUrl(directDatabaseUrl)) {
      errors.push("DIRECT_DATABASE_URL is set to a non-loopback URL");
    }
  }

  if (errors.length > 0) {
    return {
      isSafe: false,
      error: `[db-harness] Inherited DB URLs are not safe: ${errors.join("; ")}. ` +
        `Clear these variables or ensure they point to a local loopback address.`
    };
  }

  return { isSafe: true };
}
