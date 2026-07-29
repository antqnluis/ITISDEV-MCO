import { describe, expect, it, vi } from "vitest";
import { listAllWellnessDimensionScores } from "./wellnessDimensionScoreApi";

describe("wellnessDimensionScoreApi", () => {
  it("loads every score page", async () => {
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({
        wellnessDimensionScores: [{ id: "score-1" }],
        pagination: { has_more: true },
      })
      .mockResolvedValueOnce({
        wellnessDimensionScores: [{ id: "score-2" }],
        pagination: { has_more: false },
      });

    await expect(listAllWellnessDimensionScores(authenticatedRequest)).resolves.toEqual([
      { id: "score-1" },
      { id: "score-2" },
    ]);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/api/wellness-dimension-scores?limit=100&offset=1",
    );
  });
});
