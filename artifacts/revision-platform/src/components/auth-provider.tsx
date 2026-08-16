import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  completeCurrentUserOnboarding,
  getCurrentProfile,
  updateCurrentProfile,
  setAuthTokenGetter,
  setUnauthorizedHandler,
  type CompleteOnboardingInput,
  type Profile,
  type ProfileUpdate,
} from "@workspace/api-client-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getAppUrl } from "@/lib/app-url";
import { LEGACY_PERSONAL_STORAGE_KEYS } from "@/lib/user-scoped-storage";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  level: string | null;
  examSession: string | null;
  onboardedAt: string | null;
};

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
};

export type SignUpResult = {
  sessionAvailable: boolean;
  emailConfirmationRequired: boolean;
};

export type CompleteOnboardingPayload = {
  fullName: string;
  username: string;
  level: string;
  examSession: string;
  subjectIds: number[];
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  user: AuthUser | null;
  firstName: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: (payload: CompleteOnboardingPayload) => Promise<Profile>;
  updateUser: (payload: ProfileUpdate) => Promise<Profile>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const OBSOLETE_KEYS = [
  "lockdin_auth",
  "lockdin_user",
  "onboarded",
  "lockdin_subject_codes",
  ...LEGACY_PERSONAL_STORAGE_KEYS,
] as const;

/** Deterministic retry schedule for initial profile resolution. */
export const PROFILE_RETRY_DELAYS_MS = [0, 150, 400] as const;

function clearObsoleteLocalStorageKeys(): void {
  for (const key of OBSOLETE_KEYS) {
    localStorage.removeItem(key);
  }
}

function firstNameFrom(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || name;
}

function buildAuthUser(sessionUser: SupabaseUser, profile: Profile): AuthUser {
  const metaName =
    typeof sessionUser.user_metadata?.full_name === "string"
      ? sessionUser.user_metadata.full_name
      : "";
  const name = profile.fullName?.trim() || metaName.trim() || "Scholar";
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name,
    username: profile.username ?? null,
    level: profile.level ?? null,
    examSession: profile.examSession ?? null,
    onboardedAt: profile.onboardedAt ?? null,
  };
}

