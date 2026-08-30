import { PostHog } from "posthog-node";
import { logger } from "../logger.js";
import { createAnalyticsAlias } from "./alias.js";
import {
  resolveAnalyticsEnvironment,
  sanitizeApprovedEvent,
  type AnalyticsEnvironment,
  type ApprovedEventProperties,
} from "./contract.js";

const CAPTURE_BUDGET_MS = 800;

type PostHogLike = {
  captureImmediate: (input: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
  }) => Promise<void>;
};

let client: PostHogLike | null | undefined;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function isApiAnalyticsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.POSTHOG_PROJECT_TOKEN?.trim() &&
      env.POSTHOG_HOST?.trim() &&
      env.LOCKDIN_ANALYTICS_ALIAS_SECRET &&
      env.LOCKDIN_ANALYTICS_ALIAS_SECRET.length >= 16,
  );
}

export function currentApiAnalyticsEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AnalyticsEnvironment {
  return resolveAnalyticsEnvironment({
    explicit: env.LOCKDIN_ANALYTICS_ENV,
    vercelEnv: env.VERCEL_ENV,
    nodeEnv: env.NODE_ENV,
  });
}

export function getApiAnalyticsClient(): PostHogLike | null {
  if (client !== undefined) {
    return client;
  }
  if (!isApiAnalyticsConfigured()) {
    client = null;
    return client;
  }
  client = new PostHog(process.env.POSTHOG_PROJECT_TOKEN!.trim(), {
    host: process.env.POSTHOG_HOST!.trim(),
    disableGeoip: true,
    enableExceptionAutocapture: false,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

export function setApiAnalyticsClientForTests(next: PostHogLike | null | undefined): void {
  client = next;
}

function withTimeout(work: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    void work
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}

async function captureApproved<E extends keyof ApprovedEventProperties>(
  event: E,
  properties: ApprovedEventProperties[E],
  userId: string,
): Promise<void> {
  const sanitized = sanitizeApprovedEvent(event, properties);
  if (!sanitized) {
    return;
  }
  const secret = readEnv("LOCKDIN_ANALYTICS_ALIAS_SECRET");
  if (!secret) {
    return;
  }
  const distinctId = createAnalyticsAlias(userId, secret);
  if (!distinctId) {
    return;
  }
  const ph = getApiAnalyticsClient();
  if (!ph) {
    return;
  }
  try {
    await withTimeout(
      ph.captureImmediate({
        distinctId,
        event: sanitized.event,
        properties: {
          ...sanitized.properties,
          $process_person_profile: false,
        },
      }),
      CAPTURE_BUDGET_MS,
    );
  } catch {
    logger.info({ context: "analytics", event: sanitized.event }, "analytics capture skipped");
  }
}

export async function fireAndForgetAnalytics(
  work: () => Promise<void>,
): Promise<void> {
  try {
    await work();
  } catch {
    logger.info({ context: "analytics" }, "analytics capture skipped");
  }
}

export async function trackOnboardingCompleted(input: {
  userId: string;
  subjectCount: number;
}): Promise<void> {
  await captureApproved(
    "onboarding_completed",
    {
      environment: currentApiAnalyticsEnvironment(),
      subject_count: input.subjectCount,
    },
    input.userId,
  );
}

export async function trackTaskCreated(input: { userId: string }): Promise<void> {
  await captureApproved(
    "task_created",
    { environment: currentApiAnalyticsEnvironment() },
    input.userId,
  );
}

export async function trackPastPaperAttemptCreated(input: {
  userId: string;
}): Promise<void> {
  await captureApproved(
    "past_paper_attempt_created",
    { environment: currentApiAnalyticsEnvironment() },
    input.userId,
  );
}

export function tryEmitUnknownEvent(
  eventName: string,
  properties: Record<string, unknown>,
): boolean {
  return sanitizeApprovedEvent(eventName, properties) !== null;
}
