import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import Button from "../components/ui/Button";
import InformationCard from "../components/ui/InformationCard";
import PageHeader from "../components/ui/PageHeader";

const informationCards = [
  {
    title: "What we'll collect",
    items: [
      "Weekly wellness check-ins",
      "Academic tasks and deadlines",
      "Calendar events and responsibilities",
      "Optional reflections"
    ]
  },
  {
    title: "How we'll use it",
    items: [
      "Generate your Student Wellness Index",
      "Understand workload and wellbeing patterns",
      "Personalize wellness recommendations",
      "Support your weekly self-reflection"
    ]
  },
  {
    title: "Your privacy",
    items: [
      "Only you can access your personal data",
      "Your information is never automatically shared",
      "You decide if you want to export your wellness summary",
      "You may update your information at any time"
    ]
  }
];

function Consent() {
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const [hasGivenConsent, setHasGivenConsent] = useState(false);
  const navigate = useNavigate();
  const canContinue = hasReadConsent && hasGivenConsent;

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <CenteredAuthLayout>
      <div className="w-full max-w-[720px]">
        <PageHeader
          title="Privacy & Consent"
          subtitle="Before we get started, we'd like to explain how AnimoLog uses your information."
          className="text-center"
        />

        <p className="mb-6 text-base leading-7 text-[#59706a]">
          Your wellbeing information belongs to you. AnimoLog collects only the information needed to generate personalized wellness insights and recommendations. Your information is kept private and is never automatically shared with faculty, counselors, or administrators.
        </p>

        <div className="space-y-4">
          {informationCards.map((card) => (
            <InformationCard key={card.title} title={card.title} items={card.items} />
          ))}
          <InformationCard title="Important">
            <p>AnimoLog is a student wellness support tool.</p>
            <p>It does not diagnose mental health conditions and does not replace professional counseling, medical care, or university support services.</p>
          </InformationCard>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 border-t border-[#dce5dd] pt-8" noValidate>
          <fieldset className="space-y-5">
            <legend className="sr-only">Privacy consent</legend>

            <label className="flex cursor-pointer items-start gap-3 text-base leading-6 text-[#58716a]">
              <input
                type="checkbox"
                checked={hasReadConsent}
                onChange={(event) => setHasReadConsent(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[#4b8360]"
              />
              <span>I have read and understood how AnimoLog collects and uses my information.</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-base leading-6 text-[#58716a]">
              <input
                type="checkbox"
                checked={hasGivenConsent}
                onChange={(event) => setHasGivenConsent(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[#4b8360]"
              />
              <span>I voluntarily consent to the collection and processing of my information to provide personalized wellness insights and recommendations.</span>
            </label>
          </fieldset>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => navigate("/register")} className="sm:flex-1">
              Back
            </Button>
            <Button type="submit" disabled={!canContinue} className="sm:flex-1">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </CenteredAuthLayout>
  );
}

export default Consent;
