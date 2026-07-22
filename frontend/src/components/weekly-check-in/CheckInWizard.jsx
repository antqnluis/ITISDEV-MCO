import { useState } from "react";
import { usePrototypeData } from "../../context/usePrototypeData";
import { getCurrentWeekStart } from "../../data/demoData";
import ProgressIndicator from "../onboarding/ProgressIndicator";
import Button from "../ui/Button";
import MoodSelector from "./MoodSelector";
import RatingQuestion from "./RatingQuestion";
import StudyHoursSelector from "./StudyHoursSelector";
import WeeklySummaryCard from "./WeeklySummaryCard";
import WizardStep from "./WizardStep";
import { moodOptions, studyHoursOptions } from "./options";

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

const ratingFields = [
    { key: "workload_difficulty", question: "How difficult was this course this week?", lowLabel: "Not difficult", highLabel: "Very difficult" },
    { key: "instruction_clarity", question: "How clear were the instructions?", lowLabel: "Very unclear", highLabel: "Very clear" },
    { key: "grading_concern_level", question: "How concerned are you about your grade?", lowLabel: "Not concerned", highLabel: "Very concerned" },
    { key: "professor_approachability", question: "How approachable was your professor?", lowLabel: "Not approachable", highLabel: "Very approachable" },
    { key: "groupmate_cooperation", question: "How cooperative were your groupmates?", lowLabel: "Not cooperative", highLabel: "Very cooperative" },
];

function createCourseLog(course, existingLog) {
    return {
        id: existingLog?.id || "",
        course_id: course.id,
        course_code: course.code,
        course_name: course.name,
        workload_difficulty: existingLog?.workload_difficulty ?? null,
        instruction_clarity: existingLog?.unclear_instruction_level == null ? null : 6 - existingLog.unclear_instruction_level,
        grading_concern_level: existingLog?.grading_concern_level ?? null,
        professor_approachability: existingLog?.professor_approachability_concern == null ? null : 6 - existingLog.professor_approachability_concern,
        groupmate_cooperation: existingLog?.groupmate_issue_level == null ? null : 6 - existingLog.groupmate_issue_level,
        concern_notes: existingLog?.concern_notes || "",
    };
}

function CourseEnvironmentStep({ courseLogs, setCourseLogs }) {
    function updateCourseLog(courseId, key, value) {
        setCourseLogs((items) => items.map((item) => (
            item.course_id === courseId ? { ...item, [key]: value } : item
        )));
    }

    return (
        <WizardStep stepKey="course-environment">
            <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">Course Environment</h3>
                <p className="mt-2 text-sm leading-6 text-copy sm:text-base">Reflect on how each of your courses felt this week. These answers describe this week&apos;s experience only and help personalize your wellness insights.</p>

                <div className="mt-7 space-y-5">
                    {courseLogs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-line-strong bg-brand-wash p-7 text-center text-sm leading-6 text-copy">
                            No courses have been added to Academic Records yet. You can submit this check-in without course reflections.
                        </div>
                    ) : courseLogs.map((course) => (
                        <section key={course.course_id} className="surface-card p-5 sm:p-6">
                            <p className="text-xs font-bold uppercase tracking-[0.13em] text-brand">{course.course_code}</p>
                            <h4 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-ink">{course.course_name}</h4>
                            <div className="mt-6 space-y-8">
                                {ratingFields.map((field) => (
                                    <RatingQuestion
                                        key={field.key}
                                        id={`${course.course_id}-${field.key}`}
                                        question={field.question}
                                        value={course[field.key]}
                                        onChange={(value) => updateCourseLog(course.course_id, field.key, value)}
                                        lowLabel={field.lowLabel}
                                        highLabel={field.highLabel}
                                    />
                                ))}
                            </div>
                            <div className="mt-8 border-t border-line pt-6">
                                <label htmlFor={`${course.course_id}-notes`} className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Anything else about this course this week?</label>
                                <p className="mt-2 text-sm text-copy">Optional</p>
                                <textarea id={`${course.course_id}-notes`} rows={3} maxLength={4000} value={course.concern_notes} onChange={(event) => updateCourseLog(course.course_id, "concern_notes", event.target.value)} className="form-control mt-4 min-h-28 resize-y p-3 text-sm leading-6" placeholder="Add any other course-related context from this week." />
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </WizardStep>
    );
}

function CheckInWizard({ initialCheckIn, existingLogs = [], onSave, onCancel }) {
    const { courses } = usePrototypeData();
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
    const [courseLogs, setCourseLogs] = useState(() => courses.map((course) => {
        const existingLog = existingLogs.find((log) => log.course_id === course.id || log.course_code === course.code);
        return createCourseLog(course, existingLog);
    }));
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

    function handleNext(event) {
        event.preventDefault();
        if (validateFields(stepFields[currentStep])) {
            setCurrentStep((step) => Math.min(totalSteps, step + 1));
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        const requiredFields = Object.values(stepFields).flat();
        if (!validateFields(requiredFields)) {
            const incompleteStep = Object.keys(stepFields).find((step) => stepFields[step].some((field) => checkIn[field] === null));
            setCurrentStep(Number(incompleteStep));
            return;
        }

        const normalizedLogs = courseLogs
            .filter((course) => ratingFields.some((field) => course[field.key] !== null) || course.concern_notes.trim())
            .map((course) => ({
                id: course.id || undefined,
                course_id: course.course_id,
                course_code: course.course_code,
                course_name: course.course_name,
                workload_difficulty: course.workload_difficulty,
                unclear_instruction_level: course.instruction_clarity == null ? null : 6 - course.instruction_clarity,
                grading_concern_level: course.grading_concern_level,
                professor_approachability_concern: course.professor_approachability == null ? null : 6 - course.professor_approachability,
                groupmate_issue_level: course.groupmate_cooperation == null ? null : 6 - course.groupmate_cooperation,
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
        return <CourseEnvironmentStep courseLogs={courseLogs} setCourseLogs={setCourseLogs} />;
    }

    return (
        <form onSubmit={handleSubmit}>
            <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
            <section className="surface-panel p-5 shadow-none sm:p-7">{renderStep()}</section>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                {currentStep > 1 ? <Button type="button" variant="secondary" onClick={() => setCurrentStep((step) => step - 1)} className="sm:flex-1">Back</Button> : <Button type="button" variant="secondary" onClick={onCancel} className="sm:flex-1">Cancel</Button>}
                {currentStep < totalSteps ? <Button key="continue" type="button" onClick={handleNext} className="sm:flex-1">Continue</Button> : <Button key="submit" type="submit" className="sm:flex-1">{initialCheckIn ? "Save Check-in" : "Submit Check-in"}</Button>}
            </div>
        </form>
    );
}

export default CheckInWizard;
