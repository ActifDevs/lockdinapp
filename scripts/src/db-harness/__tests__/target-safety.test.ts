import { describe, expect, it } from "vitest";
import {
  checkDestructiveTarget,
  checkInheritedDbUrls,
  isLoopbackUrl,
} from "../target-safety.js";

const dedicatedTarget = {
  apiUrl: "http://127.0.0.1:55421",
  dbUrl: "postgresql://postgres:local-only@127.0.0.1:55422/postgres",
  runningProjectId: "lockdin-db-harness",
  expectedProjectId: "lockdin-db-harness",
  destructiveAuthorization: "1",
};

describe("isLoopbackUrl", () => {
  it.each([
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
    "postgresql://user:pass@localhost:54322/postgres",
    "postgresql://user:pass@127.0.0.1:54322/postgres",
  ])("accepts exact loopback URL %s", (value) => {
    expect(isLoopbackUrl(value)).toBe(true);
  });

  it.each([
    "https://project.supabase.co",
    "postgresql://user:pass@db.project.supabase.co:5432/postgres",
    "http://192.168.1.10:54321",
    "http://localhost.example.com:54321",
    "not-a-url",
    "",
  ])("rejects non-loopback or malformed URL %s", (value) => {
    expect(isLoopbackUrl(value)).toBe(false);
  });
});

describe("checkInheritedDbUrls", () => {
  it("accepts unset inherited URLs", () => {
    expect(checkInheritedDbUrls(undefined, undefined)).toEqual({
      isSafe: true,
    });
  });

  it("accepts loopback inherited URLs", () => {
    expect(
      checkInheritedDbUrls(
        "postgresql://user:pass@127.0.0.1:55422/postgres",
        "postgresql://user:pass@localhost:55422/postgres",
      ),
    ).toEqual({ isSafe: true });
  });

  it("rejects a hosted runtime target without echoing it", () => {
    const result = checkInheritedDbUrls(
      "postgresql://secret@db.example.supabase.co/postgres",
      undefined,
    );
    expect(result.isSafe).toBe(false);
    expect(result.error).toContain("not loopback");
    expect(result.error).not.toContain("secret");
  });
});

describe("checkDestructiveTarget", () => {
  it("accepts the verified dedicated identity", () => {
    expect(checkDestructiveTarget(dedicatedTarget)).toEqual({ isSafe: true });
  });

  it("rejects the normal Lockdin identity even with explicit opt-in", () => {
    const result = checkDestructiveTarget({
      ...dedicatedTarget,
      runningProjectId: "lockedinapp",
    });
    expect(result.isSafe).toBe(false);
    expect(result.error).toContain("identity mismatch");
  });

  it("rejects an absent explicit opt-in", () => {
    const result = checkDestructiveTarget({
      ...dedicatedTarget,
      destructiveAuthorization: undefined,
    });
    expect(result.isSafe).toBe(false);
    expect(result.error).toContain("authorization is absent");
  });

  it("rejects a hosted API endpoint", () => {
    const result = checkDestructiveTarget({
      ...dedicatedTarget,
      apiUrl: "https://project.supabase.co",
    });
    expect(result.isSafe).toBe(false);
    expect(result.error).toContain("not loopback");
  });

  it("rejects a hosted database endpoint without echoing credentials", () => {
    const result = checkDestructiveTarget({
      ...dedicatedTarget,
      dbUrl: "postgresql://secret@db.project.supabase.co/postgres",
    });
    expect(result.isSafe).toBe(false);
    expect(result.error).toContain("not loopback");
    expect(result.error).not.toContain("secret");
  });

  it("accepts dedicated identity plus loopback plus explicit opt-in", () => {
    const result = checkDestructiveTarget({
      ...dedicatedTarget,
      apiUrl: "http://localhost:55421",
      dbUrl: "postgresql://postgres:local-only@[::1]:55422/postgres",
    });
    expect(result).toEqual({ isSafe: true });
  });
});
