/**
 * Tests for target-safety validation.
 */

import { describe, it, expect } from "vitest";
import {
  isLoopbackUrl,
  assertLoopbackUrl,
  assertNotHostedUrl,
  checkInheritedDbUrls,
} from "../target-safety.js";

describe("target-safety", () => {
  describe("isLoopbackUrl", () => {
    it("accepts localhost", () => {
      expect(isLoopbackUrl("http://localhost:5432")).toBe(true);
      expect(isLoopbackUrl("postgresql://localhost:5432/db")).toBe(true);
    });

    it("accepts 127.0.0.1", () => {
      expect(isLoopbackUrl("http://127.0.0.1:5432")).toBe(true);
      expect(isLoopbackUrl("postgresql://127.0.0.1:5432/db")).toBe(true);
    });

    it("accepts ::1 (bracketed IPv6)", () => {
      expect(isLoopbackUrl("http://[::1]:5432")).toBe(true);
    });

    it("rejects hosted URLs", () => {
      expect(isLoopbackUrl("https://db.supabase.co")).toBe(false);
      expect(isLoopbackUrl("postgresql://db.example.com:5432/db")).toBe(false);
      expect(isLoopbackUrl("postgres.aws.com")).toBe(false);
    });

    it("rejects invalid URLs", () => {
      expect(isLoopbackUrl("")).toBe(false);
      expect(isLoopbackUrl("not-a-url")).toBe(false);
      expect(isLoopbackUrl("   ")).toBe(false);
    });
  });

  describe("assertLoopbackUrl", () => {
    it("passes for loopback URLs", () => {
      expect(() => assertLoopbackUrl("TEST", "http://localhost:5432")).not.toThrow();
      expect(() => assertLoopbackUrl("TEST", "postgresql://127.0.0.1:5432/db")).not.toThrow();
    });

    it("throws for hosted URLs", () => {
      expect(() =>
        assertLoopbackUrl("TEST", "https://db.supabase.co")
      ).toThrowError("must use an exact loopback hostname");
    });

    it("throws for invalid URLs", () => {
      expect(() => assertLoopbackUrl("TEST", "not-a-url")).toThrowError(
        "must use an exact loopback hostname"
      );
    });
  });

  describe("assertNotHostedUrl", () => {
    it("passes for unset URLs", () => {
      expect(() => assertNotHostedUrl("TEST", "")).not.toThrow();
      expect(() => assertNotHostedUrl("TEST", undefined as any)).not.toThrow();
    });

    it("passes for loopback URLs", () => {
      expect(() =>
        assertNotHostedUrl("TEST", "http://localhost:5432")
      ).not.toThrow();
    });

    it("throws for hosted URLs", () => {
      expect(() =>
        assertNotHostedUrl("TEST", "https://db.supabase.co")
      ).toThrowError("appears to be a hosted/non-loopback URL");
    });
  });

  describe("checkInheritedDbUrls", () => {
    it("passes when both URLs are unset", () => {
      const result = checkInheritedDbUrls(undefined, undefined);
      expect(result.isSafe).toBe(true);
    });

    it("passes when both URLs are loopback", () => {
      const result = checkInheritedDbUrls(
        "postgresql://localhost:5432/db",
        "postgresql://127.0.0.1:5432/db"
      );
      expect(result.isSafe).toBe(true);
    });

    it("fails when DATABASE_URL is hosted", () => {
      const result = checkInheritedDbUrls(
        "postgresql://db.supabase.co:5432/db",
        undefined
      );
      expect(result.isSafe).toBe(false);
      expect(result.error).toContain("DATABASE_URL");
    });

    it("fails when DIRECT_DATABASE_URL is hosted", () => {
      const result = checkInheritedDbUrls(
        undefined,
        "postgresql://db.supabase.co:5432/db"
      );
      expect(result.isSafe).toBe(false);
      expect(result.error).toContain("DIRECT_DATABASE_URL");
    });

    it("fails when both URLs are hosted", () => {
      const result = checkInheritedDbUrls(
        "postgresql://db.supabase.co:5432/db",
        "postgresql://db.supabase.co:6543/db"
      );
      expect(result.isSafe).toBe(false);
      expect(result.error).toContain("DATABASE_URL");
      expect(result.error).toContain("DIRECT_DATABASE_URL");
    });
  });
});