function isSafeNextPath(next: string | null): next is string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const profileRequestId = useRef(0);
  const loggingOut = useRef(false);
  const sessionUserIdRef = useRef<string | null>(null);

  const applyProfile = useCallback(
    (sessionUser: SupabaseUser, profile: Profile) => {
      setUser(buildAuthUser(sessionUser, profile));
    },
    [],
  );

  const clearProtectedState = useCallback(() => {
    profileRequestId.current += 1;
    sessionUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setIsLoading(false);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      const supabase = getSupabaseBrowserClient();
      clearProtectedState();
      await supabase.auth.signOut();
      setLocation("/login");
    } finally {
      loggingOut.current = false;
    }
  }, [clearProtectedState, setLocation]);

  const disposeUnresolvedProfile = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      const supabase = getSupabaseBrowserClient();
      clearProtectedState();
      await supabase.auth.signOut();
      setLocation("/login?reason=profile-load");
    } finally {
      loggingOut.current = false;
    }
  }, [clearProtectedState, setLocation]);

  const fetchProfileForUser = useCallback(
    async (sessionUser: SupabaseUser) => {
      const requestId = ++profileRequestId.current;
      const userId = sessionUser.id;

      for (const delayMs of PROFILE_RETRY_DELAYS_MS) {
        await sleep(delayMs);
        if (
          requestId !== profileRequestId.current ||
          sessionUserIdRef.current !== userId
        ) {
          return;
        }
        try {
          const profile = await getCurrentProfile();
          if (
            requestId !== profileRequestId.current ||
            sessionUserIdRef.current !== userId
          ) {
            return;
          }
          applyProfile(sessionUser, profile);
          setIsLoading(false);
          return;
        } catch {
          // Retry on the next delay; never treat failure as a null/non-onboarded profile.
        }
      }

      if (
        requestId !== profileRequestId.current ||
        sessionUserIdRef.current !== userId
      ) {
        return;
      }
      await disposeUnresolvedProfile();
    },
    [applyProfile, disposeUnresolvedProfile],
  );

  const beginProfileResolution = useCallback(
    (sessionUser: SupabaseUser) => {
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = sessionUser.id;

      setIsLoading(true);
      if (previousUserId && previousUserId !== nextUserId) {
        queryClient.clear();
        setUser(null);
      }
      sessionUserIdRef.current = nextUserId;

      // Keep onAuthStateChange synchronous; resolve outside the callback.
      queueMicrotask(() => {
        void fetchProfileForUser(sessionUser);
      });
    },
    [fetchProfileForUser, queryClient],
  );

  useEffect(() => {
    clearObsoleteLocalStorageKeys();
    const supabase = getSupabaseBrowserClient();

    setAuthTokenGetter(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    setUnauthorizedHandler(() => {
      void logout();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        sessionUserIdRef.current = null;
        setUser(null);
        if (event === "SIGNED_OUT") {
          queryClient.clear();
        }
        setIsLoading(false);
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        beginProfileResolution(nextSession.user);
        return;
      }

      // TOKEN_REFRESHED and other events: keep existing profile state.
      sessionUserIdRef.current = nextSession.user.id;
      setIsLoading(false);
    });

    // Bootstrap when the listener has not yet delivered INITIAL_SESSION (tests / edge cases).
    void supabase.auth.getSession().then(({ data }) => {
      const initial = data.session;
      if (!initial?.user) {
        if (!sessionUserIdRef.current) {
          setSession(null);
          setIsLoading(false);
        }
        return;
      }
      // Auth listener already started resolution for this user.
      if (sessionUserIdRef.current === initial.user.id) {
        return;
      }
      setSession(initial);
      beginProfileResolution(initial.user);
    });

    return () => {
      subscription.unsubscribe();
      setAuthTokenGetter(null);
      setUnauthorizedHandler(null);
    };
    // Intentionally mount-once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { full_name: input.fullName.trim() },
          emailRedirectTo: getAppUrl("/auth/callback"),
        },
      });
      if (error) throw error;
      const sessionAvailable = Boolean(data.session);
      return {
        sessionAvailable,
        emailConfirmationRequired: !sessionAvailable,
      };
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAppUrl("/auth/callback"),
      },
    });
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    beginProfileResolution(session.user);
  }, [beginProfileResolution, session]);

  const completeOnboarding = useCallback(
    async (payload: CompleteOnboardingPayload) => {
      const body: CompleteOnboardingInput = {
        fullName: payload.fullName,
        username: payload.username,
        level: payload.level,
        examSession: payload.examSession,
        subjectIds: payload.subjectIds,
      };
      const profile = await completeCurrentUserOnboarding(body);
      if (session?.user) {
        applyProfile(session.user, profile);
      }
      await queryClient.invalidateQueries();
      setLocation("/dashboard");
      return profile;
    },
    [applyProfile, queryClient, session, setLocation],
  );

  const updateUser = useCallback(
    async (payload: ProfileUpdate) => {
      const profile = await updateCurrentProfile(payload);
      if (session?.user) {
        applyProfile(session.user, profile);
      }
      return profile;
    },
    [applyProfile, session],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAppUrl("/update-password"),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const isAuthenticated = Boolean(session?.user);
  const isOnboarded = Boolean(user?.onboardedAt);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      isOnboarded,
      user,
      firstName: user ? firstNameFrom(user.name) : null,
      login,
      signUp,
      signInWithGoogle,
      logout,
      refreshProfile,
      completeOnboarding,
      updateUser,
      requestPasswordReset,
      updatePassword,
    }),
    [
      isLoading,
      isAuthenticated,
      isOnboarded,
      user,
      login,
      signUp,
      signInWithGoogle,
      logout,
      refreshProfile,
      completeOnboarding,
      updateUser,
      requestPasswordReset,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function getSafeNextPath(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const next = params.get("next");
  return isSafeNextPath(next) ? next : null;
}

export function getLoginReason(search: string): string | null {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("reason");
}
