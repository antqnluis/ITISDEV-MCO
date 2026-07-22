import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/authContext";
import Consent from "./Consent";
import Login from "./Login";
import Register from "./Register";

function authValue(overrides = {}) {
  return {
    status: "unauthenticated",
    accountDestination: "/",
    user: null,
    student: null,
    acceptConsent: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    ...overrides,
  };
}

function renderPage(page, value, initialEntry = "/") {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={page} />
          <Route path="/register" element={page} />
          <Route path="/consent" element={<p>consent destination</p>} />
          <Route path="/onboarding" element={<p>onboarding destination</p>} />
          <Route path="/dashboard" element={<p>dashboard destination</p>} />
          <Route path="/check-in" element={<p>check-in destination</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("authentication forms", () => {
  it("submits normalized registration data and navigates to consent", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue("/consent");
    renderPage(<Register />, authValue({ register }), "/register");

    await user.type(screen.getByLabelText("First Name"), " Jamie ");
    await user.type(screen.getByLabelText("Last Name"), " Reyes ");
    await user.type(screen.getByLabelText("Student Number"), " 20240001 ");
    await user.type(screen.getByLabelText("DLSU Email"), " Student@Example.com ");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(register).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password123",
      student_number: "20240001",
      first_name: "Jamie",
      last_name: "Reyes",
    }));
    expect(await screen.findByText("consent destination")).toBeInTheDocument();
  });

  it("blocks invalid registration before making a request", async () => {
    const user = userEvent.setup();
    const register = vi.fn();
    renderPage(<Register />, authValue({ register }), "/register");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your student number.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
  });

  it("sends a returning login to dashboard instead of a remembered page", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue("/dashboard");
    renderPage(<Login />, authValue({ login }), { pathname: "/", state: { from: "/check-in" } });

    await user.type(screen.getByLabelText("University Email"), "Student@Example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password123",
    }));
    expect(await screen.findByText("dashboard destination")).toBeInTheDocument();
  });

  it("shows backend login errors and preserves the entered email", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error("Invalid email or password"));
    renderPage(<Login />, authValue({ login }));

    await user.type(screen.getByLabelText("University Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByLabelText("University Email")).toHaveValue("student@example.com");
  });

  it("prevents duplicate login submissions while a request is pending", async () => {
    const user = userEvent.setup();
    const login = vi.fn(() => new Promise(() => {}));
    renderPage(<Login />, authValue({ login }));

    await user.type(screen.getByLabelText("University Email"), "student@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const pendingButton = screen.getByRole("button", { name: "Signing in…" });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(login).toHaveBeenCalledOnce();
  });

  it("continues a new registration from consent to onboarding", async () => {
    const user = userEvent.setup();
    const acceptConsent = vi.fn().mockResolvedValue("/onboarding");
    renderPage(<Consent />, authValue({ status: "authenticated", acceptConsent }), "/register");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(acceptConsent).toHaveBeenCalledOnce());
    expect(await screen.findByText("onboarding destination")).toBeInTheDocument();
  });

  it("continues a returning student's consent flow to dashboard", async () => {
    const user = userEvent.setup();
    const acceptConsent = vi.fn().mockResolvedValue("/dashboard");
    renderPage(<Consent />, authValue({ status: "authenticated", acceptConsent }), "/register");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(acceptConsent).toHaveBeenCalledOnce());
    expect(await screen.findByText("dashboard destination")).toBeInTheDocument();
  });
});
