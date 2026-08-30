export const APPROVED_ANALYTICS_EVENTS = [
  "account_created",
  "onboarding_completed",
  "task_created",
  "past_paper_attempt_created",
] as const;

export type ApprovedAnalyticsEvent = (typeof APPROVED_ANALYTICS_EVENTS)[number];

export const ANALYTICS_ENVIRONMENTS = [
  "development",
  "preview",
  "production",
] as const;

export type AnalyticsEnvironment = (typeof ANALYTICS_ENVIRONMENTS)[number];

export const EVENT_ALLOWED_PROPERTIES = {
  account_created: ["environment"],
  onboarding_completed: ["environment", "subject_count"],
  task_created: ["environment"],
  past_paper_attempt_created: ["environment"],
} as const satisfies Record<ApprovedAnalyticsEvent, readonly string[]>;

export const FORBIDDEN_ANALYTICS_PROPERTY_KEYS = [
  "email",
  "full_name",
  "fullName",
  "name",
  "username",
  "password",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "jwt",
  "Authorization",
  "authorization",
  "cookie",
  "title",
  "notes",
  "deadline",
  "dueDate",
  "syllabus",
  "learningOutcome",
  "subjectName",
  "subjectId",
  "subject_id",
  "topicId",
  "topic_id",
  "topicTitle",
  "score",
  "marks",
  "totalMarks",
  "percentage",
  "year",
  "paperCode",
  "paper_code",
  "componentId",
  "component_id",
  "session",
  "variant",
  "userId",
  "user_id",
  "distinctId",
  "databaseUrl",
  "DATABASE_URL",
  "sql",
] as const;

const APPROVED_EVENT_SET = new Set<string>(APPROVED_ANALYTICS_EVENTS);
const ENVIRONMENT_SET = new Set<string>(ANALYTICS_ENVIRONMENTS);

export function isApprovedAnalyticsEvent(
  eventName: string,
): eventName is ApprovedAnalyticsEvent {
  return APPROVED_EVENT_SET.has(eventName);
}

export function isAnalyticsEnvironment(
  value: string,
): value is AnalyticsEnvironment {
  return ENVIRONMENT_SET.has(value);
}

export function resolveAnalyticsEnvironment(input: {
  explicit?: string | undefined;
  vercelEnv?: string | undefined;
  nodeEnv?: string | undefined;
}): AnalyticsEnvironment {
  const explicit = input.explicit?.trim().toLowerCase();
  if (explicit && isAnalyticsEnvironment(explicit)) {
    return explicit;
  }
  const vercel = input.vercelEnv?.trim().toLowerCase();
  if (vercel && isAnalyticsEnvironment(vercel)) {
    return vercel;
  }
  if (input.nodeEnv === "production") {
    return "production";
  }
  return "development";
}

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_ANALYTICS_PROPERTY_KEYS);

export function isForbiddenAnalyticsPropertyKey(key: string): boolean {
  return FORBIDDEN_SET.has(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeSubjectCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function sanitizeApprovedEvent(
  eventName: string,
  properties: unknown,
): { event: ApprovedAnalyticsEvent; properties: Record<string, unknown> } | null {
  if (!isApprovedAnalyticsEvent(eventName)) {
    return null;
  }

  if (!isPlainObject(properties)) {
    return null;
  }

  const allowed = EVENT_ALLOWED_PROPERTIES[eventName];
  const next: Record<string, unknown> = {};

  for (const key of allowed) {
    if (isForbiddenAnalyticsPropertyKey(key)) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      return null;
    }
    const value = properties[key];
    if (key === "environment") {
      if (typeof value !== "string" || !isAnalyticsEnvironment(value)) {
        return null;
      }
      next.environment = value;
      continue;
    }
    if (key === "subject_count") {
      const count = sanitizeSubjectCount(value);
      if (count === null) {
        return null;
      }
      next.subject_count = count;
    }
  }

  return { event: eventName, properties: next };
}

export type CaptureLike = {
  event?: string;
  properties?: Record<string, unknown>;
};

/**
 * Drop automatic PostHog events and strip every property except the allow-list.
 */
export function filterBrowserCaptureEvent(
  event: CaptureLike | null | undefined,
): CaptureLike | null {
  if (!event || typeof event.event !== "string") {
    return null;
  }
  if (!isApprovedAnalyticsEvent(event.event)) {
    return null;
  }
  const sanitized = sanitizeApprovedEvent(event.event, event.properties ?? {});
  if (!sanitized) {
    return null;
  }
  return {
    event: sanitized.event,
    properties: sanitized.properties,
  };
}
