import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HelpSupportCard } from "./help-support-card";

afterEach(cleanup);

describe("HelpSupportCard", () => {
  it("renders the support purposes and a secure configured external action", () => {
    const fixtureUrl = "https://example.test/lockdin-support";
    render(<HelpSupportCard supportFormUrl={fixtureUrl} />);

    expect(
      screen.getByRole("heading", { name: "Help & Support" }),
    ).toBeVisible();
    expect(screen.getByText("Ask for help using Lockdin")).toBeVisible();
    expect(screen.getByText("Report a bug or issue")).toBeVisible();
    expect(screen.getByText("Give feedback or suggestions")).toBeVisible();
    expect(screen.getByText("Request privacy/account deletion")).toBeVisible();

    const action = screen.getByRole("link", { name: "Open support form" });
    expect(action).toHaveAttribute("href", fixtureUrl);
    expect(action).toHaveAttribute("target", "_blank");
    expect(action).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([undefined, "", "   "])(
    "renders a truthful unavailable state without a support link for %p",
    (supportFormUrl) => {
      render(<HelpSupportCard supportFormUrl={supportFormUrl} />);

      expect(
        screen.queryByRole("link", { name: "Open support form" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "The beta support form is temporarily unavailable. Please try again later.",
        ),
      ).toBeVisible();
      expect(
        screen.getAllByRole("link").map((link) => link.getAttribute("href")),
      ).toEqual(["mailto:privacy@lockdin.app"]);
    },
  );
});
