import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIVACY_INIT_FLAGS } from "./sanitize";
import {
  FORBIDDEN_CLIENT_SENTRY_AUTH_ENV,
  FRONTEND_FILES_TO_DELETE_AFTER_UPLOAD,
  FRONTEND_SOURCEMAP_ASSETS,
  applyFrontendDeploymentReleaseEnv,
  createFrontendSentryVitePluginOptions,
  shouldUploadSentrySourcemaps,
} from "./sourcemap-upload";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..", "..", "..");

describe("frontend Sentry source-map upload", () => {
  it("is skipped when the build-only token is missing", () => {
    expect(
      shouldUploadSentrySourcemaps({
        SENTRY_ORG: "lockdin",
        SENTRY_PROJECT: "lockdin-app",
        VERCEL_GIT_COMMIT_SHA: "abc123",
      }),
    ).toBe(false);
  });

  it("is skipped without a deployment SHA", () => {
    expect(
      shouldUploadSentrySourcemaps({
        SENTRY_AUTH_TOKEN: "sntrys_test",
        SENTRY_ORG: "lockdin",
        SENTRY_PROJECT: "lockdin-app",
      }),
    ).toBe(false);
  });

  it("requires token, org, project, and the same SHA used as release", () => {
    expect(
      shouldUploadSentrySourcemaps({
        SENTRY_AUTH_TOKEN: "sntrys_test",
        SENTRY_ORG: "lockdin",
        SENTRY_PROJECT: "lockdin-app",
        VERCEL_GIT_COMMIT_SHA: "abc123def",
      }),
    ).toBe(true);
  });

  it("copies Vercel SHA into VITE_VERCEL_GIT_COMMIT_SHA and never copies the token", () => {
    const env: Record<string, string | undefined> = {
      VERCEL_GIT_COMMIT_SHA: "deadbeef01",
      SENTRY_AUTH_TOKEN: "sntrys_must_stay_server",
    };
    applyFrontendDeploymentReleaseEnv(env);
    expect(env.VITE_VERCEL_GIT_COMMIT_SHA).toBe("deadbeef01");
    expect(env.VITE_SENTRY_AUTH_TOKEN).toBeUndefined();
    expect(FORBIDDEN_CLIENT_SENTRY_AUTH_ENV).toBe("VITE_SENTRY_AUTH_TOKEN");
  });

  it("binds upload to the deployment SHA and deletes public maps after upload", () => {
    const options = createFrontendSentryVitePluginOptions({
      SENTRY_AUTH_TOKEN: "sntrys_test",
      SENTRY_ORG: "lockdin",
      SENTRY_PROJECT: "lockdin-app",
      VERCEL_GIT_COMMIT_SHA: "cafebabe",
    });
    expect(options.release.name).toBe("cafebabe");
    expect(options.sourcemaps.assets).toEqual([...FRONTEND_SOURCEMAP_ASSETS]);
    expect(options.sourcemaps.filesToDeleteAfterUpload).toEqual([
      ...FRONTEND_FILES_TO_DELETE_AFTER_UPLOAD,
    ]);
    expect(options.sourcemaps.ignore).toEqual(
      expect.arrayContaining(["**/.env", "**/.env.*", "**/node_modules/**"]),
    );
    expect(options.telemetry).toBe(false);
    expect(options.bundleSizeOptimizations.excludeTracing).toBe(true);
    expect(options.bundleSizeOptimizations.excludeReplayWorker).toBe(true);
    expect(options.reactComponentAnnotation.enabled).toBe(false);
  });

  it("does not enable Replay, tracing, or profiling in SDK privacy flags", () => {
    expect(PRIVACY_INIT_FLAGS.replaysSessionSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.replaysOnErrorSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.tracesSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.profilesSampleRate).toBe(0);
  });

  it("never documents or defines a VITE_ Sentry auth token", () => {
    const envExample = readFileSync(join(repoRoot, ".env.example"), "utf8");
    const viteConfig = readFileSync(
      join(here, "..", "..", "..", "vite.config.ts"),
      "utf8",
    );
    expect(envExample).not.toMatch(/VITE_SENTRY_AUTH_TOKEN/);
    expect(viteConfig).not.toMatch(/VITE_SENTRY_AUTH_TOKEN/);
    expect(envExample).toMatch(/SENTRY_AUTH_TOKEN=/);
  });
});
