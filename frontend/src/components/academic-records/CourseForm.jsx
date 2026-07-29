import { useState } from "react";
import Button from "../ui/Button";
import TextInput from "../ui/TextInput";

function CourseForm({ isSubmitting = false, onCancel, onSave, submissionError = "" }) {
    const [form, setForm] = useState({ code: "", name: "" });

    function update(event) {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    function submit(event) {
        event.preventDefault();
        onSave(form);
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            {submissionError && (
                <div role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-[#fff3f1] px-4 py-3 text-sm font-medium text-danger">
                    {submissionError}
                </div>
            )}
            <TextInput
                id="course-code"
                label="Course Code"
                name="code"
                value={form.code}
                onChange={update}
                placeholder="ITISDEV"
                maxLength={30}
                required
                disabled={isSubmitting}
            />
            <TextInput
                id="course-name"
                label="Course Name"
                name="name"
                value={form.name}
                onChange={update}
                placeholder="IT Systems Development"
                maxLength={150}
                required
                disabled={isSubmitting}
            />
            <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="compact" fullWidth={false} onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" size="compact" fullWidth={false} disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save course"}</Button>
            </div>
        </form>
    );
}

export default CourseForm;
