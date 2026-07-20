const variants = {
  scheduled: "bg-[#eaf3eb] text-[#39704c]",
  completed: "bg-[#e9f5f0] text-[#28705a]",
  cancelled: "bg-[#f1f1ef] text-[#747b77]",
  upcoming: "bg-[#edf2fb] text-[#476d9d]",
  on_time: "bg-[#e9f5f0] text-[#28705a]",
  late: "bg-[#fff4df] text-[#9a651f]",
  missed: "bg-[#fdeceb] text-[#aa4d45]",
  not_applicable: "bg-[#f1f1ef] text-[#747b77]",
  low: "bg-[#e9f5f0] text-[#28705a]",
  moderate: "bg-[#fff4df] text-[#9a651f]",
  high: "bg-[#fdeceb] text-[#aa4d45]",
};

function StatusBadge({ value, label }) {
  const normalized = value || "not_applicable";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[normalized] || variants.not_applicable}`}>
      {label || normalized.replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
