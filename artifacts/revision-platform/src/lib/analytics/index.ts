export { LOCKDIN_POSTHOG_INIT_OPTIONS } from "./browser-config";
export {
  emitAccountCreatedIfPending,
  isBrowserAnalyticsConfigured,
  noteLocalSignup,
  resetAnalyticsIdentity,
  trackAccountCreated,
  tryEmitUnknownEvent,
} from "./client";
export {
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
  filterBrowserCaptureEvent,
  isApprovedAnalyticsEvent,
  sanitizeApprovedEvent,
} from "./contract";
export {
  hasEmittedAccountCreated,
  markPendingAccountCreated,
  shouldEmitAccountCreated,
} from "./pending-signup";
