const PAGE_SIZE = 100;

function normalizeCourseEnvironmentLog(log) {
  return {
    ...log,
    course_code: log.course?.code || log.course_code || "",
    course_name: log.course?.name || log.course_name || "",
  };
}

export async function listAllCourseEnvironmentLogs(authenticatedRequest) {
  const logs = [];
  let offset = 0;

  while (true) {
    const response = await authenticatedRequest(
      `/api/course-environment-logs?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const page = (response.logs || []).map(normalizeCourseEnvironmentLog);
    logs.push(...page);

    if (!response.pagination?.has_more || page.length === 0) break;
    offset += page.length;
  }

  return logs;
}

export async function createCourseEnvironmentLog(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/course-environment-logs", {
    method: "POST",
    body: payload,
  });
  return normalizeCourseEnvironmentLog(response.courseEnvironmentLog);
}

export async function updateCourseEnvironmentLog(authenticatedRequest, id, payload) {
  const response = await authenticatedRequest(`/api/course-environment-logs/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return normalizeCourseEnvironmentLog(response.courseEnvironmentLog);
}

export function deleteCourseEnvironmentLog(authenticatedRequest, id) {
  return authenticatedRequest(`/api/course-environment-logs/${id}`, {
    method: "DELETE",
  });
}
