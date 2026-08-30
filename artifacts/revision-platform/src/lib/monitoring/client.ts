import type { ErrorInfo } from "react";
import {
  resolveMonitoringEnvironment,
  resolveMonitoringRelease,
  type MonitoringEnvironment,
} from "./environment";
import {
  PRIVACY_INIT_FLAGS,
  isDiagnosticBreadcrumbCategory,
  sanitizeSentryEvent,
  type LooseSentryEvent,
} from "./sanitize";

type SentryModule = typeof import("@sentry/react");

type SentryLike = {
  init: SentryModule["init"];
  captureReactException: SentryModule["captureReactException"];
  reactErrorHandler: SentryModule["reactErrorHandler"];
};

let sentry: SentryLike | null = null;
let initialized = false;
let loadSentry: () => Promise<SentryLike> = async () => import("@sentry/react");

export function isFrontendSentryConfigured(
  env: Record<string, string | undefined> = import.meta.env,
): boolean {
  return Boolean(env.VITE_SENTRY_DSN?.trim());
}

export function currentFrontendSentryEnvironment(
  env: Record<string, string | undefined> = import.meta.env,
): MonitoringEnvironment {
  return resolveMonitoringEnvironment({
    explicit: env.VITE_SENTRY_ENVIRONMENT,
    vercelEnv: env.VITE_VERCEL_ENV,
    mode: typeof env.MODE === "string" ? env.MODE : undefined,
  });
}

export function currentFrontendSentryRelease(
  env: Record<string, string | undefined> = import.meta.env,
): string | undefined {
  return resolveMonitoringRelease({
    explicit: env.VITE_SENTRY_RELEASE,
    vercelSha: env.VITE_VERCEL_GIT_COMMIT_SHA,
  });
}

export async function initFrontendSentry(
  env: Record<string, string | undefined> = import.meta.env,
): Promise<boolean> {
  if (initialized) {
    return sentry !== null;
  }
  if (!isFrontendSentryConfigured(env)) {
    initialized = true;
    sentry = null;
    return false;
  }

  const environment = currentFrontendSentryEnvironment(env);
  const release = currentFrontendSentryRelease(env);

  try {
    const sdk = await loadSentry();
    sdk.init({
      dsn: env.VITE_SENTRY_DSN!.trim(),
      environment,
      ...(release ? { release } : {}),
      ...PRIVACY_INIT_FLAGS,
      integrations: (integrations) =>
        integrations.filter((integration) => {
          const name = integration.name ?? "";
          return !/replay|feedback|browserprofiling|browsertracing/i.test(name);
        }),
      beforeSend(event) {
        return sanitizeSentryEvent(event as LooseSentryEvent) as typeof event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (!isDiagnosticBreadcrumbCategory(breadcrumb.category)) {
          return null;
        }
        return {
          category: breadcrumb.category,
          timestamp: breadcrumb.timestamp,
          data: breadcrumb.data,
        };
      },
    });
    sentry = sdk;
    initialized = true;
    return true;
  } catch {
    initialized = true;
    sentry = null;
    return false;
  }
}

export function reportBoundaryError(error: unknown, errorInfo: ErrorInfo): void {
  if (!sentry) {
    return;
  }
  try {
    sentry.captureReactException(error, errorInfo);
  } catch {
    // Monitoring must never affect product UI.
  }
}

export function createUncaughtErrorHandler():
  | ((error: unknown, errorInfo: ErrorInfo) => void)
  | undefined {
  if (!sentry) {
    return undefined;
  }
  return sentry.reactErrorHandler();
}

export function resetFrontendSentryForTests(next?: SentryLike): void {
  sentry = next ?? null;
  initialized = false;
  loadSentry = next
    ? async () => next
    : async () => import("@sentry/react");
}
