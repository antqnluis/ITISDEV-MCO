import { describe, expect, it, vi } from "vitest";
import {
  createCourseEnvironmentLog,
  deleteCourseEnvironmentLog,
  listAllCourseEnvironmentLogs,
  updateCourseEnvironmentLog,
} from "./courseEnvironmentLogApi";

describe("courseEnvironmentLogApi", () => {
  it("loads every page and normalizes joined course details", async () => {
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({
        logs: [{ id: "log-1", course: { code: "ITISDEV", name: "IT Systems Development" } }],
        pagination: { has_more: true },
      })
      .mockResolvedValueOnce({
        logs: [{ id: "log-2", course: { code: "CCPROG", name: "Programming" } }],
        pagination: { has_more: false },
      });

    const logs = await listAllCourseEnvironmentLogs(authenticatedRequest);

    expect(logs).toMatchObject([
      { id: "log-1", course_code: "ITISDEV", course_name: "IT Systems Development" },
      { id: "log-2", course_code: "CCPROG", course_name: "Programming" },
    ]);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/api/course-environment-logs?limit=100&offset=1",
    );
  });

  it("creates, updates, and deletes logs", async () => {
    const payload = { course_id: "course-1", week_start: "2026-07-20", workload_difficulty: 4 };
    const log = { id: "log-1", ...payload, course: { code: "ITISDEV", name: "IT Systems Development" } };
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ courseEnvironmentLog: log })
      .mockResolvedValueOnce({ courseEnvironmentLog: { ...log, workload_difficulty: 2 } })
      .mockResolvedValueOnce(null);

    await expect(createCourseEnvironmentLog(authenticatedRequest, payload)).resolves.toMatchObject({
      id: "log-1",
      course_code: "ITISDEV",
    });
    await expect(
      updateCourseEnvironmentLog(authenticatedRequest, "log-1", { workload_difficulty: 2 }),
    ).resolves.toMatchObject({ workload_difficulty: 2 });
    await expect(deleteCourseEnvironmentLog(authenticatedRequest, "log-1")).resolves.toBeNull();

    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      3,
      "/api/course-environment-logs/log-1",
      { method: "DELETE" },
    );
  });
});
