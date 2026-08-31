import { describe, expect, it } from "vitest";
import { PRIVACY_INIT_FLAGS } from "./sanitize.js";
import {
  API_SOURCEMAP_ASSETS,
  createApiSentryEsbuildPluginOptions,
  shouldUploadSentrySourcemaps,
} from "./sourcemap-upload.js";

describe("API Sentry source-map upload", () => {
  it("is skipped when the build-only token is missing", () => {
    expect(
      shouldUploadSentrySourcemaps({
        SENTRY_ORG: "lockdin",
        SENTRY_PROJECT: "lockdin-app",
        VERCEL_GIT_COMMIT_SHA: "abc123",
      }),
    ).toBe(false);
  });

  it("uses VERCEL_GIT_COMMIT_SHA as the release when uploading", () => {
    const options = createApiSentryEsbuildPluginOptions({
      SENTRY_AUTH_TOKEN: "sntrys_test",
      SENTRY_ORG: "lockdin",
      SENTRY_PROJECT: "lockdin-app",
      VERCEL_GIT_COMMIT_SHA: "abc123def",
    });
    expect(options.release.name).toBe("abc123def");
    expect(options.sourcemaps.assets).toEqual([...API_SOURCEMAP_ASSETS]);
    expect(
      (options.sourcemaps as { filesToDeleteAfterUpload?: unknown })
        .filesToDeleteAfterUpload,
    ).toBeUndefined();
    expect(options.sourcemaps.ignore).toEqual(
      expect.arrayContaining(["**/.env", "**/node_modules/**"]),
    );
    expect(PRIVACY_INIT_FLAGS.tracesSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.profilesSampleRate).toBe(0);
  });
});
