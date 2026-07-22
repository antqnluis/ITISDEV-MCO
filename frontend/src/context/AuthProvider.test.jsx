import { render, screen } from "@testing-library/react";
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

  it("uses cached identity during a temporary network outage", async () => {
    writeStoredAuth(storedAccount);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(await screen.findByText("authenticated:/dashboard:/dashboard:Cached")).toBeInTheDocument();
  });
});
