import { useState } from "react";
import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import ProgressIndicator from "../components/onboarding/ProgressIndicator";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import ConditionalContextQuestions from "../components/weekly-check-in/ConditionalContextQuestions";
import MoodSelector from "../components/weekly-check-in/MoodSelector";
import RatingQuestion from "../components/weekly-check-in/RatingQuestion";
import StudyHoursSelector from "../components/weekly-check-in/StudyHoursSelector";
import WeeklySummaryCard from "../components/weekly-check-in/WeeklySummaryCard";
import WizardStep from "../components/weekly-check-in/WizardStep";
import { moodOptions, studyHoursOptions } from "../components/weekly-check-in/options";

const totalSteps = 4;

const stepFields = {
  1: ["stress_level", "mood_level"],
  2: ["sleep_quality", "energy_level", "available_study_hours"],
  3: ["motivation_level", "burnout_level"],
  4: []
};

const fieldLabels = {
  stress_level: "Please select your stress level.",
  mood_level: "Please select your mood.",
  sleep_quality: "Please select your sleep quality.",
  energy_level: "Please select your energy level.",
  available_study_hours: "Please select your available study hours.",
  motivation_level: "Please select your motivation level.",
  burnout_level: "Please select your burnout level."
};

const conditionalContextQuestions = [];

