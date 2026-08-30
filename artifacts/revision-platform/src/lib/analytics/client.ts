import { LOCKDIN_POSTHOG_INIT_OPTIONS } from "./browser-config";
import {
  resolveAnalyticsEnvironment,
  sanitizeApprovedEvent,
  type AnalyticsEnvironment,
} from "./contract";
import {
  markAccountCreatedEmitted,
  markPendingAccountCreated,
  shouldEmitAccountCreated,
} from "./pending-signup";

type PostHogBrowser = {
  init: (token: string, config: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

let initialized = false;
let posthog: PostHogBrowser | null = null;

function readViteEnv(
  name:
    | "VITE_POSTHOG_PROJECT_TOKEN"
    | "VITE_POSTHOG_HOST"
    | "VITE_LOCKDIN_ANALYTICS_ENV",
): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isBrowserAnalyticsConfigured(): boolean {
  return Boolean(
    readViteEnv("VITE_POSTHOG_PROJECT_TOKEN") && readViteEnv("VITE_POSTHOG_HOST"),
  );
}

export function currentBrowserAnalyticsEnvironment(): AnalyticsEnvironment {
  return resolveAnalyticsEnvironment({
    explicit: readViteEnv("VITE_LOCKDIN_ANALYTICS_ENV"),
    nodeEnv: import.meta.env.PROD ? "production" : import.meta.env.MODE,
  });
}

async function loadPosthog(): Promise<PostHogBrowser | null> {
  if (posthog) {
    return posthog;
  }
  try {
    const mod = await import("posthog-js");
    posthog = mod.default as unknown as PostHogBrowser;
    return posthog;
  } catch {
    return null;
  }
}

export async function ensureBrowserAnalyticsInitialized(): Promise<boolean> {
  if (initialized) {
    return isBrowserAnalyticsConfigured();
  }
  if (typeof window === "undefined") {
    return false;
  }
  const token = readViteEnv("VITE_POSTHOG_PROJECT_TOKEN");
  const host = readViteEnv("VITE_POSTHOG_HOST");
  if (!token || !host) {
    return false;
  }
  const instance = await loadPosthog();
  if (!instance) {
    return false;
  }
  try {
    instance.init(token, {
      ...LOCKDIN_POSTHOG_INIT_OPTIONS,
      api_host: host,
    });
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export function resetAnalyticsIdentity(): void {
  if (!initialized || !posthog) {
    return;
  }
  try {
    posthog.reset();
  } catch {
    // never break logout
  }
}

async function captureAccountCreated(): Promise<void> {
  const sanitized = sanitizeApprovedEvent("account_created", {
    environment: currentBrowserAnalyticsEnvironment(),
  });
  if (!sanitized) {
    return;
  }
  if (!(await ensureBrowserAnalyticsInitialized()) || !posthog) {
    return;
  }
  try {
    posthog.capture(sanitized.event, sanitized.properties);
  } catch {
    // no-op
  }
}

export async function trackAccountCreated(): Promise<void> {
  await captureAccountCreated();
}

export function noteLocalSignup(userId: string | null | undefined): void {
  markPendingAccountCreated(userId);
}

export function emitAccountCreatedIfPending(userId: string): void {
  if (!shouldEmitAccountCreated(userId)) {
    return;
  }
  markAccountCreatedEmitted(userId);
  void captureAccountCreated();
}

export function tryEmitUnknownEvent(
  eventName: string,
  properties: Record<string, unknown>,
): boolean {
  return sanitizeApprovedEvent(eventName, properties) !== null;
}

export function resetBrowserAnalyticsForTests(): void {
  initialized = false;
  posthog = null;
}
