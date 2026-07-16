import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import ProgressIndicator from "../components/onboarding/ProgressIndicator";
import SelectionCard from "../components/onboarding/SelectionCard";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import TextInput from "../components/ui/TextInput";

const totalSteps = 5;

const responsibilities = [
  "Student Organization",
  "Athlete",
  "OJT / Internship",
  "Part-time Job",
  "Caregiving",
  "Scholarship",
  "Leadership Role",
  "Other"
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

const selectClassName = "h-[61px] w-full rounded-[15px] border border-[#d8e0dc] bg-white px-5 text-lg text-[#10251e] shadow-[0_2px_4px_rgba(32,48,57,0.07)] outline-none transition focus:border-[#4b8360] focus:ring-2 focus:ring-[#4b8360]/20";

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
  const [otherResponsibility, setOtherResponsibility] = useState("");
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  function goToNextStep() {
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

  function renderStep() {
    if (isComplete) {
      return (
        <div className="text-center">
          <PageHeader title="You're All Set!" className="text-center" />
          <p className="mx-auto max-w-[560px] text-base leading-7 text-[#59706a]">
            Your profile has been created.
          </p>
          <p className="mx-auto mt-4 max-w-[560px] text-base leading-7 text-[#59706a]">
            As you continue using AnimoLog, your wellness insights will become more personalized through your check-ins, calendar, and academic activity.
          </p>
          <Button type="button" onClick={() => navigate("/dashboard")} className="mt-10 max-w-[500px]">
            Go to Dashboard
          </Button>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div>
          <PageHeader
            title="Welcome to AnimoLog"
            subtitle="Before we get started, let's personalize your experience."
          />
          <p className="text-base leading-7 text-[#59706a]">
            We'll ask a few quick questions about your academic life and responsibilities so AnimoLog can better understand your workload and provide more relevant wellness insights.
          </p>
          <p className="mt-4 text-base leading-7 text-[#59706a]">This only takes about 2–3 minutes.</p>
          <div className="mt-8 rounded-[15px] border border-[#d8e0dc] bg-white p-5 shadow-[0_2px_4px_rgba(32,48,57,0.07)]">
            <p className="text-sm font-medium text-[#59706a]">Estimated time:</p>
            <p className="mt-1 text-lg font-semibold text-[#174635]">2–3 minutes</p>
          </div>
          <Button type="button" onClick={goToNextStep} className="mt-8">Let's Begin</Button>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div>
          <PageHeader title="Tell us about your academics" />
          <div className="space-y-5">
            <label className="block text-base font-medium text-[#174635]">
              <span className="mb-2 block">College</span>
              <select name="college" value={academics.college} onChange={updateAcademicField} className={selectClassName}>
                <option value="">Select your college</option>
                <option>College of Computer Studies</option>
                <option>College of Engineering</option>
                <option>College of Science</option>
                <option>College of Business</option>
                <option>College of Liberal Arts</option>
              </select>
            </label>
            <label className="block text-base font-medium text-[#174635]">
              <span className="mb-2 block">Program</span>
              <select name="program" value={academics.program} onChange={updateAcademicField} className={selectClassName}>
                <option value="">Select your program</option>
                <option>BS Information Technology</option>
                <option>BS Computer Science</option>
                <option>BS Information Systems</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-base font-medium text-[#174635]">
              <span className="mb-2 block">Current Year Level</span>
              <select name="yearLevel" value={academics.yearLevel} onChange={updateAcademicField} className={selectClassName}>
                <option value="">Select your year level</option>
                {[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}
              </select>
            </label>
            <label className="block text-base font-medium text-[#174635]">
              <span className="mb-2 block">Current Academic Term</span>
              <select name="academicTerm" value={academics.academicTerm} onChange={updateAcademicField} className={selectClassName}>
                <option value="">Select your academic term</option>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
                <option>Summer Term</option>
              </select>
            </label>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div>
          <PageHeader title="Recurring Responsibilities" subtitle="Select all that apply." />
          <div className="grid gap-3 sm:grid-cols-2">
            {responsibilities.map((responsibility) => (
              <SelectionCard
                key={responsibility}
                label={responsibility}
                selected={selectedResponsibilities.includes(responsibility)}
                onClick={() => toggleSelection(responsibility, setSelectedResponsibilities)}
              />
            ))}
          </div>
          {selectedResponsibilities.includes("Other") && (
            <div className="mt-5">
              <TextInput
                id="other-responsibility"
                label="Please describe"
                name="otherResponsibility"
                type="text"
                value={otherResponsibility}
                onChange={(event) => setOtherResponsibility(event.target.value)}
                placeholder="Enter another responsibility"
                inputClassName="h-[61px] w-full rounded-[15px] border border-[#d8e0dc] bg-white px-5 text-lg text-[#10251e] shadow-[0_2px_4px_rgba(32,48,57,0.07)] outline-none transition focus:border-[#4b8360] focus:ring-2 focus:ring-[#4b8360]/20"
              />
            </div>
          )}
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div>
          <PageHeader title="Set Up Your Academic Calendar" />
          <p className="text-base leading-7 text-[#59706a]">
            You can start organizing your semester now, or skip and add everything later.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {calendarItems.map((item) => (
              <section key={item} className="rounded-[15px] border border-[#d8e0dc] bg-white p-5 shadow-[0_2px_4px_rgba(32,48,57,0.07)]">
                <h2 className="text-lg font-semibold text-[#174635]">{item}</h2>
                <button type="button" disabled className="mt-5 rounded-lg border border-[#d8e0dc] bg-[#f4f6f3] px-4 py-2 text-sm font-medium text-[#91a199]">
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
        <PageHeader title="What would you like AnimoLog to help you with?" subtitle="Choose all that apply." />
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
      <div className="w-full max-w-[720px]">
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
      </div>

      {isPrivacyNoticeOpen && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-[#10251e]/20 px-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="privacy-notice-title" className="w-full max-w-[460px] rounded-[18px] border border-[#d8e0dc] bg-[#fdfcf9] p-7 shadow-[0_16px_40px_rgba(32,48,57,0.2)]">
            <h2 id="privacy-notice-title" className="font-serif text-3xl font-semibold tracking-[-0.035em] text-[#10251e]">
              Your information stays under your control.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#59706a]">
              You can update your profile, responsibilities, and goals anytime from Settings.
            </p>
            <p className="mt-3 text-base leading-7 text-[#59706a]">
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
