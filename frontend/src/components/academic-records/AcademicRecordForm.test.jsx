import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AcademicRecordForm from "./AcademicRecordForm";

const course = {
    id: "11111111-1111-4111-8111-111111111111",
    code: "ITISDEV",
    name: "IT Systems Development",
};
const record = {
    id: "22222222-2222-4222-8222-222222222222",
    course_id: course.id,
    source: "manual",
    record_type: "assessment",
    title: "Midterm exam",
    due_at: "2026-08-15T15:59:00.000Z",
    submission_status: "on_time",
    score: 18,
    max_score: 20,
};

describe("AcademicRecordForm editing", () => {
    it("prefills editable fields and emits a fixed-course update payload", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <AcademicRecordForm
                course={course}
                record={record}
                onSave={onSave}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText("Editing record in")).toBeInTheDocument();
        expect(screen.getByLabelText("Record Type")).toHaveValue("assessment");
        expect(screen.getByLabelText("Title")).toHaveValue("Midterm exam");
        expect(screen.getByLabelText("Due Date")).toHaveValue("2026-08-15");
        expect(screen.getByLabelText("Submission Status")).toHaveValue("on_time");
        expect(screen.getByLabelText("Score")).toHaveValue(18);
        expect(screen.getByLabelText("Maximum Score")).toHaveValue(20);

        await user.clear(screen.getByLabelText("Title"));
        await user.type(screen.getByLabelText("Title"), "Updated midterm");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(onSave).toHaveBeenCalledWith({
            record_type: "assessment",
            title: "Updated midterm",
            due_at: "2026-08-15T15:59:00.000Z",
            submission_status: "on_time",
            score: 18,
            max_score: 20,
        });
        expect(onSave.mock.calls[0][0]).not.toHaveProperty("course_id");
    });

    it("requires score and maximum score to remain paired while editing", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <AcademicRecordForm
                course={course}
                record={{ ...record, score: null, max_score: null }}
                onSave={onSave}
                onCancel={vi.fn()}
            />,
        );

        await user.type(screen.getByLabelText("Score"), "15");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(screen.getByText(/Enter both the score and maximum score/i))
            .toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });
});
