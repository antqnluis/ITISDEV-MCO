import { useState } from "react";
import ProgressIndicator from "../onboarding/ProgressIndicator";
import Button from "../ui/Button";
import AppIcon from "../ui/AppIcon";
import MoodSelector from "./MoodSelector";
import RatingQuestion from "./RatingQuestion";
import StudyHoursSelector from "./StudyHoursSelector";
import WeeklySummaryCard from "./WeeklySummaryCard";
import WizardStep from "./WizardStep";
import { moodOptions, studyHoursOptions } from "./options";
import { getCurrentWeekStart } from "../../data/demoData";

const totalSteps = 5;
const stepFields = {
  1: ["stress_level", "mood_level"],
  2: ["sleep_quality", "energy_level", "available_study_hours"],
  3: ["motivation_level", "burnout_level"],
  4: [],
  5: [],
};

const fieldLabels = {
  stress_level: "Please select your stress level.",
  mood_level: "Please select your mood.",
  sleep_quality: "Please select your sleep quality.",
  energy_level: "Please select your energy level.",
  available_study_hours: "Please select your available study hours.",
  motivation_level: "Please select your motivation level.",
  burnout_level: "Please select your burnout level.",
};

const concernFields = [
  { key: "workload_difficulty", label: "Workload" },
  { key: "unclear_instruction_level", label: "Unclear instructions" },
  { key: "grading_concern_level", label: "Grading" },
  { key: "professor_approachability_concern", label: "Approachability" },
  { key: "groupmate_issue_level", label: "Groupmates" },
];

function emptyCourse() {
  return {
    id: "",
    course_code: "",
    course_name: "",
    workload_difficulty: null,
    unclear_instruction_level: null,
    grading_concern_level: null,
    professor_approachability_concern: null,
    groupmate_issue_level: null,
    concern_notes: "",
  };
}