function getWeekStart() {
  const date = new Date();
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function WeeklyCheckIn() {
  const [currentStep, setCurrentStep] = useState(1);
  const [checkIn, setCheckIn] = useState({
    stress_level: null,
    mood_level: null,
    sleep_quality: null,
    motivation_level: null,
    burnout_level: null,
    energy_level: null,
    available_study_hours: null,
    reflection: ""
  });
  const [contextAnswers, setContextAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const moodLabel = moodOptions.find((option) => option.value === checkIn.mood_level)?.label;
  const studyHoursLabel = studyHoursOptions.find((option) => option.value === checkIn.available_study_hours)?.label;

  function updateCheckIn(field, value) {
    setCheckIn((currentCheckIn) => ({ ...currentCheckIn, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function validateFields(fields) {
    const nextErrors = {};

    fields.forEach((field) => {
      if (checkIn[field] === null) {
        nextErrors[field] = fieldLabels[field];
      }
    });

    setErrors((currentErrors) => ({ ...currentErrors, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateFields(stepFields[currentStep])) {
      return;
    }

    setCurrentStep((step) => Math.min(totalSteps, step + 1));
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function handleSubmit() {
    const requiredFields = Object.values(stepFields).flat();

    if (!validateFields(requiredFields)) {
      const firstIncompleteStep = Object.keys(stepFields).find((step) => (
        stepFields[step].some((field) => checkIn[field] === null)
      ));
      setCurrentStep(Number(firstIncompleteStep));
      return;
    }

    const payload = {
      week_start: getWeekStart(),
      stress_level: checkIn.stress_level,
      mood_level: checkIn.mood_level,
      sleep_quality: checkIn.sleep_quality,
      motivation_level: checkIn.motivation_level,
      burnout_level: checkIn.burnout_level,
      energy_level: checkIn.energy_level,
      available_study_hours: checkIn.available_study_hours,
      reflection: checkIn.reflection.trim() || null
    };

    console.log("Weekly check-in payload:", payload);
    // TODO: Send this payload to the weekly_check_ins table through future Supabase REST integration.
    setIsSubmitted(true);
  }

  function renderStep() {
    if (currentStep === 1) {
      return (
        <WizardStep stepKey="stress-and-mood">
          <div className="space-y-10">
            <RatingQuestion
              id="stress_level"
              question="How stressed have you felt this week?"
              helper="Helps us understand your current emotional load."
              value={checkIn.stress_level}
              onChange={(value) => updateCheckIn("stress_level", value)}
              lowLabel="Very calm"
              highLabel="Very stressed"
              error={errors.stress_level}
            />
            <MoodSelector
              value={checkIn.mood_level}
              onChange={(value) => updateCheckIn("mood_level", value)}
              error={errors.mood_level}
            />
          </div>
        </WizardStep>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep stepKey="sleep-energy-and-study-time">
          <div className="space-y-10">
            <RatingQuestion
              id="sleep_quality"
              question="How would you rate your sleep quality?"
              helper="Helps identify whether rest may be affecting your week."
              value={checkIn.sleep_quality}
              onChange={(value) => updateCheckIn("sleep_quality", value)}
              lowLabel="Very poor"
              highLabel="Excellent"
              error={errors.sleep_quality}
            />
            <RatingQuestion
              id="energy_level"
              question="How has your energy been?"
              value={checkIn.energy_level}
              onChange={(value) => updateCheckIn("energy_level", value)}
              lowLabel="Drained"
              highLabel="Full of energy"
              error={errors.energy_level}
            />
            <StudyHoursSelector
              value={checkIn.available_study_hours}
              onChange={(value) => updateCheckIn("available_study_hours", value)}
              error={errors.available_study_hours}
            />
          </div>
        </WizardStep>
      );
    }

    if (currentStep === 3) {
      return (
        <WizardStep stepKey="motivation-and-burnout">
          <div className="space-y-10">
            <RatingQuestion
              id="motivation_level"
              question="How motivated have you felt toward your studies?"
              helper="Measures your willingness to engage with your studies this week."
              value={checkIn.motivation_level}
              onChange={(value) => updateCheckIn("motivation_level", value)}
              lowLabel="Very low"
              highLabel="Very high"
              error={errors.motivation_level}
            />
            <RatingQuestion
              id="burnout_level"
              question="How close to burnout are you feeling?"
              helper="Measures feelings of exhaustion or detachment—not academic performance."
              value={checkIn.burnout_level}
              onChange={(value) => updateCheckIn("burnout_level", value)}
              lowLabel="Not at all"
              highLabel="Exhausted"
              error={errors.burnout_level}
            />
            <ConditionalContextQuestions
              questions={conditionalContextQuestions}
              values={contextAnswers}
              onChange={(field, value) => setContextAnswers((answers) => ({ ...answers, [field]: value }))}
              errors={errors}
            />
          </div>
        </WizardStep>
      );
    }

    return (
      <WizardStep stepKey="reflection-and-summary">
        <div>
          <label htmlFor="reflection" className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
            Anything on your mind this week?
          </label>
          <p className="mt-2 text-sm leading-6 text-copy sm:text-base">
            Tell us anything that affected your week—academics, responsibilities, relationships, or anything else.
          </p>
          <textarea
            id="reflection"
            value={checkIn.reflection}
            onChange={(event) => updateCheckIn("reflection", event.target.value)}
            placeholder="This week I noticed..."
            className="form-control mt-5 min-h-44 resize-y p-4 leading-6"
          />
          <p className="mt-3 text-sm text-soft">Reflection is optional.</p>
          <div className="mt-8">
            <WeeklySummaryCard checkIn={checkIn} moodLabel={moodLabel} studyHoursLabel={studyHoursLabel} />
          </div>
        </div>
      </WizardStep>
    );
  }

  if (isSubmitted) {
    return (
      <CenteredAuthLayout>
        <section className="surface-panel w-full max-w-[540px] p-8 text-center sm:p-11">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-2xl text-white shadow-[0_8px_22px_rgb(52_115_77_/_0.24)]" aria-hidden="true">✓</div>
          <h1 className="mt-6 font-display text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.65rem]">Check-in saved locally.</h1>
          <p className="mt-5 text-base leading-7 text-copy">
            Your reflection has been recorded for this session. Small moments of awareness matter.
          </p>
        </section>
      </CenteredAuthLayout>
    );
  }

  return (
    <CenteredAuthLayout>
      <div className="w-full max-w-[760px] py-2">
        <PageHeader
          compact
          eyebrow="Weekly reflection"
          title="Weekly Check-In"
          subtitle="Takes about 2 minutes."
        />

        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

        <section className="surface-panel p-5 sm:p-8">
          {renderStep()}
        </section>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
          {currentStep > 1 && (
            <Button type="button" variant="secondary" onClick={handleBack} className="sm:flex-1">
              Back
            </Button>
          )}
          {currentStep < totalSteps ? (
            <Button type="button" onClick={handleNext} className="sm:flex-1">
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} className="sm:flex-1">
              Submit Check-In
            </Button>
          )}
        </div>
      </div>
    </CenteredAuthLayout>
  );
}

export default WeeklyCheckIn;
