import { describe, expect, it, vi } from "vitest";
import { getWellnessSummaryExport } from "./wellnessSummaryExportApi";

describe("wellness-summary export API", () => {
    it("loads and unwraps the authenticated wellness summary", async () => {
        const wellnessSummary = {
            generated_at: "2026-07-27T04:00:00.000Z",
            check_ins: []
        };
        const authenticatedRequest = vi.fn().mockResolvedValue({
            success: true,
            wellnessSummary
        });

        await expect(
            getWellnessSummaryExport(authenticatedRequest)
        ).resolves.toEqual(wellnessSummary);
        expect(authenticatedRequest).toHaveBeenCalledWith(
            "/api/exports/wellness-summary"
        );
    });
});
