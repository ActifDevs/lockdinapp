import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, useLocation, useSearch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AuthProvider, useAuth } from "./auth-provider";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();
const signOut = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const getSession = vi.fn();
const onAuthStateChange = vi.fn();
let authListener: ((event: string, session: unknown) => void) | null = null;

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
      signInWithOAuth,
      signOut,
      resetPasswordForEmail,
      updateUser,
      getSession,
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authListener = cb;
        onAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  }),
}));

const getCurrentProfile = vi.fn();
const completeCurrentUserOnboarding = vi.fn();
const updateCurrentProfile = vi.fn();
const setAuthTokenGetter = vi.fn();
const setUnauthorizedHandler = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  getCurrentProfile: (...args: unknown[]) => getCurrentProfile(...args),
  completeCurrentUserOnboarding: (...args: unknown[]) =>
    completeCurrentUserOnboarding(...args),
  updateCurrentProfile: (...args: unknown[]) => updateCurrentProfile(...args),
  setAuthTokenGetter: (...args: unknown[]) => setAuthTokenGetter(...args),
  setUnauthorizedHandler: (...args: unknown[]) =>
    setUnauthorizedHandler(...args),
}));

vi.mock("@/lib/app-url", () => ({
  getAppUrl: (path: string) => `http://localhost:5173${path}`,
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(auth.isLoading)}</div>
      <div data-testid="authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="onboarded">{String(auth.isOnboarded)}</div>
      <div data-testid="first-name">{auth.firstName ?? ""}</div>
      <div data-testid="user-id">{auth.user?.id ?? ""}</div>
      <button
        type="button"
        onClick={() => void auth.login("a@b.com", "password1")}
      >
        login
      </button>
      <button
        type="button"
        onClick={() =>
          void auth.signUp({
            fullName: "Ada Lovelace",
            email: "ada@example.com",
            password: "password1",
          })
        }
      >
        signup
      </button>
      <button type="button" onClick={() => void auth.signInWithGoogle()}>
        google
      </button>
      <button type="button" onClick={() => void auth.logout()}>
        logout
      </button>
    </div>
  );
}

function PathProbe() {
  const [location] = useLocation();
  const search = useSearch();
  const full = search ? `${location}?${search}` : location;
  return <div data-testid="path">{full}</div>;
}

