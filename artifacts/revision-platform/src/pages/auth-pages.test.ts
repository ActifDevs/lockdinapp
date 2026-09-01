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
    expect(src).toMatch(/VITE_GOOGLE_AUTH_ENABLED/);
    expect(src).toMatch(/googleAuthEnabled/);
    expect(src).toMatch(/Email or password is incorrect/);
  });

  it("signup shows invitation-only controlled-beta state without a public self-signup form", () => {
    const src = readPage("signup.tsx");
    expect(src).toMatch(/This is a controlled beta/);
    expect(src).toMatch(/Registration is currently by invitation\s+only/);
    expect(src).toMatch(/Invitation only/);
    expect(src).toMatch(/href=\"\/login\"/);
    expect(src).not.toMatch(/signUp\(/);
    expect(src).not.toMatch(/signInWithGoogle/);
    expect(src).not.toMatch(/Create account/);
    expect(src).not.toMatch(/type=\"password\"/);
    expect(src).not.toMatch(/autoComplete=\"new-password\"/);
    expect(src).not.toMatch(/username/i);
  });

  it("login links to invitation-only signup without promising open registration", () => {
    const src = readPage("login.tsx");
    expect(src).toMatch(/href=\"\/signup\"/);
    expect(src).toMatch(/Invitation only/);
    expect(src).not.toMatch(/>Sign up</);
  });

  it("login shows safe profile-load reason message", () => {
    const src = readPage("login.tsx");
    expect(src).toMatch(/profile-load/);
    expect(src).toMatch(/load your account\. Please sign in again/);
  });

  it("signup confirmation-required branch was removed with public self-signup", () => {
    const src = readPage("signup.tsx");
    expect(src).not.toMatch(/emailConfirmationRequired/);
    expect(src).not.toMatch(/needsConfirmation/);
  });

  it("generic password-reset response does not reveal account existence", () => {
    const src = readPage("forgot-password.tsx");
    expect(src).toMatch(
      /If an account exists for that email, a password-reset link has been sent/,
    );
    expect(src).toMatch(/requestPasswordReset/);
    expect(src).not.toMatch(/no account/i);
  });

  it("password update signs out after success without delayed navigation", () => {
    const src = readPage("update-password.tsx");
    expect(src).toMatch(/Password must be at least 8 characters/);
    expect(src).toMatch(/Passwords do not match/);
    expect(src).toMatch(/await updatePassword\(password\)/);
    expect(src).toMatch(/await logout\(\)/);
    expect(src).not.toMatch(/setTimeout/);
    expect(src).not.toMatch(/useLocation/);
  });

  it("onboarding uses catalogue fetch and complete-onboarding once", () => {
    const src = readPage("onboarding.tsx");
    expect(src).toMatch(/useListSubjects/);
    expect(src).toMatch(/completeOnboarding\(/);
    expect(src).not.toMatch(/createSubject/);
    expect(src).not.toMatch(/createTask/);
    expect(src).not.toMatch(/SUBJECT_CATALOG/);
    expect(src).toMatch(/subjectIds:\s*selectedIds/);
    expect(src).toMatch(/subjectsError/);
    expect(src).toMatch(/refetchSubjects/);
    expect(src).toMatch(/couldn’t load the subject catalogue/i);
  });

  it("settings manages durable membership without catalogue writes", () => {
    const src = readPage("settings.tsx");
    expect(src).not.toMatch(/useCreateSubject/);
    expect(src).not.toMatch(/useDeleteSubject/);
    expect(src).toMatch(/useListCurrentUserSubjects/);
    expect(src).toMatch(/useReplaceCurrentUserSubjects/);
    expect(src).toMatch(/Selected \{selectedSubjectIds\.length\} \/ 5/);
  });

  it("My Subjects uses durable membership rather than the full catalogue", () => {
    const src = readPage("subjects.tsx");
    expect(src).toMatch(/useListCurrentUserSubjects/);
    expect(src).not.toMatch(/useListSubjects/);
  });
});
