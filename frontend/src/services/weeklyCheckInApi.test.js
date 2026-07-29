import { describe, expect, it, vi } from "vitest";
import {
  analyzeWeeklyCheckIn,
  calculateWellnessDimensions,
  createWeeklyCheckIn,
  getCurrentWeeklyCheckIn,
  getWeeklyAnalysis,
  listWeeklyCheckIns,
  updateWeeklyCheckIn,
} from "./weeklyCheckInApi";

describe("weeklyCheckInApi", () => {
  it("loads history and current-week metadata", async () => {
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ checkIns: [{ id: "check-in-1" }] })
      .mockResolvedValueOnce({
        weekStart: "2026-07-20",
        completed: false,
        checkIn: null,
      });

    await expect(listWeeklyCheckIns(authenticatedRequest)).resolves.toEqual([
      { id: "check-in-1" },
    ]);
    await expect(getCurrentWeeklyCheckIn(authenticatedRequest)).resolves.toEqual({
      weekStart: "2026-07-20",
      completed: false,
      checkIn: null,
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, "/api/check-ins");
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, "/api/check-ins/current");
  });

  it("creates, updates, and calculates a check-in", async () => {
    const payload = {
      week_start: "2026-07-20",
      stress_level: 3,
    };
    const created = { id: "check-in-1", ...payload };
    const score = { check_in_id: created.id };
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ checkIn: created })
      .mockResolvedValueOnce({ checkIn: { ...created, stress_level: 4 } })
      .mockResolvedValueOnce({ wellnessDimensionScore: score });

    await expect(createWeeklyCheckIn(authenticatedRequest, payload)).resolves.toEqual(created);
    await expect(
      updateWeeklyCheckIn(authenticatedRequest, created.id, { stress_level: 4 }),
    ).resolves.toEqual({ ...created, stress_level: 4 });
    await expect(
      calculateWellnessDimensions(authenticatedRequest, created.id),
    ).resolves.toEqual(score);

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, "/api/check-ins", {
      method: "POST",
      body: payload,
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/api/check-ins/check-in-1",
      { method: "PATCH", body: { stress_level: 4 } },
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      3,
      "/api/check-ins/check-in-1/calculate-dimensions",
      { method: "POST" },
    );
  });

  it("loads and creates an AI analysis through authenticated requests", async () => {
    const savedAnalysis = {
      id: "analysis-1",
      check_in_id: "check-in-1",
      swi_score: 70.19,
    };
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ success: true, aiResult: savedAnalysis })
      .mockResolvedValueOnce({ success: true, data: savedAnalysis })
      .mockResolvedValueOnce({ success: true, aiResult: null });

    await expect(
      getWeeklyAnalysis(authenticatedRequest, "check-in-1"),
    ).resolves.toEqual(savedAnalysis);
    await expect(
      analyzeWeeklyCheckIn(
        authenticatedRequest,
        "check-in-1",
        "dimension-score-1",
      ),
    ).resolves.toEqual(savedAnalysis);
    await expect(
      getWeeklyAnalysis(authenticatedRequest, "check-in-2"),
    ).resolves.toBeNull();

    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      "/api/check-ins/check-in-1/analysis",
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/api/check-ins/check-in-1/analyze",
      {
        method: "POST",
        body: { dimension_scores_id: "dimension-score-1" },
      },
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      3,
      "/api/check-ins/check-in-2/analysis",
    );
  });
});
