import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import SplitAuthLayout from "../components/layout/SplitAuthLayout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";
import { usePrototypeData } from "../context/usePrototypeData";

const initialForm = {
  first_name: "",
  last_name: "",
  student_number: "",
  email: "",
  password: "",
  confirm_password: ""
};

function validateRegistration(form) {
  const errors = {};
  const firstName = form.first_name.trim();
  const lastName = form.last_name.trim();
  const studentNumber = form.student_number.trim();
  const email = form.email.trim();

  if (!firstName) errors.first_name = "Enter your first name.";
  else if (firstName.length > 100) errors.first_name = "First name must be at most 100 characters.";

  if (!lastName) errors.last_name = "Enter your last name.";
  else if (lastName.length > 100) errors.last_name = "Last name must be at most 100 characters.";

  if (!studentNumber) errors.student_number = "Enter your student number.";
  else if (studentNumber.length < 4 || studentNumber.length > 30) errors.student_number = "Student number must contain 4–30 characters.";

  if (!email) errors.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  if (!form.password) errors.password = "Enter a password.";
  if (!form.confirm_password) errors.confirm_password = "Confirm your password.";
  else if (form.confirm_password !== form.password) errors.confirm_password = "Passwords do not match.";

  return errors;
}

function Register() {
  const navigate = useNavigate();
  const { profile, student, updateSettings } = usePrototypeData();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstInvalidField = Object.keys(nextErrors)[0];
      requestAnimationFrame(() => document.querySelector(`[name="${firstInvalidField}"]`)?.focus());
      return;
    }

    const registrationPayload = {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      student_number: form.student_number.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim()
    };

    updateSettings({
      ...student,
      student_number: registrationPayload.student_number,
      first_name: registrationPayload.first_name,
      last_name: registrationPayload.last_name,
      email: registrationPayload.email
    }, profile);
    navigate("/consent");
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              id="first-name"
              label="First Name"
              name="first_name"
              type="text"
              placeholder="First name"
              autoComplete="given-name"
              maxLength={100}
              required
              value={form.first_name}
              onChange={updateField}
              error={errors.first_name}
            />

            <TextInput
              id="last-name"
              label="Last Name"
              name="last_name"
              type="text"
              placeholder="Last name"
              autoComplete="family-name"
              maxLength={100}
              required
              value={form.last_name}
              onChange={updateField}
              error={errors.last_name}
            />
          </div>

          <TextInput
            id="student-number"
            label="Student Number"
            name="student_number"
            type="text"
            placeholder="Enter your student number"
            autoComplete="off"
            minLength={4}
            maxLength={30}
            required
            value={form.student_number}
            onChange={updateField}
            error={errors.student_number}
          />

          <TextInput
            id="email"
            label="DLSU Email"
            name="email"
            type="email"
            placeholder="Enter your DLSU email"
            autoComplete="email"
            required
            value={form.email}
            onChange={updateField}
            error={errors.email}
          />

          <PasswordInput
            id="password"
            label="Password"
            name="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={updateField}
            error={errors.password}
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm Password"
            name="confirm_password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
            value={form.confirm_password}
            onChange={updateField}
            error={errors.confirm_password}
          />

          <Button type="submit" className="mt-2">Create Account</Button>
        </form>

        <p className="mt-8 text-center text-sm text-copy sm:text-base">
          Already have an account?{" "}
          <Link
            to="/"
            className="rounded font-semibold text-brand-deep underline decoration-brand/35 underline-offset-4 transition hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Sign in
          </Link>
        </p>
      </div>
    </SplitAuthLayout>
  );
}
export default Register;
