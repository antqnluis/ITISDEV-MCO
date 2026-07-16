function PageHeader({
  title,
  subtitle,
  className = ""
}) {
  return (
    <header className={`mb-12 ${className}`}>
      <h1 className="font-serif text-[42px] font-semibold leading-none tracking-[-0.045em] text-[#10251e] sm:text-[44px]">
        {title}
      </h1>
      {subtitle && <p className="mt-4 text-xl leading-6 text-[#59706a]">{subtitle}</p>}
    </header>
  );
}

export default PageHeader;
