import { apiRequest } from "./apiClient";

export const CURRENT_PRIVACY_NOTICE_VERSION = "v1.0";

export function hasCurrentConsent(student) {
  return Boolean(
    student?.consent_given
    && student.privacy_notice_version === CURRENT_PRIVACY_NOTICE_VERSION,
  );
}

export function registerAccount(payload) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function loginAccount(payload) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getCurrentAccount(token) {
  return apiRequest("/api/auth/me", { token });
}

export function submitConsent(token) {
  return apiRequest("/api/consent", {
    method: "PATCH",
    token,
    body: { consent: true },
  });
}

export function logoutAccount(token) {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    token,
  });
}

export function resolveAccountDestination(student) {
  if (!hasCurrentConsent(student)) return "/consent";
  return "/dashboard";
}
