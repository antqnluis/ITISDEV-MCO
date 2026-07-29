import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
} from "./profileApi";

function jsonResponse(data, status = 201) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("profile API", () => {
  it("posts the profile payload with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, profile: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      college: "College of Computer Studies",
      program: "BS Information Technology",
      year_level: 3,
      current_academic_term: 2,
      wellness_goals: ["Managing Stress"],
    };

    await createStudentProfile("access-token", payload);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/profile$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify(payload),
      headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
    });
  });

  it("loads and updates profiles through authenticated requests", async () => {
    const currentProfile = { id: "profile-1", college: "CCS" };
    const updatedProfile = { ...currentProfile, college: "COS" };
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ success: true, profile: currentProfile })
      .mockResolvedValueOnce({ success: true, profile: updatedProfile });

    await expect(getStudentProfile(authenticatedRequest))
      .resolves.toEqual(currentProfile);
    await expect(updateStudentProfile(authenticatedRequest, {
      college: "COS",
    })).resolves.toEqual(updatedProfile);

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, "/api/profile");
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, "/api/profile", {
      method: "PATCH",
      body: { college: "COS" },
    });
  });
});
