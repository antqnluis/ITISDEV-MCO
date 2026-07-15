function SelectionCard({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-24 rounded-[15px] border p-5 text-left text-base font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360] ${selected ? "border-[#4b8360] bg-[#edf6eb] text-[#174635]" : "border-[#d8e0dc] bg-white text-[#59706a] hover:border-[#a8c0ab]"}`}
    >
      <span className="flex items-center justify-between gap-3">
        {label}
        <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#4b8360] bg-[#4b8360]" : "border-[#b7c8bb]"}`}>
          {selected && <span className="size-2 rounded-full bg-white" />}
        </span>
      </span>
    </button>
  );
}

export default SelectionCard;
