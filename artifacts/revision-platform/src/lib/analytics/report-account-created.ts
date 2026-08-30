import {
  reportAccountCreated,
  type CustomFetchOptions,
} from "@workspace/api-client-react";
import {
  markAccountCreatedEmitted,
  markPendingAccountCreated,
  shouldEmitAccountCreated,
} from "./pending-signup";

const inFlight = new Set<string>();

export function noteLocalSignup(userId: string | null | undefined): void {
  markPendingAccountCreated(userId);
}

/**
 * Best-effort first-party account_created. Does not use browser PostHog.
 * 401 must not log the user out (skipUnauthorizedHandler).
 */
export async function emitAccountCreatedIfPending(userId: string): Promise<void> {
  if (!userId || !shouldEmitAccountCreated(userId) || inFlight.has(userId)) {
    return;
  }
  inFlight.add(userId);
  try {
    await reportAccountCreated(
      {},
      { skipUnauthorizedHandler: true } as CustomFetchOptions,
    );
    markAccountCreatedEmitted(userId);
  } catch {
    // leave pending so a later session can retry; never throw to auth
  } finally {
    inFlight.delete(userId);
  }
}

export function resetFrontendAnalyticsForTests(): void {
  inFlight.clear();
}
