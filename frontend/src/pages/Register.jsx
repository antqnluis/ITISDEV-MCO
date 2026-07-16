import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";

const textInputClassName = "h-[61px] w-full rounded-[15px] border border-[#d8e0dc] bg-white px-5 text-lg text-[#10251e] shadow-[0_2px_4px_rgba(32,48,57,0.13)] outline-none transition focus:border-[#4b8360] focus:ring-2 focus:ring-[#4b8360]/20";

function Register() {
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    navigate("/consent");
  }

  return (
    <CenteredAuthLayout>
      <div className="w-full max-w-[500px]">
        <div className="mb-10">
          <Logo />
        </div>
        <PageHeader
          title="Create your account"
          subtitle="Start your wellness journey with AnimoLog."
        />

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextInput
            id="first-name"
            label="First Name"
            name="firstName"
            type="text"
            placeholder="Enter your first name"
            autoComplete="given-name"
            inputClassName={textInputClassName}
          />

          <TextInput
            id="last-name"
            label="Last Name"
            name="lastName"
            type="text"
            placeholder="Enter your last name"
            autoComplete="family-name"
            inputClassName={textInputClassName}
          />

          <TextInput
            id="email"
            label="DLSU Email"
            name="email"
            type="email"
            placeholder="Enter your DLSU email"
            autoComplete="email"
            inputClassName={textInputClassName}
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

          <Button type="submit" className="mt-3">Create Account</Button>
        </form>

        <p className="mt-9 text-center text-base text-[#58716a]">
          Already have an account?{" "}
          <Link
            to="/"
            className="font-medium text-[#326d46] underline underline-offset-2 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </CenteredAuthLayout>
  );
}
export default Register;
