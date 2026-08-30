const PENDING_USER_KEY = "lockdin_analytics_pending_signup_user";
const PENDING_ANON_KEY = "lockdin_analytics_pending_signup_anon";
const EMITTED_PREFIX = "lockdin_analytics_account_created:";

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // private mode / quota — analytics must not break signup
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function emittedAccountCreatedKey(userId: string): string {
  return `${EMITTED_PREFIX}${userId}`;
}

export function markPendingAccountCreated(userId: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  if (userId) {
    safeSet(window.localStorage, PENDING_USER_KEY, userId);
    safeRemove(window.sessionStorage, PENDING_ANON_KEY);
    return;
  }
  safeSet(window.sessionStorage, PENDING_ANON_KEY, "1");
}

export function hasEmittedAccountCreated(userId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return safeGet(window.localStorage, emittedAccountCreatedKey(userId)) === "1";
}

export function markAccountCreatedEmitted(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  safeSet(window.localStorage, emittedAccountCreatedKey(userId), "1");
  const pendingUser = safeGet(window.localStorage, PENDING_USER_KEY);
  if (pendingUser === userId) {
    safeRemove(window.localStorage, PENDING_USER_KEY);
  }
  safeRemove(window.sessionStorage, PENDING_ANON_KEY);
}

/**
 * True only for a local signup that has not yet emitted account_created.
 * Ordinary login has no pending marker and returns false.
 */
export function shouldEmitAccountCreated(userId: string): boolean {
  if (!userId || hasEmittedAccountCreated(userId)) {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const pendingUser = safeGet(window.localStorage, PENDING_USER_KEY);
  if (pendingUser === userId) {
    return true;
  }
  if (pendingUser && pendingUser !== userId) {
    return false;
  }
  return safeGet(window.sessionStorage, PENDING_ANON_KEY) === "1";
}
