import * as Sentry from "@sentry/node";
import {
  resolveMonitoringEnvironment,
  resolveMonitoringRelease,
  type MonitoringEnvironment,
} from "./environment.js";
import {
  PRIVACY_INIT_FLAGS,
  sanitizeSentryEvent,
  type LooseSentryEvent,
} from "./sanitize.js";

type SentryLike = {
  init: typeof Sentry.init;
  setTag: typeof Sentry.setTag;
  captureException: typeof Sentry.captureException;
};

let sentry: SentryLike = Sentry;
let initialized = false;

function readEnv(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const value = env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function isApiSentryConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(readEnv(env, "SENTRY_DSN"));
}

export function currentApiSentryEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): MonitoringEnvironment {
  return resolveMonitoringEnvironment({
    explicit: readEnv(env, "SENTRY_ENVIRONMENT"),
    vercelEnv: readEnv(env, "VERCEL_ENV"),
    nodeEnv: readEnv(env, "NODE_ENV"),
  });
}

export function currentApiSentryRelease(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return resolveMonitoringRelease({
    explicit: readEnv(env, "SENTRY_RELEASE"),
    vercelSha: readEnv(env, "VERCEL_GIT_COMMIT_SHA"),
  });
}

export function initApiSentry(env: NodeJS.ProcessEnv = process.env): boolean {
  if (initialized) {
    return isApiSentryConfigured(env);
  }
  if (!isApiSentryConfigured(env)) {
    return false;
  }

  const environment = currentApiSentryEnvironment(env);
  const release = currentApiSentryRelease(env);

  try {
    sentry.init({
      dsn: readEnv(env, "SENTRY_DSN"),
      environment,
      ...(release ? { release } : {}),
      ...PRIVACY_INIT_FLAGS,
      skipOpenTelemetrySetup: true,
      registerEsmLoaderHooks: false,
      includeLocalVariables: false,
      beforeSend(event) {
        return sanitizeSentryEvent(event as LooseSentryEvent) as typeof event;
      },
    });
    sentry.setTag("runtime", "api");
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export function reportApiException(
  error: unknown,
  context: { requestId?: string } = {},
): void {
  if (!initialized) {
    return;
  }
  try {
    const requestId = context.requestId?.trim();
    sentry.captureException(error, {
      tags: {
        runtime: "api",
        ...(requestId ? { request_id: requestId } : {}),
      },
    });
  } catch {
    // Monitoring must never change API responses.
  }
}

export function resetApiSentryForTests(next?: SentryLike): void {
  sentry = next ?? Sentry;
  initialized = false;
}
