import test from "node:test";
import assert from "node:assert/strict";
import {
  isLoopbackUrl,
  assertLoopbackUrl,
} from "./require-local-supabase.mjs";

test("accepts localhost", () => {
  assert.equal(
    isLoopbackUrl("http://localhost:54321"),
    true,
  );
});

test("accepts IPv4 loopback", () => {
  assert.equal(
    isLoopbackUrl("http://127.0.0.1:54321"),
    true,
  );
});

test("accepts PostgreSQL IPv4 loopback", () => {
  assert.equal(
    isLoopbackUrl(
      "postgresql://postgres:test@127.0.0.1:54322/postgres",
    ),
    true,
  );
});

test("accepts IPv6 loopback", () => {
  assert.equal(
    isLoopbackUrl("http://[::1]:54321"),
    true,
  );
});

test("rejects hosted Supabase URL", () => {
  assert.equal(
    isLoopbackUrl("https://example.supabase.co"),
    false,
  );
});

test("rejects localhost inside a hosted path", () => {
  assert.equal(
    isLoopbackUrl(
      "https://example.supabase.co/localhost",
    ),
    false,
  );
});

test("rejects localhost inside a hosted query", () => {
  assert.equal(
    isLoopbackUrl(
      "https://example.supabase.co/?redirect=localhost",
    ),
    false,
  );
});

test("rejects misleading hosted hostname", () => {
  assert.equal(
    isLoopbackUrl(
      "https://localhost.example.com",
    ),
    false,
  );
});

test("rejects malformed URL", () => {
  assert.equal(
    isLoopbackUrl("not-a-url"),
    false,
  );
});

test("rejects missing URL", () => {
  assert.equal(isLoopbackUrl(""), false);
  assert.equal(isLoopbackUrl(undefined), false);
});

test("assertion does not expose the URL", () => {
  const privateValue =
    "postgresql://postgres:private-test-password@example.com:5432/db";

  assert.throws(
    () => assertLoopbackUrl("DB_URL", privateValue),
    (error) => {
      assert.equal(
        error.message,
        "[test:integration] DB_URL must use an exact loopback hostname",
      );

      assert.equal(
        error.message.includes("private-test-password"),
        false,
      );

      assert.equal(
        error.message.includes(privateValue),
        false,
      );

      return true;
    },
  );
});
