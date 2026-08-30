/**
 * Privacy-minimized Sentry event rewrite.
 * Stack-frame field names match @sentry/core StackFrame / Exception / Stacktrace.
 */

export const REDACTED_MESSAGE = "[redacted-message]";

const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOpaqueIdSegment(segment: string): boolean {
  return UUID_SEGMENT_RE.test(segment) || /^\d+$/.test(segment);
}

const ALLOWED_TAGS = new Set(["request_id", "runtime"]);

/** Official browser SDK breadcrumb categories we keep (fetch / xhr / navigation). */
const ALLOWED_BREADCRUMB_CATEGORIES = new Set([
  "navigation",
  "fetch",
  "xhr",
  "http",
]);

/**
 * Known static framework messages only. Unknown text fails closed.
 * Empty on purpose for Phase 7: Lockdin captures exceptions, not product copy.
 */
const ALLOWED_EXCEPTION_VALUES = new Set<string>();

export type LooseStackFrame = {
  filename?: string;
  function?: string;
  module?: string;
  platform?: string;
  lineno?: number;
  colno?: number;
  abs_path?: string;
  in_app?: boolean;
  vars?: Record<string, unknown>;
  context_line?: string;
  pre_context?: string[];
  post_context?: string[];
  instruction_addr?: string;
  addr_mode?: string;
  debug_id?: string;
  module_metadata?: unknown;
};

export type LooseException = {
  type?: string;
  value?: string;
  module?: string;
  thread_id?: number | string;
  mechanism?: { type?: string; handled?: boolean; data?: unknown };
  stacktrace?: {
    frames?: LooseStackFrame[];
    frames_omitted?: [number, number];
  };
};

export type LooseSentryEvent = {
  message?: string;
  exception?: { values?: LooseException[] };
  request?: Record<string, unknown>;
  user?: unknown;
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: Array<{
    type?: string;
    category?: string;
    level?: string;
    message?: string;
    timestamp?: number;
    data?: Record<string, unknown>;
  }>;
  contexts?: Record<string, unknown>;
  environment?: string;
  release?: string;
};

export function sanitizeRoutePath(raw: string): string {
  const withoutHash = raw.split("#")[0] ?? raw;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  const path = /^[a-z][a-z0-9+.-]*:/i.test(withoutQuery)
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

/** File paths stay intact; URL-like values lose query/fragment and opaque ids. */
export function sanitizeFramePath(raw: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.includes("?") || raw.includes("#")) {
    return sanitizeRoutePath(raw);
  }
  return raw;
}

export function sanitizeExceptionValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (ALLOWED_EXCEPTION_VALUES.has(value)) {
    return value;
  }
  return REDACTED_MESSAGE;
}

function sanitizeStackFrame(frame: LooseStackFrame): LooseStackFrame {
  const next: LooseStackFrame = {};
  if (typeof frame.function === "string") {
    next.function = frame.function;
  }
  if (typeof frame.module === "string") {
    next.module = frame.module;
  }
  if (typeof frame.filename === "string") {
    next.filename = sanitizeFramePath(frame.filename);
  }
  if (typeof frame.abs_path === "string") {
    next.abs_path = sanitizeFramePath(frame.abs_path);
  }
  if (typeof frame.lineno === "number") {
    next.lineno = frame.lineno;
  }
  if (typeof frame.colno === "number") {
    next.colno = frame.colno;
  }
  if (typeof frame.in_app === "boolean") {
    next.in_app = frame.in_app;
  }
  if (typeof frame.platform === "string") {
    next.platform = frame.platform;
  }
  return next;
}

export function sanitizeSentryEvent(event: LooseSentryEvent): LooseSentryEvent {
  const next: LooseSentryEvent = {
    environment: event.environment,
    release: event.release,
  };

  if (event.exception?.values) {
    next.exception = {
      values: event.exception.values.map((item) => {
        const sanitized: LooseException = {
          type: item.type,
          value: sanitizeExceptionValue(item.value),
        };
        if (item.stacktrace?.frames) {
          sanitized.stacktrace = {
            frames: item.stacktrace.frames.map(sanitizeStackFrame),
            ...(item.stacktrace.frames_omitted
              ? { frames_omitted: item.stacktrace.frames_omitted }
              : {}),
          };
        }
        return sanitized;
      }),
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

  if (event.breadcrumbs?.length) {
    const crumbs = event.breadcrumbs
      .filter((crumb) => crumb.category && ALLOWED_BREADCRUMB_CATEGORIES.has(crumb.category))
      .map((crumb) => ({
        category: crumb.category,
        timestamp: crumb.timestamp,
        data: sanitizeBreadcrumbData(crumb.data),
      }));
    if (crumbs.length) {
      next.breadcrumbs = crumbs;
    }
  }

  return next;
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
  if (typeof data.from === "string") {
    next.from = sanitizeRoutePath(data.from);
  }
  if (typeof data.to === "string") {
    next.to = sanitizeRoutePath(data.to);
  }
  if (typeof data.method === "string") {
    next.method = data.method;
  }
  if (typeof data.status_code === "number") {
    next.status_code = data.status_code;
  }
  return Object.keys(next).length ? next : undefined;
}

export function isDiagnosticBreadcrumbCategory(
  category: string | undefined,
): boolean {
  return Boolean(category && ALLOWED_BREADCRUMB_CATEGORIES.has(category));
}

export const PRIVACY_INIT_FLAGS = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  enableLogs: false,
} as const;
