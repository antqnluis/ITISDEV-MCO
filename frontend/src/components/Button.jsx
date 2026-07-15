function Button({ children, className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`h-16 w-full rounded-[15px] bg-[#4b8360] text-lg font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.24)] transition hover:bg-[#427756] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d3b] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
