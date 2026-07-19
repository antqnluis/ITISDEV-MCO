function MetricCard({ icon, title, value, badge, children }) {
  return (
    <article className="rounded-[12px] border border-[#efeceb] bg-white p-5 shadow-[0_2px_6px_rgba(16,37,30,0.04)]">
      <div className="flex items-start gap-4">
        {icon && <div className="w-9 h-9 rounded-md bg-[#f3faf5] flex items-center justify-center text-[#2f6b4f]">{icon}</div>}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#163d2f]">{title}</h4>
            {badge && <span className="ml-3 rounded-full bg-[#fff6e8] px-3 py-1 text-xs text-[#a86a1a]">{badge}</span>}
          </div>
          <div className="mt-3 text-2xl font-semibold text-[#10251e]">{value}</div>
          {children && <p className="mt-3 text-sm text-[#59706a]">{children}</p>}
        </div>
      </div>
    </article>
  );
}

export default MetricCard;
