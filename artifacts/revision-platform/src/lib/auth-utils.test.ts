import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";
import {
  __resetSupabaseBrowserClientForTests,
  getSupabaseBrowserClient,
} from "./supabase-browser";
import { getUpcomingExamSessions } from "./exam-sessions";

describe("getAppUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds absolute URLs for root BASE_URL", () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:5173" } });
    // @ts-expect-error vitest env stub
    import.meta.env.BASE_URL = "/";
    expect(getAppUrl("/auth/callback")).toBe("http://localhost:5173/auth/callback");
  });

  it("respects non-root BASE_URL", () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:5173" } });
    // @ts-expect-error vitest env stub
    import.meta.env.BASE_URL = "/app/";
    expect(getAppUrl("auth/callback")).toBe("http://localhost:5173/app/auth/callback");
  });
});

describe("getUpcomingExamSessions", () => {
  it("returns chronologically upcoming May/June and Oct/Nov windows", () => {
    const sessions = getUpcomingExamSessions(new Date("2026-03-15T12:00:00Z"));
    expect(sessions).toEqual([
      "May/June 2026",
      "Oct/Nov 2026",
      "May/June 2027",
      "Oct/Nov 2027",
    ]);
  });

  it("skips May/June after June ends", () => {
    const sessions = getUpcomingExamSessions(new Date("2026-07-01T12:00:00Z"));
    expect(sessions[0]).toBe("Oct/Nov 2026");
    expect(sessions).toHaveLength(4);
  });

  it("rolls to next May/June after November", () => {
    const sessions = getUpcomingExamSessions(new Date("2026-12-01T12:00:00Z"));
    expect(sessions[0]).toBe("May/June 2027");
  });
});

describe("getSupabaseBrowserClient", () => {
  afterEach(() => {
    __resetSupabaseBrowserClientForTests();
    // @ts-expect-error clear
    import.meta.env.VITE_SUPABASE_URL = "";
    // @ts-expect-error clear
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "";
  });

  it("fails safely when URL is missing without printing values", () => {
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_URL = "";
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "not-a-secret-for-assert";
    expect(() => getSupabaseBrowserClient()).toThrow(/VITE_SUPABASE_URL/);
    try {
      getSupabaseBrowserClient();
    } catch (err) {
      expect(String(err)).not.toContain("not-a-secret-for-assert");
    }
  });

  it("fails safely when publishable key is missing", () => {
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_URL = "http://127.0.0.1:54321";
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "";
    expect(() => getSupabaseBrowserClient()).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("reuses a single browser client", () => {
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_URL = "http://127.0.0.1:54321";
    // @ts-expect-error stub
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";
    const a = getSupabaseBrowserClient();
    const b = getSupabaseBrowserClient();
    expect(a).toBe(b);
  });
});
