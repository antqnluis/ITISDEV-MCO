import { useState } from "react";
import Button from "../ui/Button";
import SelectInput from "../ui/SelectInput";
import TextInput from "../ui/TextInput";

const recordTypes = ["Assignment", "Quiz", "Exam", "Presentation", "Project", "Other"];
const submissionStatuses = ["Upcoming", "Submitted", "Late", "Missed"];
const workloads = ["Light", "Moderate", "Heavy"];

function AcademicRecordForm({ course, onCancel, onSave }) {
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

        if (score !== null && (maxScore === null || maxScore <= 0 || score > maxScore)) {
            setScoreError("Enter a maximum score that is at least the score received.");
            return;
        }

        onSave({
            course_id: course.id,
            course_code: course.code,
            course_name: course.name,
            record_type: form.record_type,
            title: form.title.trim(),
            due_at: new Date(`${form.due_date}T23:59:00`).toISOString(),
            submission_status: form.submission_status,
            score,
            max_score: maxScore,
            estimated_workload: form.estimated_workload,
            estimated_hours: Number(form.estimated_hours),
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="rounded-xl bg-[#eef5ef] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#63806f]">Adding record to</p>
                <p className="mt-1 text-sm font-semibold text-[#285b3d]">{course.code} <span className="font-normal text-[#5e7469]">· {course.name}</span></p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput id="record-type" label="Record Type" name="record_type" value={form.record_type} onChange={update}>
                    {recordTypes.map((type) => <option key={type} value={type.toLowerCase()}>{type}</option>)}
                </SelectInput>
                <TextInput id="record-title" label="Title" name="title" value={form.title} onChange={update} placeholder="MCO 1" maxLength={300} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="record-due-date" label="Due Date" name="due_date" type="date" value={form.due_date} onChange={update} required />
                <SelectInput id="record-status" label="Submission Status" name="submission_status" value={form.submission_status} onChange={update}>
                    {submissionStatuses.map((status) => <option key={status} value={status.toLowerCase()}>{status}</option>)}
                </SelectInput>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <TextInput id="record-score" label="Score" helper="Optional" name="score" type="number" min="0" step="0.01" value={form.score} onChange={update} />
                <TextInput id="record-max-score" label="Maximum Score" helper="Optional when no score is available yet" name="max_score" type="number" min="0.01" step="0.01" value={form.max_score} onChange={update} error={scoreError} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput id="record-workload" label="Estimated Workload" name="estimated_workload" value={form.estimated_workload} onChange={update}>
                    {workloads.map((workload) => <option key={workload} value={workload.toLowerCase()}>{workload}</option>)}
                </SelectInput>
                <TextInput id="record-hours" label="Estimated Time Required (hours)" name="estimated_hours" type="number" min="0.25" step="0.25" value={form.estimated_hours} onChange={update} placeholder="4" required />
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="compact" fullWidth={false} onClick={onCancel}>Cancel</Button>
                <Button type="submit" size="compact" fullWidth={false}>Add record</Button>
            </div>
        </form>
    );
}

export default AcademicRecordForm;
