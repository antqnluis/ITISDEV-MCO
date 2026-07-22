const PAGE_SIZE = 100;

export async function listAllCourses(authenticatedRequest) {
  const courses = [];
  let offset = 0;

  while (true) {
    const response = await authenticatedRequest(
      `/api/courses?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const page = response.courses || [];
    courses.push(...page);

    if (!response.pagination?.has_more || page.length === 0) break;
    offset += page.length;
  }

  return courses;
}

export async function createCourse(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/courses", {
    method: "POST",
    body: payload,
  });
  return response.course;
}
