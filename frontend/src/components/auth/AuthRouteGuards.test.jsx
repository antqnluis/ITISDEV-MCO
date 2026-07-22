import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/authContext";
import { PublicOnlyRoute, RequireAuth } from "./AuthRouteGuards";

function authValue(overrides = {}) {
  return {
    status: "authenticated",
    accountDestination: "/dashboard",
    user: { email: "student@example.com" },
    student: {
      first_name: "Jamie",
      last_name: "Reyes",
      consent_given: true,
      privacy_notice_version: "v1.0",
    },
    acceptConsent: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    ...overrides,
  };
}

function renderRoutes(value, initialPath, protectedElement) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<p>login page</p>} />
          <Route path="/consent" element={<p>consent page</p>} />
          <Route path="/dashboard" element={protectedElement} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("authentication route guards", () => {
  it("redirects unauthenticated students to login", () => {
    renderRoutes(
      authValue({ status: "unauthenticated", student: null, user: null }),
      "/dashboard",
      <RequireAuth requireConsent><p>dashboard page</p></RequireAuth>,
    );
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("redirects authenticated students without current consent", () => {
    renderRoutes(
      authValue({ student: { consent_given: false } }),
      "/dashboard",
      <RequireAuth requireConsent><p>dashboard page</p></RequireAuth>,
    );
    expect(screen.getByText("consent page")).toBeInTheDocument();
  });

  it("keeps authenticated students out of public auth pages", () => {
    render(
      <AuthContext.Provider value={authValue()}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<PublicOnlyRoute><p>login page</p></PublicOnlyRoute>} />
            <Route path="/dashboard" element={<p>dashboard page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });
});
