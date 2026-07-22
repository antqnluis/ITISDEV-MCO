import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SplitAuthLayout from "../components/layout/SplitAuthLayout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";
import { useAuth } from "../context/useAuth";
import { validateLogin } from "../services/authValidation";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLogin(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const destination = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleForgotPassword(event) {
    event.preventDefault();
  }

  return (
    <SplitAuthLayout>
      <div className="w-full">
        <PageHeader
          eyebrow="Student wellness companion"
          title="Welcome back"
          subtitle="Continue your wellness journey."
        />

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {formError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-[#fff3f1] px-4 py-3 text-sm font-medium text-danger">
              {formError}
            </div>
          )}

          <TextInput
            id="email"
            label="University Email"
            name="email"
            type="email"
            placeholder="Enter your DLSU email"
            autoComplete="email"
            value={form.email}
            onChange={updateField}
            error={errors.email}
            disabled={isSubmitting}
          />

          <PasswordInput
            id="password"
            label="Password"
            action={(
              <button type="button" onClick={handleForgotPassword} className="rounded text-sm font-semibold text-brand transition hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                Forgot password?
              </button>
            )}
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={updateField}
            error={errors.password}
            disabled={isSubmitting}
          />

          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <div className="my-8 flex items-center gap-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-soft" aria-label="or">
          <span className="h-px flex-1 bg-line" />
          <span>or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <p className="text-center text-sm text-copy sm:text-base">
          New to AnimoLog?{" "}
          <Link to="/register" className="rounded font-semibold text-brand-deep underline decoration-brand/35 underline-offset-4 transition hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            Create an account
          </Link>
        </p>

        <p className="mt-12 text-center text-xs leading-5 text-soft sm:text-sm">
          By continuing, you agree to our <a href="#terms" onClick={(event) => event.preventDefault()} className="hover:underline">Terms</a> and{" "}
          <a href="#privacy" onClick={(event) => event.preventDefault()} className="hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </SplitAuthLayout>
  );
}

export default Login;
