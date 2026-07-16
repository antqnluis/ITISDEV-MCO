function InformationCard({ title, items, children }) {
  return (
    <section className="rounded-[15px] border border-[#d8e0dc] bg-white p-6 shadow-[0_2px_4px_rgba(32,48,57,0.07)]">
      <h2 className="text-lg font-semibold text-[#174635]">{title}</h2>

      {items && (
        <ul className="mt-4 space-y-3 text-base leading-6 text-[#59706a]">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#79a980]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {children && <div className="mt-4 space-y-3 text-base leading-6 text-[#59706a]">{children}</div>}
    </section>
  );
}

export default InformationCard;
