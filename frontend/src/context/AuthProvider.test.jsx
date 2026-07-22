import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeStoredAuth } from "../services/authSession";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function Probe() {
  const { accountDestination, postConsentDestination, status, student } = useAuth();
  return <p>{status}:{accountDestination}:{postConsentDestination}:{student?.first_name || "none"}</p>;
}

function CompletionProbe() {
  const { completeOnboarding } = useAuth();
  const [result, setResult] = useState("");

  async function complete() {
    try {
      setResult(await completeOnboarding({ college: "CCS" }));
    } catch (error) {
      setResult(error.message);
    }
  }

  return <button type="button" onClick={complete}>{result || "complete onboarding"}</button>;
}

function AuthenticatedRequestProbe() {
  const { authenticatedRequest } = useAuth();
  const [result, setResult] = useState("");

  async function requestCourses() {
    try {
      const response = await authenticatedRequest("/api/courses?limit=100&offset=0");
      setResult(String(response.courses.length));
    } catch (error) {
      setResult(error.message);
    }
  }

  return <button type="button" onClick={requestCourses}>{result || "request courses"}</button>;
}

const storedAccount = {
  session: { access_token: "access-token", expires_at: 2_000_000_000 },
  user: { id: "student-1", email: "student@example.com" },
  student: {
    id: "student-1",
    first_name: "Cached",
    last_name: "Student",
    consent_given: true,
    privacy_notice_version: "v1.0",
  },
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthProvider hydration", () => {
  it("restores a consented returning student directly to the dashboard", async () => {
    writeStoredAuth(storedAccount);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      user: storedAccount.user,
      student: { ...storedAccount.student, first_name: "Jamie" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("authenticated:/dashboard:/dashboard:Jamie")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears a session rejected by the backend", async () => {
    writeStoredAuth(storedAccount);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({ success: false, message: "Invalid or expired access token" }, 401),
    ));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("unauthenticated:/:/dashboard:none")).toBeInTheDocument();
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("preserves a new registration's onboarding destination across refreshes", async () => {
    const unconsentedStudent = {
      ...storedAccount.student,
      consent_given: false,
      privacy_notice_version: null,
    };
    writeStoredAuth({
      ...storedAccount,
      student: unconsentedStudent,
      postConsentDestination: "/onboarding",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      user: storedAccount.user,
      student: { ...unconsentedStudent, first_name: "Jamie" },
    })));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("authenticated:/consent:/onboarding:Jamie")).toBeInTheDocument();
  });

  it("restores a consented but unfinished registration to onboarding", async () => {
    writeStoredAuth({
      ...storedAccount,
      postConsentDestination: "/onboarding",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      user: storedAccount.user,
      student: { ...storedAccount.student, first_name: "Jamie" },
    })));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("authenticated:/onboarding:/onboarding:Jamie")).toBeInTheDocument();
  });

  it("uses cached identity during a temporary network outage", async () => {
    writeStoredAuth(storedAccount);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("authenticated:/dashboard:/dashboard:Cached")).toBeInTheDocument();
  });

  it.each([
    [201, { success: true, profile: { id: "profile-1" } }],
    [409, { success: false, message: "A student profile already exists" }],
  ])("completes onboarding and stores dashboard state after a %i profile response", async (status, response) => {
    const user = userEvent.setup();
    writeStoredAuth({
      ...storedAccount,
      postConsentDestination: "/onboarding",
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: storedAccount.user,
        student: storedAccount.student,
      }))
      .mockResolvedValueOnce(jsonResponse(response, status));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthProvider><Probe /><CompletionProbe /></AuthProvider>);
    await screen.findByText("authenticated:/onboarding:/onboarding:Cached");
    await user.click(screen.getByRole("button", { name: "complete onboarding" }));

    expect(await screen.findByText("authenticated:/dashboard:/dashboard:Cached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "/dashboard" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/profile$/);
    expect(JSON.parse(window.sessionStorage.getItem("animolog.auth.session.v1")))
      .toMatchObject({ postConsentDestination: "/dashboard" });
  });

  it("clears authentication when profile creation rejects an expired session", async () => {
    const user = userEvent.setup();
    writeStoredAuth({
      ...storedAccount,
      postConsentDestination: "/onboarding",
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: storedAccount.user,
        student: storedAccount.student,
      }))
      .mockResolvedValueOnce(jsonResponse({ message: "Invalid or expired access token" }, 401)));

    render(<AuthProvider><Probe /><CompletionProbe /></AuthProvider>);
    await screen.findByText("authenticated:/onboarding:/onboarding:Cached");
    await user.click(screen.getByRole("button", { name: "complete onboarding" }));

    expect(await screen.findByText("unauthenticated:/:/dashboard:none")).toBeInTheDocument();
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("adds the current bearer token to authenticated resource requests", async () => {
    const user = userEvent.setup();
    writeStoredAuth(storedAccount);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: storedAccount.user,
        student: storedAccount.student,
      }))
      .mockResolvedValueOnce(jsonResponse({ courses: [], pagination: { has_more: false } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthProvider><AuthenticatedRequestProbe /></AuthProvider>);
    await user.click(await screen.findByRole("button", { name: "request courses" }));

    expect(await screen.findByRole("button", { name: "0" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/courses\?limit=100&offset=0$/);
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("clears authentication when an authenticated resource request returns 401", async () => {
    const user = userEvent.setup();
    writeStoredAuth(storedAccount);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        user: storedAccount.user,
        student: storedAccount.student,
      }))
      .mockResolvedValueOnce(jsonResponse({ message: "Invalid or expired access token" }, 401)));

    render(<AuthProvider><Probe /><AuthenticatedRequestProbe /></AuthProvider>);
    await screen.findByText("authenticated:/dashboard:/dashboard:Cached");
    await user.click(screen.getByRole("button", { name: "request courses" }));

    expect(await screen.findByText("unauthenticated:/:/dashboard:none")).toBeInTheDocument();
    expect(window.sessionStorage).toHaveLength(0);
  });
});
