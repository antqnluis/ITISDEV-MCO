function SummaryItem({ label, value }) {
  return (
    <div className="rounded-full bg-white/75 px-3 py-2 text-sm text-[#426b51]">
      <span className="text-[#6b8077]">{label}: </span>{value}
    </div>
  );
}

function WeeklySummaryCard({ checkIn, moodLabel, studyHoursLabel }) {
  return (
    <section className="rounded-[15px] bg-[#dcefd9] p-6" aria-label="This week's snapshot">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4b8360]">This Week&apos;s Snapshot</h2>
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
