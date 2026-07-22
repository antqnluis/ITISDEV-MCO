import { describe, expect, it, vi } from "vitest";
import {
  createAcademicRecord,
  listAllAcademicRecords,
} from "./academicRecordApi";

describe("academic-record API", () => {
  it("loads every academic-record page", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        records: [{ id: "record-1" }],
        pagination: { has_more: true },
      })
      .mockResolvedValueOnce({
        records: [{ id: "record-2" }],
        pagination: { has_more: false },
      });

    await expect(listAllAcademicRecords(request)).resolves.toEqual([
      { id: "record-1" },
      { id: "record-2" },
    ]);
    expect(request).toHaveBeenNthCalledWith(1, "/api/academic-records?limit=100&offset=0");
    expect(request).toHaveBeenNthCalledWith(2, "/api/academic-records?limit=100&offset=1");
  });

  it("creates and unwraps an academic record", async () => {
    const record = { id: "record-1", course_id: "course-1" };
    const payload = {
      course_id: "course-1",
      record_type: "assignment",
      title: "MCO 1",
    };
    const request = vi.fn().mockResolvedValue({ success: true, academicRecord: record });

    await expect(createAcademicRecord(request, payload)).resolves.toEqual(record);
    expect(request).toHaveBeenCalledWith("/api/academic-records", {
      method: "POST",
      body: payload,
    });
  });
});
