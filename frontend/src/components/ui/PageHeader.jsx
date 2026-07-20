function PageHeader({
  align = "left",
  compact = false,
  eyebrow,
  title,
  subtitle,
  className = ""
}) {
  const alignmentClassName = align === "center" ? "text-center" : "text-left";

  return (
    <header className={`${compact ? "mb-7" : "mb-9 sm:mb-10"} ${alignmentClassName} ${className}`}>
      {eyebrow && (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-brand">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-[2.35rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
        {title}
      </h1>
      {subtitle && <p className="mt-4 text-lg leading-7 text-copy sm:text-xl">{subtitle}</p>}
    </header>
  );
}

export default PageHeader;
