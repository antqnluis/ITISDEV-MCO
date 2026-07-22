import { apiRequest } from "./apiClient";

export function createStudentProfile(token, payload) {
  return apiRequest("/api/profile", {
    method: "POST",
    token,
    body: payload,
  });
}
