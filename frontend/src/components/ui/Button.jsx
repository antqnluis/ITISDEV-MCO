const buttonVariants = {
  primary: "bg-[#4b8360] text-white shadow-[0_5px_14px_rgba(37,89,58,0.24)] hover:bg-[#427756] focus-visible:outline-[#285d3b] disabled:cursor-not-allowed disabled:bg-[#afc0b3] disabled:shadow-none disabled:hover:bg-[#afc0b3]",
  secondary: "border border-[#b7c8bb] bg-white text-[#326d46] shadow-[0_2px_4px_rgba(32,48,57,0.07)] hover:bg-[#f3f8f2] focus-visible:outline-[#4b8360]"
};

function Button({ children, className = "", type = "button", variant = "primary", ...props }) {
  return (
    <button
      type={type}
      className={`h-16 w-full rounded-[15px] text-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
