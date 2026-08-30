import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_ANALYTICS_PROPERTY_KEYS,
  isApprovedAnalyticsEvent,
  resolveAnalyticsEnvironment,
  sanitizeApprovedEvent,
} from "./contract.js";

describe("analytics contract", () => {
  it("rejects unknown event names", () => {
    expect(isApprovedAnalyticsEvent("first_task_created")).toBe(false);
    expect(isApprovedAnalyticsEvent("streak_achieved")).toBe(false);
    expect(
      sanitizeApprovedEvent("first_task_created", { environment: "production" }),
    ).toBeNull();
  });

  it("accepts only approved property shapes", () => {
    expect(
      sanitizeApprovedEvent("account_created", { environment: "preview" }),
    ).toEqual({
      event: "account_created",
      properties: { environment: "preview" },
    });
    expect(
      sanitizeApprovedEvent("onboarding_completed", {
        environment: "production",
        subject_count: 3,
      }),
    ).toEqual({
      event: "onboarding_completed",
      properties: { environment: "production", subject_count: 3 },
    });
    expect(
      sanitizeApprovedEvent("task_created", { environment: "development" }),
    ).toMatchObject({ event: "task_created" });
    expect(
      sanitizeApprovedEvent("past_paper_attempt_created", {
        environment: "production",
      }),
    ).toMatchObject({ event: "past_paper_attempt_created" });
  });

  it("drops forbidden properties instead of forwarding them", () => {
    const sanitized = sanitizeApprovedEvent("task_created", {
      environment: "production",
      email: "ada@example.com",
      title: "Revise algebra",
      notes: "secret",
      score: 90,
      userId: "raw-uuid",
    });
    expect(sanitized?.properties).toEqual({ environment: "production" });
    expect(JSON.stringify(sanitized)).not.toMatch(/ada@example.com|Revise algebra|secret|raw-uuid/);
    for (const key of ["email", "title", "notes", "score"] as const) {
      expect(FORBIDDEN_ANALYTICS_PROPERTY_KEYS).toContain(key);
    }
  });

  it("rejects incomplete or invalid allow-listed values", () => {
    expect(sanitizeApprovedEvent("task_created", {})).toBeNull();
    expect(
      sanitizeApprovedEvent("onboarding_completed", {
        environment: "production",
        subject_count: 1.5,
      }),
    ).toBeNull();
    expect(
      sanitizeApprovedEvent("onboarding_completed", {
        environment: "production",
        subject_count: "2",
      }),
    ).toBeNull();
  });

  it("maps preview vs production from Vercel without a hardcoded project", () => {
    expect(
      resolveAnalyticsEnvironment({ vercelEnv: "preview" }),
    ).toBe("preview");
    expect(
      resolveAnalyticsEnvironment({ vercelEnv: "production" }),
    ).toBe("production");
    expect(resolveAnalyticsEnvironment({})).toBe("development");
  });
});
