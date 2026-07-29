import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SplitAuthLayout from "../components/layout/SplitAuthLayout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";
import { useAuth } from "../context/useAuth";
import { toRegistrationPayload, validateRegistration } from "../services/authValidation";

const initialForm = {
  first_name: "",
  last_name: "",
  student_number: "",
  email: "",
  password: "",
  confirm_password: "",
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await register(toRegistrationPayload(form));
      navigate("/consent", { replace: true });
    } catch (error) {
      const message = error.message || "Unable to create your account. Please try again.";
      if (message.toLowerCase().includes("student_number")) {
        setErrors((current) => ({ ...current, student_number: message }));
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout>
      <div className="w-full py-2">
        <PageHeader
          compact
          eyebrow="Join AnimoLog"
          title="Create your account"
          subtitle="Start your wellness journey with AnimoLog."
        />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-[#fff3f1] px-4 py-3 text-sm font-medium text-danger">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput id="first-name" label="First Name" name="first_name" type="text" placeholder="First name" autoComplete="given-name" maxLength={100} value={form.first_name} onChange={updateField} error={errors.first_name} disabled={isSubmitting} />
            <TextInput id="last-name" label="Last Name" name="last_name" type="text" placeholder="Last name" autoComplete="family-name" maxLength={100} value={form.last_name} onChange={updateField} error={errors.last_name} disabled={isSubmitting} />
          </div>

          <TextInput
            id="student-number"
            label="Student Number"
            name="student_number"
            type="text"
            placeholder="e.g. 20240001"
            autoComplete="off"
            minLength={4}
            maxLength={30}
            value={form.student_number}
            onChange={updateField}
            error={errors.student_number}
            disabled={isSubmitting}
          />

          <TextInput id="email" label="DLSU Email" name="email" type="email" placeholder="Enter your DLSU email" autoComplete="email" value={form.email} onChange={updateField} error={errors.email} disabled={isSubmitting} />

          <PasswordInput id="password" label="Password" name="password" placeholder="Enter your password" autoComplete="new-password" value={form.password} onChange={updateField} error={errors.password} disabled={isSubmitting} />

          <PasswordInput id="confirm-password" label="Confirm Password" name="confirm_password" placeholder="Confirm your password" autoComplete="new-password" value={form.confirm_password} onChange={updateField} error={errors.confirm_password} disabled={isSubmitting} />

          <Button type="submit" className="mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-copy sm:text-base">
          Already have an account?{" "}
          <Link to="/" className="rounded font-semibold text-brand-deep underline decoration-brand/35 underline-offset-4 transition hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            Sign in
          </Link>
        </p>
      </div>
    </SplitAuthLayout>
  );
}

export default Register;
