import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/authContext";
import { OnboardingOnlyRoute, PublicOnlyRoute, RequireAuth } from "./AuthRouteGuards";

function authValue(overrides = {}) {
  return {
    status: "authenticated",
    accountDestination: "/dashboard",
    postConsentDestination: "/dashboard",
    user: { email: "student@example.com" },
    student: {
      first_name: "Jamie",
      last_name: "Reyes",
      consent_given: true,
      privacy_notice_version: "v1.0",
    },
    acceptConsent: vi.fn(),
    completeOnboarding: vi.fn(),
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

  it("redirects completed students away from onboarding", () => {
    render(
      <AuthContext.Provider value={authValue()}>
        <MemoryRouter initialEntries={["/onboarding"]}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingOnlyRoute><p>onboarding page</p></OnboardingOnlyRoute>} />
            <Route path="/dashboard" element={<p>dashboard page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("keeps a mounted onboarding flow visible when completion state changes", () => {
    const pendingValue = authValue({ postConsentDestination: "/onboarding" });
    const route = (
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingOnlyRoute><p>onboarding page</p></OnboardingOnlyRoute>} />
          <Route path="/dashboard" element={<p>dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(
      <AuthContext.Provider value={pendingValue}>{route}</AuthContext.Provider>,
    );

    expect(screen.getByText("onboarding page")).toBeInTheDocument();
    rerender(
      <AuthContext.Provider value={authValue()}>{route}</AuthContext.Provider>,
    );
    expect(screen.getByText("onboarding page")).toBeInTheDocument();
  });
});
