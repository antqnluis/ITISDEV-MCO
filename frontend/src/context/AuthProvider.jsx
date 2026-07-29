import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  resolveAccountDestination,
  resolvePostConsentDestination,
  submitConsent,
  updateCurrentAccount,
} from "../services/authApi";
import { ApiError, apiRequest } from "../services/apiClient";
import { createStudentProfile } from "../services/profileApi";
import {
  DEFAULT_POST_CONSENT_DESTINATION,
  clearStoredAuth,
  isSessionExpired,
  readStoredAuth,
  writeStoredAuth,
} from "../services/authSession";
import { AuthContext } from "./authContext";

const unauthenticatedState = {
  status: "unauthenticated",
  user: null,
  student: null,
  accountDestination: "/",
  postConsentDestination: DEFAULT_POST_CONSENT_DESTINATION,
};

export function AuthProvider({ children }) {
  const [initialAuth] = useState(() => readStoredAuth());
  const [authState, setAuthState] = useState(() => initialAuth ? {
    status: "loading",
    user: null,
    student: null,
    accountDestination: "/",
    postConsentDestination: DEFAULT_POST_CONSENT_DESTINATION,
  } : unauthenticatedState);
  const sessionRef = useRef(initialAuth?.session || null);

  const clearAuthentication = useCallback(() => {
    sessionRef.current = null;
    clearStoredAuth();
    setAuthState(unauthenticatedState);
  }, []);

  const commitAuthentication = useCallback(({
    postConsentDestination = DEFAULT_POST_CONSENT_DESTINATION,
    session,
    student,
    user,
  }, accountDestination) => {
    const storedAuth = writeStoredAuth({ postConsentDestination, session, student, user });
    sessionRef.current = storedAuth.session;
    setAuthState({
      status: "authenticated",
      user,
      student,
      accountDestination,
      postConsentDestination: storedAuth.postConsentDestination,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storedAuth = initialAuth;

    if (!storedAuth) {
      return () => {
        cancelled = true;
      };
    }

    async function hydrateAuthentication() {
      try {
        const current = await getCurrentAccount(storedAuth.session.access_token);
        const postConsentDestination = resolvePostConsentDestination(
          current.student,
          storedAuth.postConsentDestination,
        );
        const destination = resolveAccountDestination(
          current.student,
          postConsentDestination,
        );

        if (!cancelled) {
          commitAuthentication({
            session: storedAuth.session,
            student: current.student,
            user: current.user,
            postConsentDestination,
          }, destination);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status !== 401) {
            sessionRef.current = storedAuth.session;
            setAuthState({
              status: "authenticated",
              user: storedAuth.user,
              student: storedAuth.student,
              accountDestination: resolveAccountDestination(
                storedAuth.student,
                storedAuth.postConsentDestination,
              ),
              postConsentDestination: storedAuth.postConsentDestination,
            });
          } else {
            clearAuthentication();
          }
        }
      }
    }

    hydrateAuthentication();
    return () => {
      cancelled = true;
    };
  }, [clearAuthentication, commitAuthentication, initialAuth]);

  useEffect(() => {
    if (authState.status !== "authenticated" || !sessionRef.current) return undefined;

    let timeoutId;
    function clearWhenExpired() {
      if (isSessionExpired(sessionRef.current)) {
        clearAuthentication();
        return;
      }

      const remaining = sessionRef.current.expires_at * 1000 - Date.now();
      timeoutId = window.setTimeout(clearWhenExpired, Math.min(remaining, 2_147_483_647));
    }

    const remaining = sessionRef.current.expires_at * 1000 - Date.now();
    timeoutId = window.setTimeout(clearWhenExpired, Math.max(0, Math.min(remaining, 2_147_483_647)));

    return () => window.clearTimeout(timeoutId);
  }, [authState.status, clearAuthentication]);

  const authenticatedRequest = useCallback(async (path, options = {}) => {
    const token = sessionRef.current?.access_token;
    if (!token) {
      clearAuthentication();
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    try {
      return await apiRequest(path, { ...options, token });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthentication();
      }
      throw error;
    }
  }, [clearAuthentication]);

  const login = useCallback(async (credentials) => {
    const authenticated = await loginAccount(credentials);
    const current = await getCurrentAccount(authenticated.session.access_token);
    const postConsentDestination = resolvePostConsentDestination(current.student);
    const destination = resolveAccountDestination(current.student, postConsentDestination);

    commitAuthentication({
      session: authenticated.session,
      student: current.student,
      user: current.user,
      postConsentDestination,
    }, destination);

    return destination;
  }, [commitAuthentication]);

  const register = useCallback(async (details) => {
    const authenticated = await registerAccount(details);
    commitAuthentication({
      ...authenticated,
      postConsentDestination: "/onboarding",
    }, "/consent");
    return "/consent";
  }, [commitAuthentication]);

  const acceptConsent = useCallback(async () => {
    const token = sessionRef.current?.access_token;
    if (!token) {
      clearAuthentication();
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    try {
      const result = await submitConsent(token);
      const nextStudent = { ...authState.student, ...result.student };
      const postConsentDestination = resolvePostConsentDestination(
        nextStudent,
        authState.postConsentDestination,
      );
      const destination = resolveAccountDestination(nextStudent, postConsentDestination);
      commitAuthentication({
        session: sessionRef.current,
        student: nextStudent,
        user: authState.user,
        postConsentDestination,
      }, destination);
      return destination;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) clearAuthentication();
      throw error;
    }
  }, [authState.postConsentDestination, authState.student, authState.user, clearAuthentication, commitAuthentication]);

  const updateStudentDetails = useCallback(async (payload) => {
    const token = sessionRef.current?.access_token;
    if (!token) {
      clearAuthentication();
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    try {
      const result = await updateCurrentAccount(token, payload);
      const nextStudent = { ...authState.student, ...result.student };
      commitAuthentication({
        session: sessionRef.current,
        student: nextStudent,
        user: authState.user,
        postConsentDestination: authState.postConsentDestination,
      }, authState.accountDestination);
      return nextStudent;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthentication();
      }
      throw error;
    }
  }, [
    authState.accountDestination,
    authState.postConsentDestination,
    authState.student,
    authState.user,
    clearAuthentication,
    commitAuthentication,
  ]);

  const completeOnboarding = useCallback(async (payload) => {
    const token = sessionRef.current?.access_token;
    if (!token) {
      clearAuthentication();
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }

    try {
      await createStudentProfile(token, payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthentication();
        throw error;
      }

      if (!(error instanceof ApiError) || error.status !== 409) {
        throw error;
      }
    }

    const nextStudent = {
      ...authState.student,
      onboarding_completed: true,
    };
    commitAuthentication({
      session: sessionRef.current,
      student: nextStudent,
      user: authState.user,
      postConsentDestination: "/dashboard",
    }, "/dashboard");

    return "/dashboard";
  }, [authState.student, authState.user, clearAuthentication, commitAuthentication]);

  const logout = useCallback(async () => {
    const token = sessionRef.current?.access_token;

    try {
      if (token) await logoutAccount(token);
    } catch {
      // Local sign-out must still complete if the token is already invalid.
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const value = useMemo(() => ({
    ...authState,
    acceptConsent,
    authenticatedRequest,
    completeOnboarding,
    login,
    logout,
    register,
    updateStudentDetails,
  }), [acceptConsent, authenticatedRequest, authState, completeOnboarding, login, logout, register, updateStudentDetails]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
