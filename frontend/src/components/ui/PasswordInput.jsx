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
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          id={id}
          type={isPasswordVisible ? "text" : "password"}
          className="form-control pr-14"
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-14 place-items-center rounded-r-[0.875rem] text-soft transition hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand"
        >
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}

export default PasswordInput;
