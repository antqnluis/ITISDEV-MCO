import { describe, expect, it } from "vitest";
import {
  AUTH_STORAGE_KEY,
  isSessionExpired,
  readStoredAuth,
  writeStoredAuth,
} from "./authSession";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createAuth(expiresAt = 2_000_000_000) {
  return {
    session: {
      access_token: "access-token",
      refresh_token: "must-not-be-stored",
      expires_at: expiresAt,
      token_type: "bearer",
    },
    user: { id: "user-1", email: "student@example.com" },
    student: { id: "user-1", first_name: "Jamie", last_name: "Reyes" },
  };
}

describe("auth session storage", () => {
  it("stores only the access-token session fields", () => {
    const storage = createStorage();
    writeStoredAuth(createAuth(), storage);

    const serialized = storage.getItem(AUTH_STORAGE_KEY);
    expect(serialized).toContain("access-token");
    expect(serialized).not.toContain("must-not-be-stored");
    const restored = readStoredAuth(storage, 1_900_000_000_000);
    expect(restored?.user.email).toBe("student@example.com");
    expect(restored?.postConsentDestination).toBe("/dashboard");
  });

  it("preserves only supported post-consent destinations", () => {
    const onboardingStorage = createStorage();
    writeStoredAuth({ ...createAuth(), postConsentDestination: "/onboarding" }, onboardingStorage);
    expect(readStoredAuth(onboardingStorage, 1_900_000_000_000)?.postConsentDestination)
      .toBe("/onboarding");

    const invalidStorage = createStorage();
    writeStoredAuth({ ...createAuth(), postConsentDestination: "/admin" }, invalidStorage);
    expect(readStoredAuth(invalidStorage, 1_900_000_000_000)?.postConsentDestination)
      .toBe("/dashboard");
  });

  it("clears expired and malformed records", () => {
    const expiredStorage = createStorage();
    writeStoredAuth(createAuth(100), expiredStorage);
    expect(readStoredAuth(expiredStorage, 101_000)).toBeNull();
    expect(expiredStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();

    const malformedStorage = createStorage();
    malformedStorage.setItem(AUTH_STORAGE_KEY, "not-json");
    expect(readStoredAuth(malformedStorage)).toBeNull();
    expect(malformedStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("treats missing and elapsed expiries as expired", () => {
    expect(isSessionExpired(null)).toBe(true);
    expect(isSessionExpired({ expires_at: 10 }, 10_000)).toBe(true);
    expect(isSessionExpired({ expires_at: 11 }, 10_000)).toBe(false);
  });
});
