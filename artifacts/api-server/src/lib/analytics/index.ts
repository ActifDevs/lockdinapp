export {
  fireAndForgetAnalytics,
  isApiAnalyticsConfigured,
  trackAccountCreated,
  trackOnboardingCompleted,
  trackPastPaperAttemptCreated,
  trackTaskCreated,
  tryEmitUnknownEvent,
} from "./client.js";
export {
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
  isApprovedAnalyticsEvent,
  sanitizeApprovedEvent,
} from "./contract.js";
export { createAnalyticsAlias, createAnalyticsEventUuid } from "./alias.js";
