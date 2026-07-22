import { useState } from "react";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import CheckInWizard from "../components/weekly-check-in/CheckInWizard";
import { usePrototypeData } from "../context/usePrototypeData";
import { getCurrentWeekStart } from "../data/demoData";

const ratingFields = [
  { key: "stress_level", label: "Stress level", low: "Very low", high: "Very high", inverse: true },
  { key: "mood_level", label: "Mood", low: "Very low", high: "Very good" },
  { key: "sleep_quality", label: "Sleep quality", low: "Very poor", high: "Very good" },
  { key: "motivation_level", label: "Motivation", low: "Very low", high: "Very high" },
  { key: "burnout_level", label: "Burnout", low: "Very low", high: "Very high", inverse: true },
  { key: "energy_level", label: "Energy", low: "Very low", high: "Very high" },
];

const concernFields = [
  { key: "workload_difficulty", label: "Workload" },
  { key: "unclear_instruction_level", label: "Unclear instructions" },
  { key: "grading_concern_level", label: "Grading" },
  { key: "professor_approachability_concern", label: "Approachability" },
  { key: "groupmate_issue_level", label: "Groupmates" },
];


function formatWeek(value) {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
}

function ratingLabel(field, value) {
  if (value === 1) return field.low;
  if (value === 5) return field.high;
  return ["", "", "Low", "Moderate", "High"][value];
}

