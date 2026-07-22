function ProgressIndicator({ currentStep, totalSteps }) {
  return (
    <div className="mb-8 sm:mb-10" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isComplete = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition ${isComplete ? "border-brand bg-brand text-white" : isCurrent ? "border-brand bg-brand-soft text-brand-deep ring-4 ring-brand-soft/70" : "border-line-strong bg-surface text-soft"}`}>
                {isComplete ? "✓" : step}
              </span>
              {step < totalSteps && <span className={`h-px flex-1 ${step < currentStep ? "bg-brand" : "bg-line"}`} />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.1em] text-soft">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}

export default ProgressIndicator;
