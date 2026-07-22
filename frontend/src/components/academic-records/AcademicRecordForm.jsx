import { useState } from "react";
import Button from "../ui/Button";
import SelectInput from "../ui/SelectInput";
import TextInput from "../ui/TextInput";

const recordTypes = [
    { value: "assignment", label: "Assignment" },
    { value: "assessment", label: "Assessment" },
    { value: "grade_snapshot", label: "Grade snapshot" },
    { value: "engagement_snapshot", label: "Engagement snapshot" },
];

const submissionStatuses = [
    { value: "upcoming", label: "Upcoming" },
    { value: "on_time", label: "On time" },
    { value: "late", label: "Late" },
    { value: "missed", label: "Missed" },
    { value: "not_applicable", label: "Not applicable" },
];

function AcademicRecordForm({
    course,
    isSubmitting = false,
    onCancel,
    onSave,
    submissionError = "",
}) {
    const [form, setForm] = useState({
        record_type: "assignment",
        title: "",
        due_date: "",
        submission_status: "upcoming",
        score: "",
        max_score: "",
        estimated_workload: "moderate",
        estimated_hours: "",
    });
    const [scoreError, setScoreError] = useState("");

    function update(event) {
        setScoreError("");
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    function submit(event) {
        event.preventDefault();
        const score = form.score === "" ? null : Number(form.score);
        const maxScore = form.max_score === "" ? null : Number(form.max_score);

        if ((score === null) !== (maxScore === null)) {
            setScoreError("Enter both the score and maximum score, or leave both blank.");
            return;
        }
        if (score !== null && (maxScore <= 0 || score > maxScore)) {
            setScoreError("Enter a maximum score that is at least the score received.");
            return;
        }

        onSave({
            course_id: course.id,
            record_type: form.record_type,
            title: form.title.trim(),
            due_at: form.due_date
                ? new Date(`${form.due_date}T23:59:00`).toISOString()
                : null,
            submission_status: form.submission_status,
            score,
            max_score: maxScore,
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            {submissionError && (
                <div role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-[#fff3f1] px-4 py-3 text-sm font-medium text-danger">
                    {submissionError}
                </div>
            )}
            <div className="rounded-xl bg-[#eef5ef] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#63806f]">Adding record to</p>
                <p className="mt-1 text-sm font-semibold text-[#285b3d]">{course.code} <span className="font-normal text-[#5e7469]">· {course.name}</span></p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput id="record-type" label="Record Type" name="record_type" value={form.record_type} onChange={update} disabled={isSubmitting}>
                    {recordTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </SelectInput>
                <TextInput id="record-title" label="Title" name="title" value={form.title} onChange={update} placeholder="MCO 1" maxLength={300} required disabled={isSubmitting} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="record-due-date" label="Due Date" helper="Optional" name="due_date" type="date" value={form.due_date} onChange={update} disabled={isSubmitting} />
                <SelectInput id="record-status" label="Submission Status" name="submission_status" value={form.submission_status} onChange={update} disabled={isSubmitting}>
                    {submissionStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </SelectInput>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="record-score" label="Score" helper="Optional; enter together with maximum score" name="score" type="number" min="0" step="0.01" value={form.score} onChange={update} disabled={isSubmitting} />
                <TextInput id="record-max-score" label="Maximum Score" helper="Optional; enter together with score" name="max_score" type="number" min="0.01" step="0.01" value={form.max_score} onChange={update} error={scoreError} disabled={isSubmitting} />
            </div>
            <section className="rounded-xl border border-dashed border-[#cbd8ce] bg-[#f7faf7] p-4" aria-label="Coming soon: workload estimates">
                <div className="mb-4">
                    <p className="text-sm font-semibold text-[#355b48]">Workload estimates · Coming soon</p>
                    <p className="mt-1 text-xs leading-5 text-[#718078]">Estimated workload and time required are not saved yet. These fields will be enabled in a future update.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 opacity-65">
                    <SelectInput id="record-workload" label="Estimated Workload" name="estimated_workload" value={form.estimated_workload} onChange={update} disabled>
                        <option value="moderate">Moderate</option>
                    </SelectInput>
                    <TextInput id="record-hours" label="Estimated Time Required (hours)" name="estimated_hours" type="number" value={form.estimated_hours} onChange={update} placeholder="Coming soon" disabled />
                </div>
            </section>
            <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="compact" fullWidth={false} onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" size="compact" fullWidth={false} disabled={isSubmitting}>{isSubmitting ? "Adding…" : "Add record"}</Button>
            </div>
        </form>
    );
}

export default AcademicRecordForm;
