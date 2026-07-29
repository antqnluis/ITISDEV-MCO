import { apiRequest } from "./apiClient";

export function createStudentProfile(token, payload) {
  return apiRequest("/api/profile", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function getStudentProfile(authenticatedRequest) {
  const response = await authenticatedRequest("/api/profile");
  return response.profile;
}

export async function updateStudentProfile(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/profile", {
    method: "PATCH",
    body: payload,
  });
  return response.profile;
}
