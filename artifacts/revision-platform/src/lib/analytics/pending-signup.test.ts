import { beforeEach, describe, expect, it } from "vitest";
import {
  hasEmittedAccountCreated,
  markAccountCreatedEmitted,
  markPendingAccountCreated,
  shouldEmitAccountCreated,
} from "./pending-signup";

describe("pending signup account_created", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not emit on ordinary login", () => {
    expect(shouldEmitAccountCreated("user-a")).toBe(false);
  });

  it("emits once after pending signup then authenticated session", () => {
    markPendingAccountCreated("user-a");
    expect(shouldEmitAccountCreated("user-a")).toBe(true);
    markAccountCreatedEmitted("user-a");
    expect(shouldEmitAccountCreated("user-a")).toBe(false);
    expect(hasEmittedAccountCreated("user-a")).toBe(true);
  });

  it("does not emit for a different user than the pending signup", () => {
    markPendingAccountCreated("user-a");
    expect(shouldEmitAccountCreated("user-b")).toBe(false);
  });

  it("uses sessionStorage pending only when signup had no user id", () => {
    markPendingAccountCreated(null);
    expect(shouldEmitAccountCreated("user-a")).toBe(true);
    markAccountCreatedEmitted("user-a");
    expect(shouldEmitAccountCreated("user-a")).toBe(false);
  });
});
