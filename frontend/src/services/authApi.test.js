import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginAccount,
  registerAccount,
  resolveAccountDestination,
  submitConsent,
} from "./authApi";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth API", () => {
  it("posts registration and login payloads to their backend endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, session: {} }, 201))
      .mockResolvedValueOnce(jsonResponse({ success: true, session: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const registration = { email: "student@example.com", password: "secret", student_number: "20240001" };
    await registerAccount(registration);
    await loginAccount({ email: registration.email, password: registration.password });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/register$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify(registration),
    });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/auth\/login$/);
  });

  it("submits consent with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, student: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await submitConsent("access-token");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/consent$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ consent: true }),
      headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
    });
  });

  it("routes returning students using consent state without requesting a profile", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(resolveAccountDestination({ consent_given: false })).toBe("/consent");
    expect(resolveAccountDestination({
      consent_given: true,
      privacy_notice_version: "old-version",
    })).toBe("/consent");
    expect(resolveAccountDestination({
      consent_given: true,
      privacy_notice_version: "v1.0",
    })).toBe("/dashboard");
    expect(resolveAccountDestination({
      consent_given: true,
      privacy_notice_version: "v1.0",
    }, "/onboarding")).toBe("/onboarding");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves backend error messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({ success: false, message: "Invalid email or password" }, 401),
    ));

    await expect(loginAccount({ email: "student@example.com", password: "bad" }))
      .rejects.toMatchObject({ status: 401, message: "Invalid email or password" });
  });
});
