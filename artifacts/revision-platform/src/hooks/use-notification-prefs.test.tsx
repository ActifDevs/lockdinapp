import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREFS_BASE_KEY,
  parseNotificationPrefs,
  useNotificationPrefs,
} from "./use-notification-prefs";
import { userScopedStorageKey } from "@/lib/user-scoped-storage";
import { THEME_STORAGE_KEY } from "@/components/theme-provider";

const authState = vi.hoisted(() => ({
  isLoading: false,
  user: { id: "user-a" } as { id: string } | null,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isLoading: authState.isLoading,
    user: authState.user,
  }),
}));

function PrefsProbe() {
  const { prefs, updatePref } = useNotificationPrefs();
  return (
    <div>
      <span data-testid="morning">{String(prefs.morningSummary)}</span>
      <span data-testid="deadline">{String(prefs.deadlineReminders)}</span>
      <span data-testid="exam">{String(prefs.examAlerts)}</span>
      <button
        type="button"
        onClick={() => updatePref("morningSummary", false)}
      >
        disable-morning
      </button>
      <button type="button" onClick={() => updatePref("examAlerts", true)}>
        enable-exam
      </button>
    </div>
  );
}

function scopedKey(userId: string) {
  return userScopedStorageKey(NOTIFICATION_PREFS_BASE_KEY, userId);
}

const A_PREFS = {
  morningSummary: false,
  deadlineReminders: true,
  examAlerts: true,
};

const B_PREFS = {
  morningSummary: true,
  deadlineReminders: false,
  examAlerts: false,
};

const LEGACY_PREFS = {
  morningSummary: false,
  deadlineReminders: false,
  examAlerts: true,
};

describe("parseNotificationPrefs", () => {
  it("returns defaults for missing, invalid JSON, and wrong shapes", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("{")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("[]")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs('"x"')).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(
      parseNotificationPrefs(
        JSON.stringify({ morningSummary: "yes", examAlerts: 1 }),
      ),
    ).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});

describe("useNotificationPrefs account scope", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.isLoading = false;
    authState.user = { id: "user-a" };
  });

  afterEach(() => {
    cleanup();
  });

  it("gives authenticated User A documented defaults when no scoped value exists", async () => {
    render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("deadline").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });
    expect(localStorage.getItem(scopedKey("user-a"))).toBeNull();
  });

  it("persists User A changes to the A-scoped key only", async () => {
    render(<PrefsProbe />);
    await act(async () => {
      screen.getByText("disable-morning").click();
      screen.getByText("enable-exam").click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("false");
      expect(screen.getByTestId("exam").textContent).toBe("true");
    });
    expect(JSON.parse(localStorage.getItem(scopedKey("user-a"))!)).toEqual({
      morningSummary: false,
      deadlineReminders: true,
      examAlerts: true,
    });
    expect(localStorage.getItem(NOTIFICATION_PREFS_BASE_KEY)).toBeNull();
    expect(localStorage.getItem(scopedKey("user-b"))).toBeNull();
  });

  it("restores User A values after remount", async () => {
    localStorage.setItem(scopedKey("user-a"), JSON.stringify(A_PREFS));
    const { unmount } = render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("false");
      expect(screen.getByTestId("exam").textContent).toBe("true");
    });
    unmount();
    render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("false");
      expect(screen.getByTestId("exam").textContent).toBe("true");
    });
  });

  it("isolates A from B and restores A after account switch", async () => {
    const { rerender } = render(<PrefsProbe />);
    await act(async () => {
      screen.getByText("disable-morning").click();
      screen.getByText("enable-exam").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("morning").textContent).toBe("false"),
    );

    authState.user = null;
    rerender(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });

    authState.user = { id: "user-b" };
    rerender(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("deadline").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });

    await act(async () => {
      screen.getByText("disable-morning").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("morning").textContent).toBe("false"),
    );
    expect(JSON.parse(localStorage.getItem(scopedKey("user-b"))!)).toEqual({
      morningSummary: false,
      deadlineReminders: true,
      examAlerts: false,
    });

    authState.user = { id: "user-a" };
    rerender(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("false");
      expect(screen.getByTestId("exam").textContent).toBe("true");
    });
    expect(JSON.parse(localStorage.getItem(scopedKey("user-a"))!)).toEqual({
      morningSummary: false,
      deadlineReminders: true,
      examAlerts: true,
    });
    expect(JSON.parse(localStorage.getItem(scopedKey("user-b"))!)).toEqual({
      morningSummary: false,
      deadlineReminders: true,
      examAlerts: false,
    });
  });

  it("does not attribute the legacy global key to User A or User B", async () => {
    localStorage.setItem(
      NOTIFICATION_PREFS_BASE_KEY,
      JSON.stringify(LEGACY_PREFS),
    );

    const { rerender } = render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("deadline").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });
    expect(localStorage.getItem(NOTIFICATION_PREFS_BASE_KEY)).toBeNull();
    expect(localStorage.getItem(scopedKey("user-a"))).toBeNull();

    authState.user = { id: "user-b" };
    rerender(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("exam").textContent).toBe("false");
      expect(screen.getByTestId("morning").textContent).toBe("true");
    });
    expect(localStorage.getItem(scopedKey("user-b"))).toBeNull();
    expect(localStorage.getItem(NOTIFICATION_PREFS_BASE_KEY)).toBeNull();
  });

  it("falls back to defaults for malformed current-user storage", async () => {
    localStorage.setItem(scopedKey("user-a"), "{not-json");
    render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("deadline").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });
  });

  it("does not guess a user-owned preference while auth is loading", async () => {
    localStorage.setItem(scopedKey("user-a"), JSON.stringify(A_PREFS));
    localStorage.setItem(scopedKey("user-b"), JSON.stringify(B_PREFS));
    authState.isLoading = true;
    authState.user = { id: "user-a" };

    const { rerender } = render(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("true");
      expect(screen.getByTestId("exam").textContent).toBe("false");
    });
    expect(localStorage.getItem(scopedKey("user-a"))).toBe(JSON.stringify(A_PREFS));

    authState.isLoading = false;
    rerender(<PrefsProbe />);
    await waitFor(() => {
      expect(screen.getByTestId("morning").textContent).toBe("false");
      expect(screen.getByTestId("exam").textContent).toBe("true");
    });
  });

  it("does not write tokens or mutate device-global presentation keys", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem("lockdin_sidebar_collapsed", "true");
    render(<PrefsProbe />);
    await act(async () => {
      screen.getByText("enable-exam").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("exam").textContent).toBe("true"),
    );
    const stored = JSON.parse(localStorage.getItem(scopedKey("user-a"))!);
    expect(stored).not.toHaveProperty("token");
    expect(stored).not.toHaveProperty("access_token");
    expect(stored).not.toHaveProperty("email");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(localStorage.getItem("lockdin_sidebar_collapsed")).toBe("true");
  });
});
