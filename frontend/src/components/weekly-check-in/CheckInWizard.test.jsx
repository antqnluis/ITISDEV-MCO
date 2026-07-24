import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CheckInWizard from "./CheckInWizard";

const checkIn = {
  id: "11111111-1111-4111-8111-111111111111",
  week_start: "2026-07-20",
  stress_level: 3,
  mood_level: 4,
  sleep_quality: 3,
  motivation_level: 4,
  burnout_level: 2,
  energy_level: 3,
  available_study_hours: 10,
  reflection: "Persisted reflection",
};
const course = {
  id: "22222222-2222-4222-8222-222222222222",
  code: "ITISDEV",
  name: "IT Systems Development",
};
const existingLog = {
  id: "33333333-3333-4333-8333-333333333333",
  check_in_id: checkIn.id,
  course_id: course.id,
  workload_difficulty: 5,
  unclear_instruction_level: 2,
  grading_concern_level: 4,
  professor_approachability_concern: 1,
  groupmate_issue_level: 3,
  concern_notes: "Persisted course context",
};

describe("CheckInWizard", () => {
  it("uses backend courses and maps positive UI ratings back to concern ratings", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <CheckInWizard
        courses={[course]}
        currentWeekStart={checkIn.week_start}
        initialCheckIn={checkIn}
        existingLogs={[existingLog]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    for (let step = 1; step < 5; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(screen.getByText("IT Systems Development")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persisted course context")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Check-in" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: checkIn.id,
        week_start: checkIn.week_start,
        reflection: checkIn.reflection,
      }),
      [{
        id: existingLog.id,
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        workload_difficulty: 5,
        unclear_instruction_level: 2,
        grading_concern_level: 4,
        professor_approachability_concern: 1,
        groupmate_issue_level: 3,
        concern_notes: existingLog.concern_notes,
      }],
    );
  });

  it("disables the wizard while a submission is in progress", () => {
    render(
      <CheckInWizard
        courses={[]}
        currentWeekStart={checkIn.week_start}
        initialCheckIn={checkIn}
        isSubmitting
        submissionError="Previous save failed"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Previous save failed");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getAllByRole("radio")[0]).toBeDisabled();
  });
});
