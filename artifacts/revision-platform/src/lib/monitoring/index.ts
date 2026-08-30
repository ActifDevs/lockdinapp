export {
  createUncaughtErrorHandler,
  currentFrontendSentryEnvironment,
  currentFrontendSentryRelease,
  initFrontendSentry,
  isFrontendSentryConfigured,
  reportBoundaryError,
  resetFrontendSentryForTests,
} from "./client";
export {
  resolveMonitoringEnvironment,
  resolveMonitoringRelease,
} from "./environment";
export {
  PRIVACY_INIT_FLAGS,
  redactSensitiveText,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize";
