import { resolveMonitoringRelease } from "./environment.js";

export const API_SOURCEMAP_ASSETS = ["./dist/**"] as const;
export const API_SOURCEMAP_IGNORE = [
  "**/node_modules/**",
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/credentials.json",
] as const;

export function resolveDeploymentRelease(
  env: Record<string, string | undefined>,
): string | undefined {
  return resolveMonitoringRelease({
    explicit: env.SENTRY_RELEASE,
    vercelSha: env.VERCEL_GIT_COMMIT_SHA,
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

export function createApiSentryEsbuildPluginOptions(
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
    sourcemaps: {
      assets: [...API_SOURCEMAP_ASSETS],
      ignore: [...API_SOURCEMAP_IGNORE],
    },
    release: {
      name: release,
      inject: true,
      setCommits: false as const,
      deploy: false as const,
    },
  };
}
