function ProgressIndicator({ currentStep, totalSteps }) {
  return (
    <div className="mb-10" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isComplete = step <= currentStep;

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <span className={`size-3 rounded-full border-2 ${isComplete ? "border-[#4b8360] bg-[#4b8360]" : "border-[#b7c8bb] bg-[#fdfcf9]"}`} />
              {step < totalSteps && <span className={`h-0.5 flex-1 ${step < currentStep ? "bg-[#4b8360]" : "bg-[#dce5dd]"}`} />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm font-medium text-[#59706a]">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}

export default ProgressIndicator;