function CourseConcernStep({ courses, setCourses }) {
  function updateCourse(index, key, value) {
    setCourses((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  return (
    <WizardStep stepKey="course-concerns">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">Any course-specific concerns?</h3>
            <p className="mt-2 text-sm leading-6 text-copy">This step is optional. Ratings use 1 for little concern and 5 for severe concern.</p>
          </div>
          <Button type="button" size="compact" variant="secondary" fullWidth={false} onClick={() => setCourses((items) => [...items, emptyCourse()])}>
            <AppIcon name="plus" className="mr-2 size-4" /> Add course
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {courses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-strong bg-brand-wash p-7 text-center text-sm text-copy">
              No course concerns added. You can submit the check-in without them.
            </div>
          )}
          {courses.map((course, index) => (
            <section key={course.id || `new-${index}`} className="surface-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-[0.55fr_1.45fr]">
                  <input aria-label="Course code" value={course.course_code} onChange={(event) => updateCourse(index, "course_code", event.target.value)} className="form-control min-h-11 py-2 text-sm" placeholder="Course code" />
                  <input aria-label="Course name" value={course.course_name} onChange={(event) => updateCourse(index, "course_name", event.target.value)} className="form-control min-h-11 py-2 text-sm" placeholder="Course name" />
                </div>
                <button type="button" aria-label="Remove course" onClick={() => setCourses((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 shrink-0 place-items-center rounded-xl text-danger transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-danger">
                  <AppIcon name="trash" className="size-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {concernFields.map((field) => (
                  <label key={field.key} className="text-xs font-semibold text-copy">
                    {field.label}
                    <select value={course[field.key] ?? ""} onChange={(event) => updateCourse(index, field.key, event.target.value ? Number(event.target.value) : null)} className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15">
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <textarea aria-label="Course concern notes" rows={2} maxLength={4000} value={course.concern_notes || ""} onChange={(event) => updateCourse(index, "concern_notes", event.target.value)} className="form-control mt-4 min-h-24 resize-y p-3 text-sm" placeholder="Notes about workload, instructions, grading, or group dynamics" />
            </section>
          ))}
        </div>
      </div>
    </WizardStep>
  );
}

function CheckInWizard({ initialCheckIn, existingLogs, onSave, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [checkIn, setCheckIn] = useState(() => ({
    ...initialCheckIn,
    id: initialCheckIn?.id || "",
    week_start: initialCheckIn?.week_start || getCurrentWeekStart(),
    stress_level: initialCheckIn?.stress_level ?? null,
    mood_level: initialCheckIn?.mood_level ?? null,
    sleep_quality: initialCheckIn?.sleep_quality ?? null,
    motivation_level: initialCheckIn?.motivation_level ?? null,
    burnout_level: initialCheckIn?.burnout_level ?? null,
    energy_level: initialCheckIn?.energy_level ?? null,
    available_study_hours: initialCheckIn?.available_study_hours ?? null,
    reflection: initialCheckIn?.reflection || "",
  }));
  const [courses, setCourses] = useState(() => existingLogs.map((log) => ({ ...log })));
  const [errors, setErrors] = useState({});

  const moodLabel = moodOptions.find((option) => option.value === checkIn.mood_level)?.label;
  const studyHoursLabel = studyHoursOptions.find((option) => option.value === checkIn.available_study_hours)?.label;

  function updateCheckIn(field, value) {
    setCheckIn((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateFields(fields) {
    const nextErrors = {};
    fields.forEach((field) => {
      if (checkIn[field] === null) nextErrors[field] = fieldLabels[field];
    });
    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (validateFields(stepFields[currentStep])) setCurrentStep((step) => Math.min(totalSteps, step + 1));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const requiredFields = Object.values(stepFields).flat();
    if (!validateFields(requiredFields)) {
      const incompleteStep = Object.keys(stepFields).find((step) => stepFields[step].some((field) => checkIn[field] === null));
      setCurrentStep(Number(incompleteStep));
      return;
    }

    const normalizedLogs = courses
      .filter((course) => (
        course.course_code.trim()
        && course.course_name.trim()
        && (concernFields.some((field) => course[field.key] !== null) || course.concern_notes.trim())
      ))
      .map((course) => ({
        ...course,
        course_code: course.course_code.trim().toUpperCase(),
        course_name: course.course_name.trim(),
        concern_notes: course.concern_notes.trim() || null,
      }));

    onSave({ ...checkIn, reflection: checkIn.reflection.trim() || null }, normalizedLogs);
  }

  function renderStep() {
    if (currentStep === 1) {
      return <WizardStep stepKey="stress-and-mood"><div className="space-y-10"><RatingQuestion id="stress_level" question="How stressed have you felt this week?" helper="Helps us understand your current emotional load." value={checkIn.stress_level} onChange={(value) => updateCheckIn("stress_level", value)} lowLabel="Very calm" highLabel="Very stressed" error={errors.stress_level} /><MoodSelector value={checkIn.mood_level} onChange={(value) => updateCheckIn("mood_level", value)} error={errors.mood_level} /></div></WizardStep>;
    }
    if (currentStep === 2) {
      return <WizardStep stepKey="sleep-energy-and-study-time"><div className="space-y-10"><RatingQuestion id="sleep_quality" question="How would you rate your sleep quality?" helper="Helps identify whether rest may be affecting your week." value={checkIn.sleep_quality} onChange={(value) => updateCheckIn("sleep_quality", value)} lowLabel="Very poor" highLabel="Excellent" error={errors.sleep_quality} /><RatingQuestion id="energy_level" question="How has your energy been?" value={checkIn.energy_level} onChange={(value) => updateCheckIn("energy_level", value)} lowLabel="Drained" highLabel="Full of energy" error={errors.energy_level} /><StudyHoursSelector value={checkIn.available_study_hours} onChange={(value) => updateCheckIn("available_study_hours", value)} error={errors.available_study_hours} /></div></WizardStep>;
    }
    if (currentStep === 3) {
      return <WizardStep stepKey="motivation-and-burnout"><div className="space-y-10"><RatingQuestion id="motivation_level" question="How motivated have you felt toward your studies?" helper="Measures your willingness to engage with your studies this week." value={checkIn.motivation_level} onChange={(value) => updateCheckIn("motivation_level", value)} lowLabel="Very low" highLabel="Very high" error={errors.motivation_level} /><RatingQuestion id="burnout_level" question="How close to burnout are you feeling?" helper="Measures feelings of exhaustion or detachment—not academic performance." value={checkIn.burnout_level} onChange={(value) => updateCheckIn("burnout_level", value)} lowLabel="Not at all" highLabel="Exhausted" error={errors.burnout_level} /></div></WizardStep>;
    }
    if (currentStep === 4) {
      return <WizardStep stepKey="reflection-and-summary"><div><label htmlFor="reflection" className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">Anything on your mind this week?</label><p className="mt-2 text-sm leading-6 text-copy sm:text-base">Tell us anything that affected your week—academics, responsibilities, relationships, or anything else.</p><textarea id="reflection" value={checkIn.reflection} onChange={(event) => updateCheckIn("reflection", event.target.value)} placeholder="This week I noticed..." className="form-control mt-5 min-h-36 resize-y p-4 leading-6" /><p className="mt-3 text-sm text-soft">Reflection is optional.</p><div className="mt-7"><WeeklySummaryCard checkIn={checkIn} moodLabel={moodLabel} studyHoursLabel={studyHoursLabel} /></div></div></WizardStep>;
    }
    return <CourseConcernStep courses={courses} setCourses={setCourses} />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      <section className="surface-panel p-5 shadow-none sm:p-7">{renderStep()}</section>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        {currentStep > 1 ? <Button type="button" variant="secondary" onClick={() => setCurrentStep((step) => step - 1)} className="sm:flex-1">Back</Button> : <Button type="button" variant="secondary" onClick={onCancel} className="sm:flex-1">Cancel</Button>}
        {currentStep < totalSteps ? <Button type="button" onClick={handleNext} className="sm:flex-1">Continue</Button> : <Button type="submit" className="sm:flex-1">{initialCheckIn ? "Save Check-in" : "Submit Check-in"}</Button>}
      </div>
    </form>
  );
}

export default CheckInWizard;
