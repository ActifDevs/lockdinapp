import type { CaptureResult, PostHogConfig } from "posthog-js";
import { filterBrowserCaptureEvent } from "./contract";

/**
 * Explicit privacy-minimizing PostHog browser init. Tests assert these values.
 * Heatmaps/surveys/replay remain off even if a project dashboard later enables them,
 * via `before_send` dropping non-allow-listed events.
 */
export const LOCKDIN_POSTHOG_INIT_OPTIONS: Partial<PostHogConfig> = {
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: false,
  capture_pageleave: false,
  disable_surveys: true,
  capture_heatmaps: false,
  enable_heatmaps: false,
  capture_exceptions: false,
  capture_dead_clicks: false,
  disable_scroll_properties: true,
  person_profiles: "never",
  save_campaign_params: false,
  save_referrer: false,
  capture_performance: false,
  ip: false,
  advanced_disable_feature_flags: true,
  disable_external_dependency_loading: true,
  mask_personal_data_properties: true,
  before_send: (event) =>
    filterBrowserCaptureEvent(event as CaptureResult) as CaptureResult | null,
};
