import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Router, useLocation, useSearch } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { RedirectIfAuthenticated, RequireAuth } from "./require-auth";

const authState = {
  isLoading: true,
  isAuthenticated: false,
  isOnboarded: false,
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
  getSafeNextPath: (search: string) => {
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const next = params.get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
      return null;
    }
    return next;
  },
}));

vi.mock("@/components/page-loader", () => ({
  PageLoader: () => <div data-testid="loader">loading</div>,
}));

function PathProbe() {
  const [location] = useLocation();
  const search = useSearch();
  const full = search ? `${location}?${search}` : location;
  return <div data-testid="path">{full}</div>;
}

function renderGuarded(path: string, ui: ReactNode) {
  const loc = memoryLocation({ path, static: false, record: true });
  render(
    <Router hook={loc.hook}>
      <PathProbe />
      {ui}
    </Router>,
  );
  return loc;
}

describe("RequireAuth", () => {
  beforeEach(() => {
    authState.isLoading = true;
    authState.isAuthenticated = false;
    authState.isOnboarded = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("loading does not redirect", async () => {
    authState.isLoading = true;
    renderGuarded(
      "/dashboard",
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.getByTestId("path").textContent).toBe("/dashboard");
  });

  it("unauthenticated redirects to login", async () => {
    authState.isLoading = false;
    authState.isAuthenticated = false;
    renderGuarded(
      "/dashboard",
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("path").textContent).toMatch(/^\/login\?next=/);
    });
  });

  it("non-onboarded redirects to onboarding", async () => {
    authState.isLoading = false;
    authState.isAuthenticated = true;
    authState.isOnboarded = false;
    renderGuarded(
      "/dashboard",
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("path").textContent).toBe("/onboarding");
    });
  });

  it("onboarded user cannot remain on onboarding", async () => {
    authState.isLoading = false;
    authState.isAuthenticated = true;
    authState.isOnboarded = true;
    renderGuarded(
      "/onboarding",
      <RequireAuth onboardingOnly>
        <div>onboarding</div>
      </RequireAuth>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("path").textContent).toBe("/dashboard");
    });
  });

  it("authenticated onboarded user sees protected children", () => {
    authState.isLoading = false;
    authState.isAuthenticated = true;
    authState.isOnboarded = true;
    renderGuarded(
      "/dashboard",
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});

describe("RedirectIfAuthenticated", () => {
  beforeEach(() => {
    authState.isLoading = false;
    authState.isAuthenticated = false;
    authState.isOnboarded = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("authenticated user is redirected away from login/signup", async () => {
    authState.isAuthenticated = true;
    authState.isOnboarded = true;
    renderGuarded(
      "/login",
      <RedirectIfAuthenticated>
        <div>login-form</div>
      </RedirectIfAuthenticated>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("path").textContent).toBe("/dashboard");
    });
  });

  it("unauthenticated users see login/signup", () => {
    renderGuarded(
      "/login",
      <RedirectIfAuthenticated>
        <div>login-form</div>
      </RedirectIfAuthenticated>,
    );
    expect(screen.getByText("login-form")).toBeInTheDocument();
    expect(screen.getByTestId("path").textContent).toBe("/login");
  });
});
