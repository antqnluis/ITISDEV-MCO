import { useState } from "react";
import Button from "../ui/Button";
import TextInput from "../ui/TextInput";

function CourseForm({ onCancel, onSave }) {
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
            <TextInput
                id="course-code"
                label="Course Code"
                name="code"
                value={form.code}
                onChange={update}
                placeholder="ITISDEV"
                maxLength={30}
                required
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
            />
            <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" size="compact" fullWidth={false} onClick={onCancel}>Cancel</Button>
                <Button type="submit" size="compact" fullWidth={false}>Save course</Button>
            </div>
        </form>
    );
}

export default CourseForm;
