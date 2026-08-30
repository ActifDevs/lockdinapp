import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
  filterBrowserCaptureEvent,
  isApprovedAnalyticsEvent,
  sanitizeApprovedEvent,
} from "./contract";
import { LOCKDIN_POSTHOG_INIT_OPTIONS } from "./browser-config";

describe("frontend analytics contract", () => {
  it("rejects unknown event names", () => {
    expect(isApprovedAnalyticsEvent("first_past_paper_attempt")).toBe(false);
    expect(
      sanitizeApprovedEvent("subject_completed", { environment: "production" }),
    ).toBeNull();
  });

  it("drops automatic PostHog collection events", () => {
    expect(filterBrowserCaptureEvent({ event: "$pageview", properties: {} })).toBeNull();
    expect(
      filterBrowserCaptureEvent({ event: "$pageleave", properties: {} }),
    ).toBeNull();
    expect(
      filterBrowserCaptureEvent({ event: "$autocapture", properties: {} }),
    ).toBeNull();
    expect(
      filterBrowserCaptureEvent({ event: "$exception", properties: {} }),
    ).toBeNull();
  });

  it("strips URL, email, and study content from custom events", () => {
    const filtered = filterBrowserCaptureEvent({
      event: "account_created",
      properties: {
        environment: "preview",
        email: "ada@example.com",
        $current_url: "https://app.example/signup?token=secret",
        username: "ada",
      },
    });
    expect(filtered).toEqual({
      event: "account_created",
      properties: { environment: "preview" },
    });
    expect(JSON.stringify(filtered)).not.toMatch(/ada@|token=secret/);
    expect(FORBIDDEN_ANALYTICS_PROPERTY_KEYS).toContain("email");
  });

  it("disables automatic PostHog collection in init options", () => {
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.autocapture).toBe(false);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.disable_session_recording).toBe(true);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.capture_pageview).toBe(false);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.capture_pageleave).toBe(false);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.disable_surveys).toBe(true);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.capture_heatmaps).toBe(false);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.capture_exceptions).toBe(false);
    expect(LOCKDIN_POSTHOG_INIT_OPTIONS.person_profiles).toBe("never");
  });
});
