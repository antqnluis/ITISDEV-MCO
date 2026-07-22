import { describe, expect, it, vi } from "vitest";
import { createCourse, listAllCourses } from "./courseApi";

describe("course API", () => {
  it("loads every course page", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        courses: [{ id: "course-1" }, { id: "course-2" }],
        pagination: { has_more: true },
      })
      .mockResolvedValueOnce({
        courses: [{ id: "course-3" }],
        pagination: { has_more: false },
      });

    await expect(listAllCourses(request)).resolves.toEqual([
      { id: "course-1" },
      { id: "course-2" },
      { id: "course-3" },
    ]);
    expect(request).toHaveBeenNthCalledWith(1, "/api/courses?limit=100&offset=0");
    expect(request).toHaveBeenNthCalledWith(2, "/api/courses?limit=100&offset=2");
  });

  it("creates and unwraps a course", async () => {
    const course = { id: "course-1", code: "ITISDEV", name: "IT Systems Development" };
    const request = vi.fn().mockResolvedValue({ success: true, course });

    await expect(createCourse(request, { code: course.code, name: course.name }))
      .resolves.toEqual(course);
    expect(request).toHaveBeenCalledWith("/api/courses", {
      method: "POST",
      body: { code: course.code, name: course.name },
    });
  });
});