function WeeklyCheckIn() {
  const { checkIns, courseLogs, dimensionScores, saveCheckIn } = usePrototypeData();
  const ordered = [...checkIns].sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
  const current = ordered.find((checkIn) => checkIn.week_start === getCurrentWeekStart()) || null;
  const [selectedId, setSelectedId] = useState(current?.id || ordered[0]?.id || null);
  const [formOpen, setFormOpen] = useState(false);
  const selected = checkIns.find((checkIn) => checkIn.id === selectedId) || ordered[0] || null;
  const selectedLogs = selected ? courseLogs.filter((log) => log.check_in_id === selected.id) : [];
  const selectedScore = selected ? dimensionScores.find((score) => score.check_in_id === selected.id) : null;

  function handleSave(checkIn, logs) {
    const saved = saveCheckIn(checkIn, logs);
    setSelectedId(saved.id);
    setFormOpen(false);
  }

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow="Weekly reflection"
        title="Weekly Check-in"
        description="Capture how the week felt and note course-specific concerns. Ratings use the same 1–5 scales stored by AnimoLog."
        actions={<button type="button" onClick={() => setFormOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49]"><AppIcon name={current ? "edit" : "plus"} className="size-[18px]" />{current ? "Update this week" : "Start check-in"}</button>}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[20px] border border-[#e0e7e2] bg-white p-4 shadow-[0_5px_20px_rgba(22,51,40,0.035)] lg:self-start">
          <h2 className="px-2 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Check-in history</h2>
          <div className="mt-1 space-y-1.5">
            {ordered.map((checkIn, index) => (
              <button key={checkIn.id} type="button" onClick={() => setSelectedId(checkIn.id)} className={`w-full rounded-xl px-3.5 py-3 text-left transition ${selected?.id === checkIn.id ? "bg-[#eaf3eb] ring-1 ring-[#c9dccd]" : "hover:bg-[#f5f7f5]"}`}>
                <div className="flex items-center justify-between gap-2"><span className={`text-sm font-semibold ${selected?.id === checkIn.id ? "text-[#285f3e]" : "text-[#40584e]"}`}>{index === 0 ? "This week" : `${index} week${index > 1 ? "s" : ""} ago`}</span>{index === 0 && <StatusBadge value="completed" label="Done" />}</div>
                <p className="mt-1 text-xs text-[#7b8984]">{formatWeek(checkIn.week_start)}</p>
              </button>
            ))}
          </div>
        </aside>

        {selected ? (
          <div className="space-y-6">
            <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Week of</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#173e30]">{formatWeek(selected.week_start)}</h2></div>
                <p className="text-xs text-[#7c8b85]">Submitted {new Date(selected.submitted_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ratingFields.map((field) => {
                  const value = selected[field.key];
                  return <div key={field.key} className="rounded-xl border border-[#e5ebe7] bg-[#fafbf9] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-[#52675e]">{field.label}</p><p className="text-lg font-bold text-[#244c39]">{value}<span className="text-xs text-[#89968f]">/5</span></p></div><p className="mt-2 text-xs text-[#7b8984]">{ratingLabel(field, value)}</p></div>;
                })}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[0.35fr_1fr]">
                <div className="rounded-xl bg-[#edf5ef] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#63806f]">Study time</p><p className="mt-2 text-xl font-bold text-[#285b3d]">{selected.available_study_hours} hours</p></div>
                <blockquote className="rounded-xl bg-[#f6f7f5] p-4 text-sm italic leading-6 text-[#60736b]">“{selected.reflection || "No reflection was added."}”</blockquote>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6">
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Calculated output</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Risk dimensions</h2></div><AppIcon name="sparkles" className="size-5 text-[#5b896a]" /></div>
                {selectedScore ? <div className="mt-5 space-y-3">{[
                  ["Academic engagement", selectedScore.academic_engagement_score], ["Personal wellbeing", selectedScore.personal_wellbeing_score], ["Logistical load", selectedScore.logistical_load_score], ["Role load", selectedScore.role_load_score], ["Course environment", selectedScore.course_environment_score],
                ].map(([label, value]) => <div key={label}><div className="flex items-center justify-between text-xs"><span className="font-medium text-[#5c7067]">{label}</span><span className="font-bold text-[#29483b]">{value}/100</span></div><div className="mt-1.5 h-1.5 rounded-full bg-[#e6ebe7]"><span className={`block h-full rounded-full ${value >= 70 ? "bg-[#c75d52]" : value >= 40 ? "bg-[#d49a46]" : "bg-[#4b9470]"}`} style={{ width: `${value}%` }} /></div></div>)}</div> : <div className="mt-5 rounded-xl bg-[#f5f7f5] p-5 text-sm leading-6 text-[#718078]">No dimension calculation is available for this check-in yet.</div>}
              </section>

              <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Course environment</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">{selectedLogs.length} course{selectedLogs.length === 1 ? "" : "s"} noted</h2></div>
                <div className="mt-4 space-y-3">
                  {selectedLogs.length ? selectedLogs.map((log) => {
                    const values = concernFields.map((field) => log[field.key]).filter(Boolean);
                    const peak = values.length ? Math.max(...values) : 0;
                    return <article key={log.id} className="rounded-xl border border-[#e5ebe7] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#29483b]">{log.course_code}</p><p className="mt-0.5 text-xs text-[#76867f]">{log.course_name}</p></div><StatusBadge value={peak >= 4 ? "high" : peak >= 3 ? "moderate" : "low"} label={`Peak ${peak}/5`} /></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-[#65776f]">{log.concern_notes || "Ratings only"}</p></article>;
                  }) : <div className="rounded-xl bg-[#f5f7f5] p-5 text-sm text-[#718078]">No course-specific concerns were recorded.</div>}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <section className="rounded-[20px] border border-dashed border-[#c5d3c9] bg-white p-12 text-center"><AppIcon name="check" className="mx-auto size-8 text-[#5b896a]" /><h2 className="mt-4 font-serif text-2xl font-semibold text-[#173e30]">No check-ins yet</h2><p className="mt-2 text-sm text-[#718078]">Start with a quick reflection for the current week.</p></section>
        )}
      </div>

      {formOpen && (
        <Modal open onClose={() => setFormOpen(false)} title={current ? "Update this week’s check-in" : "Weekly check-in"} description="Your responses describe the current Monday–Sunday week." size="max-w-5xl">
          <CheckInWizard initialCheckIn={current} existingLogs={current ? courseLogs.filter((log) => log.check_in_id === current.id) : []} onSave={handleSave} onCancel={() => setFormOpen(false)} />
        </Modal>
      )}
    </AppShell>
  );
}

export default WeeklyCheckIn;
