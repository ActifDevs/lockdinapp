const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_RE = /Bearer\s+\S+/gi;
const PG_URL_RE = /\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi;
const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOpaqueIdSegment(segment: string): boolean {
  return UUID_SEGMENT_RE.test(segment) || /^\d+$/.test(segment);
}

const FORBIDDEN_KEY_RE =
  /^(authorization|cookie|set-cookie|password|passwd|secret|token|access_token|refresh_token|jwt|email|e-mail|full_name|fullname|username|name|title|notes|note|syllabus|learning.?outcome|subject|topic|score|marks?|percentage|percent|database_url|direct_database_url|sql|body|query|user_id|userid|distinctid)$/i;

const ALLOWED_TAGS = new Set(["request_id", "runtime"]);

export type LooseSentryEvent = {
  message?: string;
  exception?: { values?: Array<{ type?: string; value?: string }> };
  request?: Record<string, unknown>;
  user?: unknown;
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
  contexts?: Record<string, unknown>;
  environment?: string;
  release?: string;
};

export function redactSensitiveText(value: string): string {
  const redacted = value
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(JWT_RE, "[redacted-jwt]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(PG_URL_RE, "[redacted-database-url]");
  if (/\b(title|notes|syllabus|score|marks|percentage|email|username|password)\s*[:=]/i.test(redacted)) {
    return "[redacted-message]";
  }
  return redacted;
}

export function sanitizeRoutePath(raw: string): string {
  const withoutHash = raw.split("#")[0] ?? raw;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  const path = withoutQuery.startsWith("http")
    ? safeUrlPath(withoutQuery)
    : withoutQuery;
  const parts = path.split("/").filter(Boolean);
  const sanitized = parts.map((segment) =>
    isOpaqueIdSegment(segment) ? ":id" : segment,
  );
  return `/${sanitized.join("/")}` || "/";
}

function safeUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? "/";
  }
}

function dropForbiddenKeys(
  input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!input) {
    return undefined;
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEY_RE.test(key)) {
      continue;
    }
    if (typeof value === "string") {
      next[key] = redactSensitiveText(value);
    }
  }
  return Object.keys(next).length ? next : undefined;
}

export function sanitizeSentryEvent(event: LooseSentryEvent): LooseSentryEvent {
  const next: LooseSentryEvent = {
    environment: event.environment,
    release: event.release,
  };

  if (event.message) {
    next.message = redactSensitiveText(event.message);
  }

  if (event.exception?.values) {
    next.exception = {
      values: event.exception.values.map((item) => ({
        type: item.type,
        value: item.value ? redactSensitiveText(item.value) : item.value,
      })),
    };
  }

  if (event.request && typeof event.request === "object") {
    const method =
      typeof event.request.method === "string" ? event.request.method : undefined;
    const rawUrl =
      typeof event.request.url === "string" ? event.request.url : undefined;
    next.request = {
      ...(method ? { method } : {}),
      ...(rawUrl ? { url: sanitizeRoutePath(rawUrl) } : {}),
    };
  }

  if (event.tags) {
    const tags: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.tags)) {
      if (ALLOWED_TAGS.has(key) && (typeof value === "string" || typeof value === "number")) {
        tags[key] = String(value);
      }
    }
    if (Object.keys(tags).length) {
      next.tags = tags;
    }
  }

  next.extra = dropForbiddenKeys(event.extra);
  delete next.user;

  if (event.breadcrumbs?.length) {
    next.breadcrumbs = event.breadcrumbs
      .filter((crumb) => crumb.category !== "http" || !hasSensitiveBreadcrumb(crumb))
      .map((crumb) => ({
        category: crumb.category,
        message: crumb.message ? redactSensitiveText(crumb.message) : crumb.message,
        data: sanitizeBreadcrumbData(crumb.data),
      }));
  }

  return next;
}

function hasSensitiveBreadcrumb(crumb: {
  data?: Record<string, unknown>;
}): boolean {
  const data = crumb.data ?? {};
  return ["authorization", "cookie", "body", "request_body"].some(
    (key) => key in data,
  );
}

function sanitizeBreadcrumbData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) {
    return undefined;
  }
  const next: Record<string, unknown> = {};
  if (typeof data.url === "string") {
    next.url = sanitizeRoutePath(data.url);
  }
  if (typeof data.method === "string") {
    next.method = data.method;
  }
  if (typeof data.status_code === "number") {
    next.status_code = data.status_code;
  }
  return Object.keys(next).length ? next : undefined;
}

export const PRIVACY_INIT_FLAGS = {
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  enableLogs: false,
} as const;
