import { resolveMonitoringRelease } from "./environment";

export const FORBIDDEN_CLIENT_SENTRY_AUTH_ENV = "VITE_SENTRY_AUTH_TOKEN";

export const FRONTEND_SOURCEMAP_ASSETS = ["./dist/public/**"] as const;
export const FRONTEND_SOURCEMAP_IGNORE = [
  "**/node_modules/**",
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/credentials.json",
] as const;
export const FRONTEND_FILES_TO_DELETE_AFTER_UPLOAD = [
  "./dist/public/**/*.map",
] as const;

export function resolveDeploymentRelease(
  env: Record<string, string | undefined>,
): string | undefined {
  return resolveMonitoringRelease({
    explicit: env.SENTRY_RELEASE || env.VITE_SENTRY_RELEASE,
    vercelSha: env.VERCEL_GIT_COMMIT_SHA || env.VITE_VERCEL_GIT_COMMIT_SHA,
  });
}

export function shouldUploadSentrySourcemaps(
  env: Record<string, string | undefined>,
): boolean {
  return Boolean(
    env.SENTRY_AUTH_TOKEN?.trim() &&
      env.SENTRY_ORG?.trim() &&
      env.SENTRY_PROJECT?.trim() &&
      resolveDeploymentRelease(env),
  );
}

/** Copy server/build SHA into Vite-visible names. Never copies the auth token. */
export function applyFrontendDeploymentReleaseEnv(
  env: Record<string, string | undefined>,
): void {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (sha && !env.VITE_VERCEL_GIT_COMMIT_SHA?.trim()) {
    env.VITE_VERCEL_GIT_COMMIT_SHA = sha;
  }
  const release = env.SENTRY_RELEASE?.trim();
  if (release && !env.VITE_SENTRY_RELEASE?.trim()) {
    env.VITE_SENTRY_RELEASE = release;
  }
}

export function createFrontendSentryVitePluginOptions(
  env: Record<string, string | undefined>,
) {
  const release = resolveDeploymentRelease(env);
  if (!release) {
    throw new Error("Sentry source-map upload requires a deployment SHA release.");
  }
  return {
    org: env.SENTRY_ORG!.trim(),
    project: env.SENTRY_PROJECT!.trim(),
    authToken: env.SENTRY_AUTH_TOKEN!.trim(),
    telemetry: false,
    debug: false,
    reactComponentAnnotation: { enabled: false },
    bundleSizeOptimizations: {
      excludeTracing: true,
      excludeReplayIframe: true,
      excludeReplayShadowDom: true,
      excludeReplayWorker: true,
    },
    sourcemaps: {
      assets: [...FRONTEND_SOURCEMAP_ASSETS],
      ignore: [...FRONTEND_SOURCEMAP_IGNORE],
      filesToDeleteAfterUpload: [...FRONTEND_FILES_TO_DELETE_AFTER_UPLOAD],
    },
    release: {
      name: release,
      inject: true,
      setCommits: false as const,
      deploy: false as const,
    },
  };
}
