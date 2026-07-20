function SummaryItem({ label, value }) {
  return (
    <div className="rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-deep shadow-[0_1px_2px_rgb(24_55_45_/_0.04)] sm:text-sm">
      <span className="font-medium text-copy">{label}: </span>{value}
    </div>
  );
}

function WeeklySummaryCard({ checkIn, moodLabel, studyHoursLabel }) {
  return (
    <section className="rounded-2xl border border-brand/10 bg-brand-soft p-5 sm:p-6" aria-label="This week's snapshot">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-brand">This Week&apos;s Snapshot</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <SummaryItem label="Stress" value={checkIn.stress_level ? `${checkIn.stress_level}/5` : "Not added"} />
        <SummaryItem label="Mood" value={moodLabel || "Not added"} />
        <SummaryItem label="Sleep" value={checkIn.sleep_quality ? `${checkIn.sleep_quality}/5` : "Not added"} />
        <SummaryItem label="Energy" value={checkIn.energy_level ? `${checkIn.energy_level}/5` : "Not added"} />
        <SummaryItem label="Study Time" value={studyHoursLabel || "Not added"} />
        <SummaryItem label="Motivation" value={checkIn.motivation_level ? `${checkIn.motivation_level}/5` : "Not added"} />
        <SummaryItem label="Burnout" value={checkIn.burnout_level ? `${checkIn.burnout_level}/5` : "Not added"} />
        <SummaryItem label="Reflection" value={checkIn.reflection.trim() ? "Added" : "Not added"} />
      </div>
    </section>
  );
}

export default WeeklySummaryCard;
