import { Navigate, useLocation } from "react-router-dom";
import { hasCurrentConsent } from "../../services/authApi";
import { useAuth } from "../../context/useAuth";

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f3] px-6" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#d6e4d9] border-t-[#3f7854]" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-[#60736b]">Restoring your session…</p>
      </div>
    </main>
  );
}

export function PublicOnlyRoute({ children }) {
  const { accountDestination, status } = useAuth();

  if (status === "loading") return <LoadingScreen />;
  if (status === "authenticated") {
    return <Navigate to={accountDestination || "/dashboard"} replace />;
  }

  return children;
}

export function RequireAuth({ children, requireConsent = false }) {
  const { status, student } = useAuth();
  const location = useLocation();

  if (status === "loading") return <LoadingScreen />;
  if (status !== "authenticated") {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (requireConsent && !hasCurrentConsent(student)) {
    return <Navigate to="/consent" replace />;
  }

  return children;
}
