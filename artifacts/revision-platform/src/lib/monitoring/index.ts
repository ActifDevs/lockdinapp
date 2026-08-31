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
  applyFrontendDeploymentReleaseEnv,
  shouldUploadSentrySourcemaps,
} from "./sourcemap-upload";
export {
  PRIVACY_INIT_FLAGS,
  REDACTED_MESSAGE,
  isDiagnosticBreadcrumbCategory,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize";
