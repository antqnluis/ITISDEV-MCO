import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WellnessPlan from "./WellnessPlan";

vi.mock("../components/layout/AppShell", () => ({
  default: function MockAppShell({ children }) {
    return <div>{children}</div>;
  },
}));

describe("Wellness Plan demo scenarios", () => {
  it("switches between severe and critical support previews without network data", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WellnessPlan />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No backend analysis or student data is being loaded/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "severe" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("severe stress");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector("#support-resources")).toHaveTextContent(
      "Resources for elevated needs",
    );

    await user.click(screen.getByRole("button", { name: "critical" }));

    expect(screen.getByRole("button", { name: "critical" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("critical level of concern");
    expect(screen.getByText(/High risk · Critical stress severity/i)).toBeInTheDocument();
  });
});
