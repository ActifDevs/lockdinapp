import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import UpdatePassword from "./update-password";

const updatePassword = vi.fn();
const logout = vi.fn();

const authState = {
  updatePassword,
  logout,
  isAuthenticated: true,
  isLoading: false,
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

function renderPage(path = "/update-password") {
  const loc = memoryLocation({ path, static: false, record: true });
  render(
    <Router hook={loc.hook}>
      <UpdatePassword />
    </Router>,
  );
  return loc;
}

describe("UpdatePassword", () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    updatePassword.mockReset();
    logout.mockReset();
    updatePassword.mockResolvedValue(undefined);
    logout.mockImplementation(async () => {
      authState.isAuthenticated = false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("rejects short passwords without calling updatePassword", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/New password/i), "short");
    await user.type(screen.getByLabelText(/Confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /Update password/i }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords without calling updatePassword", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/New password/i), "password12");
    await user.type(screen.getByLabelText(/Confirm password/i), "password99");
    await user.click(screen.getByRole("button", { name: /Update password/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it("updates password then logs out without delayed navigation", async () => {
    const user = userEvent.setup();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    renderPage();

    await user.type(screen.getByLabelText(/New password/i), "password12");
    await user.type(screen.getByLabelText(/Confirm password/i), "password12");
    await user.click(screen.getByRole("button", { name: /Update password/i }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledTimes(1);
      expect(updatePassword).toHaveBeenCalledWith("password12");
      expect(logout).toHaveBeenCalledTimes(1);
    });
    expect(logout.mock.invocationCallOrder[0]).toBeGreaterThan(
      updatePassword.mock.invocationCallOrder[0]!,
    );
    expect(
      setTimeoutSpy.mock.calls.some((call) => typeof call[0] === "function" && call[1] === 1200),
    ).toBe(false);
    setTimeoutSpy.mockRestore();
  });

  it("does not logout when updatePassword fails", async () => {
    updatePassword.mockRejectedValue(new Error("update failed"));
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/New password/i), "password12");
    await user.type(screen.getByLabelText(/Confirm password/i), "password12");
    await user.click(screen.getByRole("button", { name: /Update password/i }));
    await waitFor(() => {
      expect(screen.getByText(/couldn't update your password/i)).toBeInTheDocument();
    });
    expect(logout).not.toHaveBeenCalled();
  });
});
