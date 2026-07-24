export async function listWeeklyCheckIns(authenticatedRequest) {
  const response = await authenticatedRequest("/api/check-ins");
  return response.checkIns || [];
}

export async function getCurrentWeeklyCheckIn(authenticatedRequest) {
  const response = await authenticatedRequest("/api/check-ins/current");
  return {
    weekStart: response.weekStart,
    completed: Boolean(response.completed),
    checkIn: response.checkIn || null,
  };
}

export async function createWeeklyCheckIn(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/check-ins", {
    method: "POST",
    body: payload,
  });
  return response.checkIn;
}

export async function updateWeeklyCheckIn(authenticatedRequest, id, payload) {
  const response = await authenticatedRequest(`/api/check-ins/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return response.checkIn;
}

export async function calculateWellnessDimensions(authenticatedRequest, id) {
  const response = await authenticatedRequest(
    `/api/check-ins/${id}/calculate-dimensions`,
    { method: "POST" },
  );
  return response.wellnessDimensionScore;
}
