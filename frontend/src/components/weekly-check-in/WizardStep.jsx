function WizardStep({ stepKey, children }) {
  return (
    <div key={stepKey} className="weekly-step-enter">
      {children}
    </div>
  );
}

export default WizardStep;
