import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./privacy";

describe("Privacy page factual corrections", () => {
  it("displays corrected PostHog architecture - one project with environment separation", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/One PostHog Cloud EU project is used with mandatory environment separation/i).length).toBeGreaterThan(0);
  });

  it("does not contain obsolete separate PostHog projects wording", () => {
    render(<PrivacyPage />);
    expect(screen.queryByText(/Preview and Production use separate PostHog projects/i)).not.toBeInTheDocument();
  });

  it("displays corrected Sentry implementation - removes unproven wording", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/Lockdin uses Sentry to record application errors/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hosted capture is not claimed until it is separately proven/i)).not.toBeInTheDocument();
  });

  it("does not contain obsolete Sentry unproven wording", () => {
    render(<PrivacyPage />);
    expect(screen.queryByText(/Hosted capture is not claimed until it is separately proven/i)).not.toBeInTheDocument();
  });

  it("preserves truthful PostHog implementation boundaries", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/no autocapture/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no Session Replay/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no heatmaps/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no advertising integrations/i).length).toBeGreaterThan(0);
  });

  it("preserves truthful Sentry implementation boundaries", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/sanitized stack/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/release \(Git SHA\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/server request id/i).length).toBeGreaterThan(0);
  });

  it("maintains privacy contact email address", () => {
    render(<PrivacyPage />);
    const privacyEmailLinks = screen.getAllByRole("link", { name: /privacy@lockdin\.app/i });
    expect(privacyEmailLinks.length).toBeGreaterThan(0);
    privacyEmailLinks.forEach(link => {
      expect(link).toHaveAttribute("href", "mailto:privacy@lockdin.app");
    });
  });
});
