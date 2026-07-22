export const AUTH_STORAGE_KEY = "animolog.auth.session.v1";
export const DEFAULT_POST_CONSENT_DESTINATION = "/dashboard";

const POST_CONSENT_DESTINATIONS = new Set(["/dashboard", "/onboarding"]);

function normalizePostConsentDestination(value) {
  return POST_CONSENT_DESTINATIONS.has(value)
    ? value
    : DEFAULT_POST_CONSENT_DESTINATION;
}

function getDefaultStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function isSessionExpired(session, now = Date.now()) {
  const expiresAt = Number(session?.expires_at);
  return !Number.isFinite(expiresAt) || expiresAt * 1000 <= now;
}

export function toStoredAuth({ postConsentDestination, session, student, user }) {
  const expiresAt = Number(session?.expires_at)
    || Math.floor(Date.now() / 1000) + Number(session?.expires_in || 0);

  if (!session?.access_token || !Number.isFinite(expiresAt) || !user || !student) {
    throw new Error("The authentication response did not include a complete session");
  }

  return {
    version: 1,
    session: {
      access_token: session.access_token,
      expires_at: expiresAt,
      token_type: session.token_type || "bearer",
    },
    user,
    student,
    postConsentDestination: normalizePostConsentDestination(postConsentDestination),
  };
}

export function clearStoredAuth(storage = getDefaultStorage()) {
  try {
    storage?.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Browser privacy settings can make sessionStorage unavailable.
  }
}

export function writeStoredAuth(auth, storage = getDefaultStorage()) {
  const storedAuth = toStoredAuth(auth);

  try {
    storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedAuth));
  } catch {
    // The in-memory provider remains usable even if storage is unavailable.
  }

  return storedAuth;
}

export function readStoredAuth(storage = getDefaultStorage(), now = Date.now()) {
  let serialized;
  try {
    serialized = storage?.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!serialized) return null;

  try {
    const auth = JSON.parse(serialized);
    const isValid = auth?.version === 1
      && typeof auth.session?.access_token === "string"
      && auth.user
      && auth.student
      && !isSessionExpired(auth.session, now);

    if (!isValid) {
      clearStoredAuth(storage);
      return null;
    }

    return {
      ...auth,
      postConsentDestination: normalizePostConsentDestination(auth.postConsentDestination),
    };
  } catch {
    clearStoredAuth(storage);
    return null;
  }
}
