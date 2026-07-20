import { useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import { usePrototypeData } from "../context/usePrototypeData";

const recordTypes = ["assignment", "assessment", "grade_snapshot", "engagement_snapshot"];
const statuses = ["upcoming", "on_time", "late", "missed", "not_applicable"];
const inputClass = "h-11 w-full rounded-xl border border-[#d7e0da] bg-white px-3.5 text-sm text-[#18392d] outline-none transition placeholder:text-[#9aa8a1] focus:border-[#60906e] focus:ring-2 focus:ring-[#4b8360]/15";

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "Not dated";
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function RecordForm({ record, onSave, onCancel }) {
  const [form, setForm] = useState({
    course_code: record?.course_code || "",
    course_name: record?.course_name || "",
    record_type: record?.record_type || "assignment",
    title: record?.title || "",
    due_at: toLocalDateTime(record?.due_at),
    submitted_at: toLocalDateTime(record?.submitted_at),
    submission_status: record?.submission_status || "upcoming",
    score: record?.score ?? "",
    max_score: record?.max_score ?? "",
  });

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    const hasScorePair = form.score !== "" && form.max_score !== "";
    onSave({
      ...record,
      course_code: form.course_code.trim().toUpperCase(),
      course_name: form.course_name.trim(),
      record_type: form.record_type,
      title: form.title.trim(),
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      submitted_at: form.submitted_at ? new Date(form.submitted_at).toISOString() : null,
      submission_status: form.submission_status,
      score: hasScorePair ? Number(form.score) : null,
      max_score: hasScorePair ? Number(form.max_score) : null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[0.55fr_1.45fr]">
        <div><label htmlFor="course-code" className="mb-1.5 block text-sm font-semibold text-[#345449]">Course code</label><input id="course-code" name="course_code" required value={form.course_code} onChange={update} className={inputClass} placeholder="ITISDEV" /></div>
        <div><label htmlFor="course-name" className="mb-1.5 block text-sm font-semibold text-[#345449]">Course name</label><input id="course-name" name="course_name" required value={form.course_name} onChange={update} className={inputClass} placeholder="IT Systems Development" /></div>
      </div>
      <div><label htmlFor="record-title" className="mb-1.5 block text-sm font-semibold text-[#345449]">Record title</label><input id="record-title" name="title" required value={form.title} onChange={update} className={inputClass} placeholder="Assignment, exam, or snapshot title" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="record-type" className="mb-1.5 block text-sm font-semibold text-[#345449]">Record type</label><select id="record-type" name="record_type" value={form.record_type} onChange={update} className={inputClass}>{recordTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></div>
        <div><label htmlFor="submission-status" className="mb-1.5 block text-sm font-semibold text-[#345449]">Submission status</label><select id="submission-status" name="submission_status" value={form.submission_status} onChange={update} className={inputClass}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="due-at" className="mb-1.5 block text-sm font-semibold text-[#345449]">Due date <span className="font-normal text-[#8a9992]">(optional)</span></label><input id="due-at" name="due_at" type="datetime-local" value={form.due_at} onChange={update} className={inputClass} /></div>
        <div><label htmlFor="submitted-at" className="mb-1.5 block text-sm font-semibold text-[#345449]">Submitted at <span className="font-normal text-[#8a9992]">(optional)</span></label><input id="submitted-at" name="submitted_at" type="datetime-local" value={form.submitted_at} onChange={update} className={inputClass} /></div>
      </div>
      <div className="rounded-2xl border border-[#e0e7e2] bg-[#fafbf9] p-5">
        <div><h3 className="text-sm font-semibold text-[#29483b]">Score <span className="font-normal text-[#8a9992]">(optional)</span></h3><p className="mt-1 text-xs text-[#718078]">Enter both fields together. The percentage is calculated automatically.</p></div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div><label htmlFor="score" className="mb-1.5 block text-xs font-semibold text-[#60736a]">Score earned</label><input id="score" name="score" type="number" min="0" step="0.01" required={form.max_score !== ""} value={form.score} onChange={update} className={inputClass} /></div>
          <span className="pb-3 text-[#8b9892]">/</span>
          <div><label htmlFor="max-score" className="mb-1.5 block text-xs font-semibold text-[#60736a]">Maximum score</label><input id="max-score" name="max_score" type="number" min="0.01" step="0.01" required={form.score !== ""} value={form.max_score} onChange={update} className={inputClass} /></div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-[#ced9d1] px-5 text-sm font-semibold text-[#4f675d] hover:bg-[#f3f6f3]">Cancel</button>
        <button type="submit" className="h-11 rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">{record ? "Save changes" : "Add record"}</button>
      </div>
    </form>
  );
}

function AcademicRecords() {
  const { academicRecords, saveAcademicRecord, deleteAcademicRecord } = usePrototypeData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...academicRecords]
      .filter((record) => typeFilter === "all" || record.record_type === typeFilter)
      .filter((record) => statusFilter === "all" || record.submission_status === statusFilter)
      .filter((record) => !query || `${record.course_code} ${record.course_name} ${record.title}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return new Date(b.recorded_at) - new Date(a.recorded_at);
      });
  }, [academicRecords, search, typeFilter, statusFilter]);

  const upcoming = academicRecords.filter((record) => record.submission_status === "upcoming").length;
  const completed = academicRecords.filter((record) => record.submission_status === "on_time").length;
  const attention = academicRecords.filter((record) => ["late", "missed"].includes(record.submission_status)).length;
  const scored = academicRecords.filter((record) => record.grade_percentage !== null);
  const average = scored.length ? Math.round(scored.reduce((sum, record) => sum + Number(record.grade_percentage), 0) / scored.length) : null;

  function openNew() {
    setEditingRecord(null);
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingRecord(record);
    setModalOpen(true);
  }

  function handleSave(record) {
    saveAcademicRecord(record);
    setModalOpen(false);
  }

  function handleDelete(record) {
    if (window.confirm(`Delete “${record.title}”? Linked calendar events will also be removed.`)) deleteAcademicRecord(record.id);
  }

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow="Academic workload"
        title="Academic Records"
        description="Track assignments, assessments, grades, engagement snapshots, and their submission status by course."
        actions={<button type="button" onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49]"><AppIcon name="plus" className="size-[18px]" /> Add record</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Upcoming", value: upcoming, icon: "calendar", tone: "bg-[#edf2fb] text-[#476d9d]" },
          { label: "On time", value: completed, icon: "check", tone: "bg-[#e9f5f0] text-[#28705a]" },
          { label: "Needs attention", value: attention, icon: "warning", tone: "bg-[#fff0ee] text-[#a34d46]" },
          { label: "Average scored", value: average === null ? "—" : `${average}%`, icon: "records", tone: "bg-[#f1eff9] text-[#665a8e]" },
        ].map((stat) => <article key={stat.label} className="rounded-[18px] border border-[#e0e7e2] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl ${stat.tone}`}><AppIcon name={stat.icon} className="size-[18px]" /></span><div><p className="text-xl font-bold text-[#1d3e31]">{stat.value}</p><p className="text-xs text-[#74837d]">{stat.label}</p></div></div></article>)}
      </div>

      <section className="overflow-hidden rounded-[20px] border border-[#e0e7e2] bg-white shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
        <div className="grid gap-3 border-b border-[#e7ece8] p-5 sm:grid-cols-3 sm:p-6">
          <label className="relative sm:col-span-1"><span className="sr-only">Search records</span><AppIcon name="records" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#87958f]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search course or record" /></label>
          <select aria-label="Filter by record type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={inputClass}><option value="all">All record types</option>{recordTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select>
          <select aria-label="Filter by submission status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="all">All submission statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#fafbf9] text-[11px] font-bold uppercase tracking-[0.1em] text-[#7a8b84]"><tr><th className="px-6 py-3.5">Course & record</th><th className="px-4 py-3.5">Type</th><th className="px-4 py-3.5">Due / recorded</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5 text-right">Score</th><th className="w-24 px-4 py-3.5"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-[#edf0ed]">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="group transition hover:bg-[#fafcf9]">
                  <td className="px-6 py-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="book" className="size-4" /></span><div><p className="text-sm font-bold text-[#264739]">{record.course_code}</p><p className="mt-0.5 max-w-[290px] truncate text-sm text-[#60736b]">{record.title}</p><p className="mt-0.5 text-xs text-[#8a9791]">{record.course_name}</p></div></div></td>
                  <td className="px-4 py-4 text-xs font-medium capitalize text-[#60736b]">{record.record_type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-4 text-sm text-[#53675e]">{formatDate(record.due_at || record.recorded_at)}</td>
                  <td className="px-4 py-4"><StatusBadge value={record.submission_status} /></td>
                  <td className="px-4 py-4 text-right"><p className="text-sm font-bold text-[#29483b]">{record.grade_percentage === null ? "—" : `${record.grade_percentage}%`}</p>{record.score !== null && <p className="mt-0.5 text-xs text-[#8a9791]">{record.score}/{record.max_score}</p>}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button type="button" onClick={() => openEdit(record)} aria-label={`Edit ${record.title}`} className="grid size-8 place-items-center rounded-lg text-[#60736b] hover:bg-[#eaf2eb] hover:text-[#39724e]"><AppIcon name="edit" className="size-4" /></button><button type="button" onClick={() => handleDelete(record)} aria-label={`Delete ${record.title}`} className="grid size-8 place-items-center rounded-lg text-[#97706b] hover:bg-[#fff0ee] hover:text-[#a34d46]"><AppIcon name="trash" className="size-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#edf0ed] md:hidden">
          {filteredRecords.map((record) => (
            <article key={record.id} className="p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[#47775a]">{record.course_code}</p><h2 className="mt-1 text-sm font-semibold text-[#264739]">{record.title}</h2><p className="mt-1 text-xs text-[#7c8b85]">{record.record_type.replaceAll("_", " ")} · {formatDate(record.due_at || record.recorded_at)}</p></div><StatusBadge value={record.submission_status} /></div>
              <div className="mt-4 flex items-center justify-between"><p className="text-sm font-bold text-[#29483b]">{record.grade_percentage === null ? "Not scored" : `${record.grade_percentage}%`}</p><div className="flex gap-1"><button type="button" onClick={() => openEdit(record)} className="grid size-9 place-items-center rounded-lg bg-[#f1f5f1] text-[#60736b]"><AppIcon name="edit" className="size-4" /></button><button type="button" onClick={() => handleDelete(record)} className="grid size-9 place-items-center rounded-lg bg-[#fff1ef] text-[#a34d46]"><AppIcon name="trash" className="size-4" /></button></div></div>
            </article>
          ))}
        </div>

        {filteredRecords.length === 0 && <div className="px-6 py-14 text-center"><AppIcon name="records" className="mx-auto size-7 text-[#799087]" /><h2 className="mt-3 font-serif text-xl font-semibold text-[#29483b]">No matching records</h2><p className="mt-1 text-sm text-[#718078]">Try clearing a filter or add a new academic record.</p></div>}
        <footer className="border-t border-[#edf0ed] bg-[#fafbf9] px-6 py-3 text-xs text-[#7b8984]">Showing {filteredRecords.length} of {academicRecords.length} records</footer>
      </section>

      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} title={editingRecord ? "Edit academic record" : "Add academic record"} description="Record types and statuses match the current academic_records schema.">
          <RecordForm record={editingRecord} onSave={handleSave} onCancel={() => setModalOpen(false)} />
        </Modal>
      )}
    </AppShell>
  );
}

export default AcademicRecords;
