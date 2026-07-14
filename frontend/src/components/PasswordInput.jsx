import { useState } from "react";

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PasswordInput({ id, label, action, ...props }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-base font-medium text-[#174635]">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          id={id}
          type={isPasswordVisible ? "text" : "password"}
          className="h-[61px] w-full rounded-[15px] border border-[#d8e0dc] bg-white px-5 pr-14 text-lg text-[#10251e] shadow-[0_2px_4px_rgba(32,48,57,0.07)] outline-none transition focus:border-[#4b8360] focus:ring-2 focus:ring-[#4b8360]/20"
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-14 place-items-center text-[#718478] focus-visible:rounded-r-[15px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4b8360]"
        >
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}

export default PasswordInput;
