function SelectionCard({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-20 rounded-2xl border p-4 text-left text-sm font-semibold shadow-field transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-24 sm:p-5 sm:text-base ${selected ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-surface text-copy hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"}`}
    >
      <span className="flex items-center justify-between gap-3">
        {label}
        <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${selected ? "border-brand bg-brand text-white" : "border-line-strong bg-white"}`}>
          {selected && "✓"}
        </span>
      </span>
    </button>
  );
}

export default SelectionCard;
