function Logo({ className = "", inverse = false }) {
  return (
    <div
      className={`flex items-center gap-2.5 ${inverse ? "text-white" : "text-[#174c3a]"} ${className}`}
    >
      <svg
        aria-hidden="true"
        className="size-9 shrink-0"
        focusable="false"
        viewBox="0 0 36 36"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          width="36"
          height="36"
          rx="9"
          fill={inverse ? "#4f9166" : "#34734d"}
        />
        <path
          d="M9.5 27.5 16.2 9.2C16.6 8.1 17.2 7.4 18 7"
          fill="none"
          stroke="#fff8dc"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
        <path
          d="M18 7c.8.4 1.4 1.1 1.8 2.2l6.7 18.3"
          fill="none"
          stroke="#fff8dc"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
        <path
          d="M5.5 20h6l2.3-3.7 3.2 7.8 3.2-5.6 1.8 1.5h8.5"
          fill="none"
          stroke={inverse ? "#d6f0cf" : "#bfe8c5"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="text-lg font-semibold tracking-[-0.015em]">AnimoLog</span>
    </div>
  );
}

export default Logo;
