import { describe, expect, it } from "vitest";
import { createAnalyticsAlias, createAnalyticsEventUuid } from "./alias.js";

const SECRET = "unit-test-alias-secret";
const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("analytics alias", () => {
  it("is deterministic for the same user and secret", () => {
    expect(createAnalyticsAlias(USER_A, SECRET)).toBe(
      createAnalyticsAlias(USER_A, SECRET),
    );
  });

  it("differs across users and is not the raw UUID", () => {
    const aliasA = createAnalyticsAlias(USER_A, SECRET);
    const aliasB = createAnalyticsAlias(USER_B, SECRET);
    expect(aliasA).not.toBe(aliasB);
    expect(aliasA).not.toBe(USER_A);
    expect(aliasA?.includes(USER_A)).toBe(false);
    expect(aliasA?.startsWith("lockdin_ph_")).toBe(true);
  });

  it("refuses a missing or short secret", () => {
    expect(createAnalyticsAlias(USER_A, "")).toBeNull();
    expect(createAnalyticsAlias(USER_A, "short")).toBeNull();
  });

  it("derives a stable event UUID that is not the raw user id", () => {
    const uuid = createAnalyticsEventUuid(USER_A, "account_created", SECRET);
    expect(uuid).toBe(
      createAnalyticsEventUuid(USER_A, "account_created", SECRET),
    );
    expect(uuid).not.toBe(USER_A);
    expect(uuid?.includes(USER_A)).toBe(false);
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(createAnalyticsEventUuid(USER_B, "account_created", SECRET)).not.toBe(
      uuid,
    );
  });
});