function renderAuth(queryClient = new QueryClient()) {
  const loc = memoryLocation({
    path: "/dashboard",
    static: false,
    record: true,
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Router hook={loc.hook}>
        <PathProbe />
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </Router>
    </QueryClientProvider>,
  );
  return { queryClient, loc };
}

function sessionFor(id: string, email = "user@example.com") {
  return {
    access_token: "token",
    user: {
      id,
      email,
      user_metadata: { full_name: "Ada Lovelace" },
    },
  };
}

const onboardedProfile = {
  id: "user-a",
  fullName: "Ada Lovelace",
  username: "ada",
  level: "AS Level (Year 12)",
  examSession: "May/June 2026",
  onboardedAt: "2026-01-02T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

describe("AuthProvider", () => {
  beforeEach(() => {
    authListener = null;
    localStorage.clear();
    localStorage.setItem("lockdin_auth", "1");
    localStorage.setItem("lockdin_user", "{}");
    localStorage.setItem("onboarded", "true");
    localStorage.setItem("lockdin_subject_codes", "[]");
    for (const key of [
      "lockdin_longest_streak",
      "lockdin_unlocked_achievements",
      "lockdin_achievements_seeded",
      "lockdin_morning_ping",
      "lockdin_deadline_ping",
      "lockdin_exam_ping",
    ]) {
      localStorage.setItem(key, "legacy");
    }
    localStorage.setItem("lockdin_longest_streak:user-a", "12");
    localStorage.setItem("sb-local-auth-token", "keep-me");
    getSession.mockResolvedValue({ data: { session: null } });
    getCurrentProfile.mockReset();
    signInWithPassword.mockResolvedValue({ error: null });
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    signInWithOAuth.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("starts in isLoading and resolves unauthenticated with no session", async () => {
    renderAuth();
    expect(screen.getByTestId("loading").textContent).toBe("true");
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(localStorage.getItem("lockdin_auth")).toBeNull();
    expect(localStorage.getItem("sb-local-auth-token")).toBe("keep-me");
  });

  it("removes ambiguous personal keys and preserves user-qualified keys", async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    for (const key of [
      "lockdin_longest_streak",
      "lockdin_unlocked_achievements",
      "lockdin_achievements_seeded",
      "lockdin_morning_ping",
      "lockdin_deadline_ping",
      "lockdin_exam_ping",
    ]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("lockdin_longest_streak:user-a")).toBe("12");
  });

  it("session plus non-onboarded profile resolves to authenticated not onboarded", async () => {
    const sess = sessionFor("user-a");
    getSession.mockResolvedValue({ data: { session: sess } });
    getCurrentProfile.mockResolvedValue({
      id: "user-a",
      fullName: "Ada Lovelace",
      username: null,
      level: null,
      examSession: null,
      onboardedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
      expect(screen.getByTestId("onboarded").textContent).toBe("false");
      expect(screen.getByTestId("first-name").textContent).toBe("Ada");
    });
  });

  it("session plus onboarded profile resolves onboarded", async () => {
    const sess = sessionFor("user-a");
    getSession.mockResolvedValue({ data: { session: sess } });
    getCurrentProfile.mockResolvedValue(onboardedProfile);

    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId("onboarded").textContent).toBe("true");
    });
  });

  it("keeps loading while SIGNED_IN profile is pending", async () => {
    let resolveProfile: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    getCurrentProfile.mockImplementation(() => pending);

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-a"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("onboarded").textContent).toBe("false");
    expect(screen.getByTestId("user-id").textContent).toBe("");

    await act(async () => {
      resolveProfile(onboardedProfile);
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
      expect(screen.getByTestId("onboarded").textContent).toBe("true");
      expect(screen.getByTestId("user-id").textContent).toBe("user-a");
    });
  });

  it("profile failure never applies a null user and signs out to login reason", async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks"], [{ id: 1 }]);
    getCurrentProfile.mockRejectedValue(new Error("raw profile boom"));

    renderAuth(queryClient);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-a"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Retry delays: 0, 150, 400
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("user-id").textContent).toBe("");
    expect(screen.getByTestId("onboarded").textContent).toBe("false");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
    expect(signOut).toHaveBeenCalled();
    expect(screen.getByTestId("path").textContent).toBe(
      "/login?reason=profile-load",
    );
    expect(document.body.textContent).not.toContain("raw profile boom");
  });

  it("signup sends full_name metadata", async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    await act(async () => {
      screen.getByText("signup").click();
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password1",
      options: {
        data: { full_name: "Ada Lovelace" },
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });
  });

  it("login calls signInWithPassword", async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    await act(async () => {
      screen.getByText("login").click();
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password1",
    });
  });

  it("Google calls signInWithOAuth provider google", async () => {
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    await act(async () => {
      screen.getByText("google").click();
    });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:5173/auth/callback" },
    });
  });

  it("logout clears protected query cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks"], [{ id: 1 }]);
    const sess = sessionFor("user-a");
    getSession.mockResolvedValue({ data: { session: sess } });
    getCurrentProfile.mockResolvedValue(onboardedProfile);

    renderAuth(queryClient);
    await waitFor(() =>
      expect(screen.getByTestId("onboarded").textContent).toBe("true"),
    );
    await act(async () => {
      screen.getByText("logout").click();
    });
    expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
    expect(signOut).toHaveBeenCalled();
  });

  it("SIGNED_OUT clears user state", async () => {
    const sess = sessionFor("user-a");
    getSession.mockResolvedValue({ data: { session: sess } });
    getCurrentProfile.mockResolvedValue(onboardedProfile);

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("authenticated").textContent).toBe("true"),
    );

    await act(async () => {
      authListener?.("SIGNED_OUT", null);
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("user-id").textContent).toBe("");
  });

  it("TOKEN_REFRESHED preserves profile", async () => {
    const sess = sessionFor("user-a");
    getSession.mockResolvedValue({ data: { session: sess } });
    getCurrentProfile.mockResolvedValue(onboardedProfile);

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("first-name").textContent).toBe("Ada"),
    );
    const calls = getCurrentProfile.mock.calls.length;

    await act(async () => {
      authListener?.("TOKEN_REFRESHED", sess);
    });
    expect(screen.getByTestId("first-name").textContent).toBe("Ada");
    expect(getCurrentProfile.mock.calls.length).toBe(calls);
  });

  it("clears React Query cache including exam-date keys on auth identity switch", async () => {
    getCurrentProfile.mockResolvedValue({
      id: "user-b",
      fullName: "User B",
      username: "userb",
      level: null,
      examSession: null,
      onboardedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    getSession.mockResolvedValue({ data: { session: null } });

    const { queryClient } = renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    const examDatesKey = ["/api/exam-dates"] as const;
    queryClient.setQueryData(examDatesKey, [
      {
        id: 1,
        subjectId: 1,
        subjectName: "Biology",
        subjectColor: "#000",
        paperCode: "P1",
        date: "2026-12-01",
        notes: null,
      },
    ]);
    expect(queryClient.getQueryData(examDatesKey)).toBeTruthy();

    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-a", "a@example.com"));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-b", "b@example.com"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-b");
    });
    expect(queryClient.getQueryData(examDatesKey)).toBeUndefined();
  });

  it("stale profile from User A cannot replace User B", async () => {
    let resolveA: (value: unknown) => void = () => undefined;
    const profileA = new Promise((resolve) => {
      resolveA = resolve;
    });
    const profileResponses: Array<() => Promise<unknown>> = [
      () => profileA,
      () =>
        Promise.resolve({
          id: "user-b",
          fullName: "User B",
          username: "userb",
          level: null,
          examSession: null,
          onboardedAt: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }),
    ];
    getSession.mockResolvedValue({ data: { session: null } });
    getCurrentProfile.mockImplementation(() => {
      const next = profileResponses.shift();
      return next ? next() : Promise.resolve(null);
    });

    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-a", "a@example.com"));
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      authListener?.("SIGNED_IN", sessionFor("user-b", "b@example.com"));
    });
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-b");
      expect(screen.getByTestId("first-name").textContent).toBe("User");
    });

    await act(async () => {
      resolveA({
        id: "user-a",
        fullName: "User A Hijack",
        username: "usera",
        level: null,
        examSession: null,
        onboardedAt: "2026-01-02T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-b");
      expect(screen.getByTestId("first-name").textContent).toBe("User");
      expect(screen.getByTestId("onboarded").textContent).toBe("false");
    });
  });

  it("API 401 handler is registered to logout", async () => {
    renderAuth();
    await waitFor(() => expect(setUnauthorizedHandler).toHaveBeenCalled());
    const handler = setUnauthorizedHandler.mock.calls[0]?.[0];
    expect(typeof handler).toBe("function");
  });
});
