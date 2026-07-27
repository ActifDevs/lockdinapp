import { useState, useCallback } from "react";
import { useLocation } from "wouter";

export type AuthUser = {
  name: string;
  email: string;
  level?: string | null;
  examSession?: string | null;
};

export type OnboardingPayload = {
  level?: string | null;
  examSession?: string | null;
  subjectCodes?: string[];
};

const AUTH_KEY = "lockdin_auth";
const USER_KEY = "lockdin_user";
const ONBOARDED_KEY = "onboarded";

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function firstNameFrom(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || name;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === "true";
  });

  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDED_KEY) === "true";
  });

  const [user, setUser] = useState<AuthUser | null>(() => readUser());

  const [, setLocation] = useLocation();

  const login = useCallback(
    (nextUser?: Partial<AuthUser>) => {
      const existing = readUser();
      const merged: AuthUser = {
        name: nextUser?.name?.trim() || existing?.name || "Scholar",
        email: nextUser?.email?.trim() || existing?.email || "",
        level: nextUser?.level !== undefined ? nextUser.level : existing?.level ?? null,
        examSession:
          nextUser?.examSession !== undefined
            ? nextUser.examSession
            : existing?.examSession ?? null,
      };
      localStorage.setItem(AUTH_KEY, "true");
      writeUser(merged);
      setUser(merged);
      setIsAuthenticated(true);

      if (localStorage.getItem(ONBOARDED_KEY) === "true") {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    },
    [setLocation],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setLocation("/login");
  }, [setLocation]);

  const completeOnboarding = useCallback(
    (payload?: OnboardingPayload) => {
      setUser((prev) => {
        const merged: AuthUser = {
          name: prev?.name || "Scholar",
          email: prev?.email || "",
          level: payload?.level ?? prev?.level ?? null,
          examSession: payload?.examSession ?? prev?.examSession ?? null,
        };
        writeUser(merged);
        return merged;
      });
      localStorage.setItem(ONBOARDED_KEY, "true");
      if (payload?.subjectCodes?.length) {
        localStorage.setItem("lockdin_subject_codes", JSON.stringify(payload.subjectCodes));
      }
      setIsOnboarded(true);
      setLocation("/dashboard");
    },
    [setLocation],
  );

  const updateUser = useCallback((next: Partial<AuthUser>) => {
    setUser((prev) => {
      const merged: AuthUser = {
        name: next.name?.trim() || prev?.name || "Scholar",
        email: next.email?.trim() || prev?.email || "",
        level: next.level !== undefined ? next.level : prev?.level ?? null,
        examSession:
          next.examSession !== undefined ? next.examSession : prev?.examSession ?? null,
      };
      writeUser(merged);
      return merged;
    });
  }, []);

  return {
    isAuthenticated,
    isOnboarded,
    user,
    firstName: user ? firstNameFrom(user.name) : null,
    login,
    logout,
    completeOnboarding,
    updateUser,
  };
}
