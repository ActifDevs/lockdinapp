import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));

function readPage(name: string): string {
  return readFileSync(path.join(dir, name), "utf8");
}

describe("auth pages wiring", () => {
  it("login no longer uses timer simulation", () => {
    const src = readPage("login.tsx");
    expect(src).not.toMatch(/setTimeout\s*\(/);
    expect(src).toMatch(/await login\(/);
    expect(src).toMatch(/signInWithGoogle/);
    expect(src).toMatch(/Email or password is incorrect/);
  });

  it("signup confirmation-required branch renders correctly", () => {
    const src = readPage("signup.tsx");
    expect(src).toMatch(/emailConfirmationRequired/);
    expect(src).toMatch(/needsConfirmation/);
    expect(src).toMatch(/Back to login/);
    expect(src).toMatch(/signUp\(\{/);
    expect(src).not.toMatch(/username/i);
  });

  it("generic password-reset response does not reveal account existence", () => {
    const src = readPage("forgot-password.tsx");
    expect(src).toMatch(
      /If an account exists for that email, a password-reset link has been sent/,
    );
    expect(src).toMatch(/requestPasswordReset/);
    expect(src).not.toMatch(/no account/i);
  });

  it("password update rejects mismatch/short values", () => {
    const src = readPage("update-password.tsx");
    expect(src).toMatch(/Password must be at least 8 characters/);
    expect(src).toMatch(/Passwords do not match/);
    expect(src).toMatch(/updatePassword\(password\)/);
  });

  it("onboarding uses catalogue fetch and complete-onboarding once", () => {
    const src = readPage("onboarding.tsx");
    expect(src).toMatch(/useListSubjects/);
    expect(src).toMatch(/completeOnboarding\(/);
    expect(src).not.toMatch(/createSubject/);
    expect(src).not.toMatch(/createTask/);
    expect(src).not.toMatch(/SUBJECT_CATALOG/);
    expect(src).toMatch(/subjectIds:\s*selectedIds/);
  });

  it("settings removes subject create/delete controls", () => {
    const src = readPage("settings.tsx");
    expect(src).not.toMatch(/useCreateSubject/);
    expect(src).not.toMatch(/useDeleteSubject/);
    expect(src).toMatch(/shared Cambridge catalogue/);
  });
});
