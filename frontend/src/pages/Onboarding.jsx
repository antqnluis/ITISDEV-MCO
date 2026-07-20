import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import ProgressIndicator from "../components/onboarding/ProgressIndicator";
import ResponsibilityHoursList from "../components/onboarding/ResponsibilityHoursList";
import SelectionCard from "../components/onboarding/SelectionCard";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import SelectInput from "../components/ui/SelectInput";

const totalSteps = 5;

const responsibilities = [
  {
    id: "organization",
    label: "Student Organization",
    booleanField: "has_organization_responsibility",
    hoursField: "organization_hours_per_week"
  },
  {
    id: "athlete",
    label: "Athlete",
    booleanField: "is_athlete",
    hoursField: "athlete_hours_per_week"
  },
  {
    id: "ojt",
    label: "OJT / Internship",
    booleanField: "has_ojt",
    hoursField: "ojt_hours_per_week"
  },
  {
    id: "employment",
    label: "Part-time Job",
    booleanField: "is_employed",
    hoursField: "work_hours_per_week"
  },
  {
    id: "caregiving",
    label: "Caregiving",
    booleanField: "has_caregiving_responsibility",
    hoursField: "caregiving_hours_per_week"
  },
  { id: "scholarship", label: "Scholarship", contextOnly: true },
  { id: "leadership", label: "Leadership Role", contextOnly: true },
  { id: "other", label: "Other", contextOnly: true }
];

const wellnessGoals = [
  "Managing Stress",
  "Managing Workload",
  "Time Management",
  "Healthy Routines",
  "Academic Balance",
  "Better Sleep",
  "Staying Motivated"
];

const calendarItems = ["Classes", "Deadlines", "Exams", "Study Blocks"];

function omitKey(object, keyToOmit) {
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => key !== keyToOmit)
  );
}

function validateResponsibilityHours(value) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "Enter the hours you spend on this responsibility each week.";
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return "Enter a valid number of hours.";
  }

  if (numericValue < 0 || numericValue > 168) {
    return "Hours must be between 0 and 168.";
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    return "Use no more than two decimal places.";
  }

  return "";
}

function getResponsibilityHoursTotal(selectedResponsibilities, responsibilityHours) {
  const total = selectedResponsibilities.reduce((currentTotal, responsibilityId) => {
    const value = responsibilityHours[responsibilityId] ?? "";

    return validateResponsibilityHours(value)
      ? currentTotal
      : currentTotal + Number(value);
  }, 0);

  return Number(total.toFixed(2));
}

function buildResponsibilityProfilePayload(
  selectedResponsibilities,
  responsibilityHours,
  otherResponsibility
) {
  const payload = {};

  responsibilities
    .filter(({ booleanField }) => booleanField)
    .forEach(({ booleanField, hoursField, id }) => {
      const isSelected = selectedResponsibilities.includes(id);
      payload[booleanField] = isSelected;
      payload[hoursField] = isSelected ? Number(responsibilityHours[id]) : 0;
    });

  const additionalResponsibilities = responsibilities
    .filter(({ contextOnly, id }) => contextOnly && selectedResponsibilities.includes(id))
    .map(({ id, label }) => {
      const responsibilityLabel = id === "other"
        ? `${label} (${otherResponsibility.trim()})`
        : label;

      return `${responsibilityLabel}: ${Number(responsibilityHours[id])} hours/week`;
    });

  payload.additional_context = additionalResponsibilities.length > 0
    ? `Recurring responsibilities: ${additionalResponsibilities.join("; ")}`
    : null;

  return payload;
}

