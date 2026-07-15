import { Link } from "react-router-dom";
import SplitAuthLayout from "../components/layout/SplitAuthLayout";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import PasswordInput from "../components/ui/PasswordInput";
import TextInput from "../components/ui/TextInput";

function Login() {
  function handleSubmit(event) {
    event.preventDefault();
  }

  function handleForgotPassword(event) {
    event.preventDefault();
  }

  return (
    <SplitAuthLayout>
      <div className="w-full max-w-[500px]">
        <PageHeader title="Welcome back" subtitle="Continue your wellness journey." />

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextInput
            id="email"
            label="University Email"
            name="email"
            type="email"
            placeholder="Enter your DLSU email"
            autoComplete="email"
            inputClassName="h-[61px] w-full rounded-[15px] border border-[#d8e0dc] bg-white px-5 text-lg text-[#10251e] shadow-[0_2px_4px_rgba(32,48,57,0.13)] outline-none transition focus:border-[#4b8360] focus:ring-2 focus:ring-[#4b8360]/20"
          />

          <PasswordInput
            id="password"
            label="Password"
            action={(
              <button type="button" onClick={handleForgotPassword} className="text-base text-[#4d7e56] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
                Forgot password?
              </button>
            )}
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <Button type="submit" className="mt-3">Continue</Button>
        </form>

        <div className="my-9 flex items-center gap-3.5 text-sm text-[#527068]" aria-label="or">
          <span className="h-px flex-1 bg-[#dce5dd]" />
          <span>or</span>
          <span className="h-px flex-1 bg-[#dce5dd]" />
        </div>

        <p className="text-center text-base text-[#58716a]">
          New to AnimoLog?{" "}
          <Link to="/register" className="font-medium text-[#326d46] underline underline-offset-2 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
            Create an account
          </Link>
        </p>

        <p className="mt-14 text-center text-sm leading-5 text-[#9aacb0]">
          By continuing, you agree to our <a href="#terms" onClick={(event) => event.preventDefault()} className="hover:underline">Terms</a> and{" "}
          <a href="#privacy" onClick={(event) => event.preventDefault()} className="hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </SplitAuthLayout>
  );
}

export default Login;
