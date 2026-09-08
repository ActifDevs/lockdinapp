import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
    firstName: "Ada",
    user: { name: "Ada Lovelace", email: "ada@example.com" },
  }),
}));
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));
vi.mock("@/hooks/use-sidebar-collapsed", () => ({
  useSidebarCollapsed: () => ({ collapsed: false, toggleCollapsed: vi.fn() }),
}));

import { AppShell } from "./app-shell";

beforeEach(() => {
  window.history.replaceState({}, "", "/dashboard");
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});
afterEach(cleanup);

describe("AppShell mobile More disclosure", () => {
  it("opens with Enter and closes with Escape while returning focus", async () => {
    const user = userEvent.setup();
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    const more = screen.getByRole("button", { name: "More navigation" });
    more.focus();
    await user.keyboard("{Enter}");
    expect(more).toHaveAttribute("aria-expanded", "true");

    const settings = within(
      screen.getByRole("navigation", { name: "Mobile primary" }),
    ).getByRole("link", { name: "Settings" });
    const help = within(
      screen.getByRole("navigation", { name: "Mobile primary" }),
    ).getByRole("link", { name: "Help" });
    expect(help).toHaveAttribute("href", "/settings?tab=help");
    settings.focus();
    fireEvent.keyDown(settings, { key: "Escape" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(more).toHaveFocus();
  });
});
