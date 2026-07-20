import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import SplitAuthLayout from "../components/layout/SplitAuthLayout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";

function Register() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
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
              name="firstName"
              type="text"
              placeholder="First name"
              autoComplete="given-name"
            />

            <TextInput
              id="last-name"
              label="Last Name"
              name="lastName"
              type="text"
              placeholder="Last name"
              autoComplete="family-name"
            />
          </div>

          <TextInput
            id="email"
            label="DLSU Email"
            name="email"
            type="email"
            placeholder="Enter your DLSU email"
            autoComplete="email"
          />

          <PasswordInput
            id="password"
            label="Password"
            name="password"
            placeholder="Enter your password"
            autoComplete="new-password"
          />

          <PasswordInput
            id="confirm-password"
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Confirm your password"
            autoComplete="new-password"
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
