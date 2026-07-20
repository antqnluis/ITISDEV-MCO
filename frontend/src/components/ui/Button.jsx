const buttonVariants = {
  primary: "bg-brand text-white shadow-[0_6px_18px_rgb(34_90_56_/_0.2)] hover:bg-brand-hover active:translate-y-px focus-visible:outline-brand-deep disabled:bg-line-strong disabled:shadow-none disabled:hover:bg-line-strong",
  secondary: "border border-line-strong bg-surface text-brand-deep shadow-field hover:border-brand/40 hover:bg-brand-wash active:translate-y-px focus-visible:outline-brand",
};

const buttonSizes = {
  default: "min-h-14 px-5 text-base",
  compact: "min-h-11 px-4 text-sm",
};

function Button({
  children,
  className = "",
  fullWidth = true,
  size = "default",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-70 ${fullWidth ? "w-full" : ""} ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