function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState(true);
  const [academics, setAcademics] = useState({
    college: "",
    program: "",
    yearLevel: "",
    academicTerm: ""
  });
  const [selectedResponsibilities, setSelectedResponsibilities] = useState([]);
  const [responsibilityHours, setResponsibilityHours] = useState({});
  const [responsibilityErrors, setResponsibilityErrors] = useState({});
  const [otherResponsibility, setOtherResponsibility] = useState("");
  const [otherResponsibilityError, setOtherResponsibilityError] = useState("");
  const [responsibilityProfilePayload, setResponsibilityProfilePayload] = useState(null);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  function goToNextStep() {
    if (currentStep === 3) {
      if (!validateResponsibilitiesStep()) {
        return;
      }

      setResponsibilityProfilePayload(buildResponsibilityProfilePayload(
        selectedResponsibilities,
        responsibilityHours,
        otherResponsibility
      ));
    }

    if (currentStep === totalSteps) {
      setIsComplete(true);
      return;
    }

    setCurrentStep((step) => step + 1);
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function updateAcademicField(event) {
    const { name, value } = event.target;
    setAcademics((currentAcademics) => ({ ...currentAcademics, [name]: value }));
  }

  function toggleSelection(value, setSelection) {
    setSelection((currentSelection) => (
      currentSelection.includes(value)
        ? currentSelection.filter((item) => item !== value)
        : [...currentSelection, value]
    ));
  }

  function toggleResponsibility(responsibilityId) {
    const isSelected = selectedResponsibilities.includes(responsibilityId);

    setSelectedResponsibilities((currentSelection) => (
      isSelected
        ? currentSelection.filter((item) => item !== responsibilityId)
        : [...currentSelection, responsibilityId]
    ));

    if (isSelected) {
      setResponsibilityHours((currentHours) => omitKey(currentHours, responsibilityId));
      setResponsibilityErrors((currentErrors) => omitKey(currentErrors, responsibilityId));

      if (responsibilityId === "other") {
        setOtherResponsibility("");
        setOtherResponsibilityError("");
      }
    }

    setResponsibilityProfilePayload(null);
  }

  function updateResponsibilityHours(responsibilityId, value) {
    setResponsibilityHours((currentHours) => ({
      ...currentHours,
      [responsibilityId]: value
    }));

    setResponsibilityErrors((currentErrors) => {
      if (!currentErrors[responsibilityId]) {
        return currentErrors;
      }

      const nextError = validateResponsibilityHours(value);

      return nextError
        ? { ...currentErrors, [responsibilityId]: nextError }
        : omitKey(currentErrors, responsibilityId);
    });
    setResponsibilityProfilePayload(null);
  }

  function updateOtherResponsibility(value) {
    setOtherResponsibility(value);

    if (value.trim()) {
      setOtherResponsibilityError("");
    }

    setResponsibilityProfilePayload(null);
  }

  function validateResponsibilitiesStep() {
    const nextErrors = {};
    let firstInvalidFieldId = "";

    responsibilities
      .filter(({ id }) => selectedResponsibilities.includes(id))
      .forEach(({ id }) => {
        const error = validateResponsibilityHours(responsibilityHours[id] ?? "");

        if (error) {
          nextErrors[id] = error;

          if (!firstInvalidFieldId) {
            firstInvalidFieldId = `${id}-hours-per-week`;
          }
        }

        if (id === "other" && !otherResponsibility.trim() && !firstInvalidFieldId) {
          firstInvalidFieldId = "other-responsibility";
        }
      });

    const nextOtherError = selectedResponsibilities.includes("other") && !otherResponsibility.trim()
      ? "Describe this responsibility."
      : "";

    setResponsibilityErrors(nextErrors);
    setOtherResponsibilityError(nextOtherError);

    if (firstInvalidFieldId) {
      requestAnimationFrame(() => {
        document.getElementById(firstInvalidFieldId)?.focus();
      });
    }

    return Object.keys(nextErrors).length === 0 && !nextOtherError;
  }

  function goToDashboard() {
    navigate("/dashboard", {
      state: { responsibilityProfilePayload }
    });
  }

  function renderStep() {
    if (isComplete) {
      return (
        <div className="py-4 text-center">
          <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-brand text-2xl text-white shadow-[0_8px_22px_rgb(52_115_77_/_0.24)]" aria-hidden="true">✓</div>
          <PageHeader compact title="You're All Set!" align="center" />
          <p className="mx-auto max-w-[560px] text-base leading-7 text-copy">
            Your profile has been created.
          </p>
          <p className="mx-auto mt-4 max-w-[560px] text-base leading-7 text-copy">
            As you continue using AnimoLog, your wellness insights will become more personalized through your check-ins, calendar, and academic activity.
          </p>
          <Button type="button" onClick={goToDashboard} className="mx-auto mt-9 max-w-[500px]">
            Go to Dashboard
          </Button>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div>
          <PageHeader
            compact
            eyebrow="A quick introduction"
            title="Welcome to AnimoLog"
            subtitle="Before we get started, let's personalize your experience."
          />
          <p className="text-base leading-7 text-copy">
            We'll ask a few quick questions about your academic life and responsibilities so AnimoLog can better understand your workload and provide more relevant wellness insights.
          </p>
          <p className="mt-4 text-base leading-7 text-copy">This only takes about 2–3 minutes.</p>
          <div className="surface-card mt-7 flex items-center justify-between gap-5 bg-brand-wash p-5">
            <div>
              <p className="text-sm font-medium text-copy">Estimated time</p>
              <p className="mt-1 text-lg font-bold text-brand-deep">2–3 minutes</p>
            </div>
            <div className="grid size-11 place-items-center rounded-full bg-white text-brand shadow-field" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <Button type="button" onClick={goToNextStep} className="mt-7">Let's Begin</Button>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div>
          <PageHeader compact title="Tell us about your academics" />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput id="college" label="College" name="college" value={academics.college} onChange={updateAcademicField}>
                <option value="">Select your college</option>
                <option>College of Computer Studies</option>
                <option>College of Engineering</option>
                <option>College of Science</option>
                <option>College of Business</option>
                <option>College of Liberal Arts</option>
            </SelectInput>
            <SelectInput id="program" label="Program" name="program" value={academics.program} onChange={updateAcademicField}>
                <option value="">Select your program</option>
                <option>BS Information Technology</option>
                <option>BS Computer Science</option>
                <option>BS Information Systems</option>
                <option>Other</option>
            </SelectInput>
            <SelectInput id="year-level" label="Current Year Level" name="yearLevel" value={academics.yearLevel} onChange={updateAcademicField}>
                <option value="">Select your year level</option>
                {[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}
            </SelectInput>
            <SelectInput id="academic-term" label="Current Academic Term" name="academicTerm" value={academics.academicTerm} onChange={updateAcademicField}>
                <option value="">Select your academic term</option>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
                <option>Summer Term</option>
            </SelectInput>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      const selectedResponsibilityDetails = responsibilities.filter(({ id }) => (
        selectedResponsibilities.includes(id)
      ));

      return (
        <div>
          <PageHeader compact title="Recurring Responsibilities" subtitle="Select all that apply. We'll ask for your weekly hours below." />
          <div className="grid gap-3 sm:grid-cols-2">
            {responsibilities.map((responsibility) => (
              <SelectionCard
                key={responsibility.id}
                label={responsibility.label}
                selected={selectedResponsibilities.includes(responsibility.id)}
                onClick={() => toggleResponsibility(responsibility.id)}
              />
            ))}
          </div>

          {selectedResponsibilityDetails.length > 0 && (
            <ResponsibilityHoursList
              responsibilities={selectedResponsibilityDetails}
              hours={responsibilityHours}
              errors={responsibilityErrors}
              otherResponsibility={otherResponsibility}
              otherResponsibilityError={otherResponsibilityError}
              totalHours={getResponsibilityHoursTotal(
                selectedResponsibilities,
                responsibilityHours
              )}
              onHoursChange={updateResponsibilityHours}
              onOtherResponsibilityChange={updateOtherResponsibility}
            />
          )}
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div>
          <PageHeader compact title="Set Up Your Academic Calendar" />
          <p className="text-base leading-7 text-copy">
            You can start organizing your semester now, or skip and add everything later.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {calendarItems.map((item) => (
              <section key={item} className="surface-card p-5">
                <div className="mb-5 grid size-9 place-items-center rounded-lg bg-brand-soft text-brand" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="size-4.5">
                    <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-ink">{item}</h2>
                <button type="button" disabled className="mt-4 min-h-11 rounded-xl border border-line bg-[#eff2ed] px-4 text-sm font-semibold text-soft disabled:cursor-not-allowed">
                  Add Now
                </button>
              </section>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <PageHeader compact title="What would you like AnimoLog to help you with?" subtitle="Choose all that apply." />
        <div className="grid gap-3 sm:grid-cols-2">
          {wellnessGoals.map((goal) => (
            <SelectionCard
              key={goal}
              label={goal}
              selected={selectedGoals.includes(goal)}
              onClick={() => toggleSelection(goal, setSelectedGoals)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <CenteredAuthLayout>
      <section className="surface-panel w-full max-w-[760px] p-5 sm:p-8 lg:p-10">
        <ProgressIndicator currentStep={isComplete ? totalSteps : currentStep} totalSteps={totalSteps} />
        {renderStep()}

        {!isComplete && currentStep > 1 && (
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={goToPreviousStep} className="sm:flex-1">
              Back
            </Button>
            {currentStep === 4 && (
              <Button type="button" variant="secondary" onClick={goToNextStep} className="sm:flex-1">
                Skip for now
              </Button>
            )}
            <Button type="button" onClick={goToNextStep} className="sm:flex-1">
              Next
            </Button>
          </div>
        )}
      </section>

      {isPrivacyNoticeOpen && (
        <div className="fixed inset-0 z-10 grid place-items-center overflow-y-auto bg-ink/35 p-5 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="privacy-notice-title" className="w-full max-w-[460px] rounded-3xl border border-white/70 bg-surface p-6 shadow-lifted sm:p-8">
            <div className="mb-5 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <path d="M12 3.5 19 6v5.1c0 4.2-2.7 7.6-7 9.4-4.3-1.8-7-5.2-7-9.4V6l7-2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="m9.2 11.8 1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id="privacy-notice-title" className="font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-ink">
              Your information stays under your control.
            </h2>
            <p className="mt-5 text-base leading-7 text-copy">
              You can update your profile, responsibilities, and goals anytime from Settings.
            </p>
            <p className="mt-3 text-base leading-7 text-copy">
              Your information is never shared without your permission.
            </p>
            <Button type="button" onClick={() => setIsPrivacyNoticeOpen(false)} className="mt-7">
              Got it
            </Button>
          </section>
        </div>
      )}
    </CenteredAuthLayout>
  );
}

export default Onboarding;
