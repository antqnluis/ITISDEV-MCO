function InformationCard({ title, items, children, className = "" }) {
  return (
    <section className={`surface-card p-5 sm:p-6 ${className}`}>
      <h2 className="text-base font-bold text-ink sm:text-lg">{title}</h2>

      {items && (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-copy sm:text-base">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {children && <div className="mt-4 space-y-3 text-sm leading-6 text-copy sm:text-base">{children}</div>}
    </section>
  );
}

export default InformationCard;
