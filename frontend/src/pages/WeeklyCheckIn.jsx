import { useState } from "react";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
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

const inputClass = "h-11 w-full rounded-xl border border-[#d7e0da] bg-white px-3.5 text-sm text-[#18392d] outline-none transition placeholder:text-[#9aa8a1] focus:border-[#60906e] focus:ring-2 focus:ring-[#4b8360]/15";

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

function emptyCourse() {
  return { id: "", course_code: "", course_name: "", workload_difficulty: null, unclear_instruction_level: null, grading_concern_level: null, professor_approachability_concern: null, groupmate_issue_level: null, concern_notes: "" };
}

function RatingSelector({ field, value, onChange }) {
  return (
    <fieldset className="rounded-2xl border border-[#e1e8e3] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold text-[#29483b]">{field.label}</legend>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${field.inverse && value >= 4 ? "bg-[#fdeceb] text-[#a34d46]" : "bg-[#edf5ef] text-[#47775a]"}`}>{ratingLabel(field, value)}</span>
      </div>
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" onClick={() => onChange(field.key, rating)} aria-label={`${field.label}: ${rating}`} className={`grid h-10 flex-1 place-items-center rounded-xl text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-[#4b8360] ${value === rating ? "bg-[#3f7854] text-white shadow-[0_4px_10px_rgba(45,101,66,0.2)]" : "bg-[#f2f5f2] text-[#61736c] hover:bg-[#e6eee7]"}`}>{rating}</button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#8a9892]"><span>{field.low}</span><span>{field.high}</span></div>
    </fieldset>
  );
}

function CheckInForm({ checkIn, existingLogs, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    id: checkIn?.id || "",
    week_start: checkIn?.week_start || getCurrentWeekStart(),
    stress_level: checkIn?.stress_level || 3,
    mood_level: checkIn?.mood_level || 3,
    sleep_quality: checkIn?.sleep_quality || 3,
    motivation_level: checkIn?.motivation_level || 3,
    burnout_level: checkIn?.burnout_level || 3,
    energy_level: checkIn?.energy_level || 3,
    available_study_hours: checkIn?.available_study_hours ?? 8,
    reflection: checkIn?.reflection || "",
  }));
  const [courses, setCourses] = useState(() => existingLogs.length ? existingLogs.map((log) => ({ ...log })) : []);

  function setRating(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCourse(index, key, value) {
    setCourses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  function submit(event) {
    event.preventDefault();
    onSave(
      { ...form, available_study_hours: Number(form.available_study_hours), reflection: form.reflection.trim() || null },
      courses.filter((course) => (
        course.course_code.trim()
        && course.course_name.trim()
        && (concernFields.some((field) => course[field.key] !== null) || course.concern_notes.trim())
      )).map((course) => ({ ...course, course_code: course.course_code.trim().toUpperCase(), course_name: course.course_name.trim(), concern_notes: course.concern_notes.trim() || null }))
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="rounded-2xl bg-[#edf5ef] p-4 text-sm text-[#476357]">
        <span className="font-semibold text-[#285b3d]">Week of {formatWeek(form.week_start)}.</span> Choose the response that best reflects this week, not just today.
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ratingFields.map((field) => <RatingSelector key={field.key} field={field} value={form[field.key]} onChange={setRating} />)}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-[0.65fr_1.35fr]">
        <div><label htmlFor="study-hours" className="mb-1.5 block text-sm font-semibold text-[#345449]">Available study hours this week</label><input id="study-hours" type="number" min="0" max="168" step="0.5" required value={form.available_study_hours} onChange={(event) => setForm((current) => ({ ...current, available_study_hours: event.target.value }))} className={inputClass} /></div>
        <div><label htmlFor="reflection" className="mb-1.5 block text-sm font-semibold text-[#345449]">Weekly reflection <span className="font-normal text-[#8a9992]">(optional)</span></label><textarea id="reflection" rows={3} maxLength={4000} value={form.reflection} onChange={(event) => setForm((current) => ({ ...current, reflection: event.target.value }))} className={`${inputClass} h-auto py-3`} placeholder="What made this week feel manageable or difficult?" /></div>
      </div>

      <div className="mt-8 border-t border-[#e2e8e3] pt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="font-serif text-xl font-semibold text-[#173e30]">Course concerns</h3><p className="mt-1 text-sm text-[#718078]">Optional ratings use 1 for little concern and 5 for severe concern.</p></div>
          <button type="button" onClick={() => setCourses((items) => [...items, emptyCourse()])} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#bad0c0] px-3.5 text-sm font-semibold text-[#39724e] hover:bg-[#eff5f0]"><AppIcon name="plus" className="size-4" /> Add course</button>
        </div>
        <div className="mt-5 space-y-4">
          {courses.length === 0 && <div className="rounded-2xl border border-dashed border-[#ccd9d0] bg-[#fafbf9] p-6 text-center text-sm text-[#77867f]">No course-specific concerns added.</div>}
          {courses.map((course, index) => (
            <section key={course.id || `new-${index}`} className="rounded-2xl border border-[#dfe7e1] bg-[#fafbf9] p-5">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-[0.55fr_1.45fr]">
                  <input aria-label="Course code" required value={course.course_code} onChange={(event) => updateCourse(index, "course_code", event.target.value)} className={inputClass} placeholder="Course code" />
                  <input aria-label="Course name" required value={course.course_name} onChange={(event) => updateCourse(index, "course_name", event.target.value)} className={inputClass} placeholder="Course name" />
                </div>
                <button type="button" aria-label="Remove course" onClick={() => setCourses((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 shrink-0 place-items-center rounded-xl text-[#a06a64] hover:bg-[#fff0ee]"><AppIcon name="trash" className="size-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {concernFields.map((field) => (
                  <label key={field.key} className="text-xs font-semibold text-[#60736a]">{field.label}<select value={course[field.key] ?? ""} onChange={(event) => updateCourse(index, field.key, event.target.value ? Number(event.target.value) : null)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e0da] bg-white px-2 text-sm font-medium outline-none focus:border-[#60906e]"><option value="">—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                ))}
              </div>
              <textarea aria-label="Course concern notes" rows={2} maxLength={4000} value={course.concern_notes || ""} onChange={(event) => updateCourse(index, "concern_notes", event.target.value)} className={`${inputClass} mt-4 h-auto py-3`} placeholder="Notes about workload, instruction, grading, or group dynamics" />
            </section>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#e2e8e3] pt-6 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-[#ced9d1] px-5 text-sm font-semibold text-[#4f675d] hover:bg-[#f3f6f3]">Cancel</button>
        <button type="submit" className="h-11 rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">{checkIn ? "Save check-in" : "Submit check-in"}</button>
      </div>
    </form>
  );
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
          <CheckInForm checkIn={current} existingLogs={current ? courseLogs.filter((log) => log.check_in_id === current.id) : []} onSave={handleSave} onCancel={() => setFormOpen(false)} />
        </Modal>
      )}
    </AppShell>
  );
}

export default WeeklyCheckIn;
