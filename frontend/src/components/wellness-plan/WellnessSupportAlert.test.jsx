import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WellnessSupportAlert from "./WellnessSupportAlert";

describe("WellnessSupportAlert", () => {
  it("renders a calm contact recommendation for severe results", () => {
    render(<WellnessSupportAlert severity="severe" />);

    expect(screen.getByRole("status")).toHaveTextContent("Consider connecting with someone soon");
    expect(screen.getByText("DLSU Counseling and Psychological Services")).toBeInTheDocument();
    expect(screen.getByText(/academic adviser or the Office of Student Affairs/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review support options" })).toHaveAttribute(
      "href",
      "#support-resources",
    );
  });

  it("renders an urgent accessible alert for critical results", () => {
    render(<WellnessSupportAlert severity="critical" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("Please connect with support now");
    expect(alert).toHaveTextContent("contact local emergency services");
    expect(screen.getByText(/trusted person who can stay with you/i)).toBeInTheDocument();
  });

  it.each(["low_normal", "moderate", "pending", undefined])(
    "does not render for %s severity",
    (severity) => {
      const { container } = render(<WellnessSupportAlert severity={severity} />);
      expect(container).toBeEmptyDOMElement();
    },
  );
});
