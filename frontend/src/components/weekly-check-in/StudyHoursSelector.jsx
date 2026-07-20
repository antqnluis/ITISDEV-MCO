import { studyHoursOptions } from "./options";

function StudyHoursSelector({ value, onChange, error }) {
  return (
    <fieldset aria-describedby="study-hours-helper">
      <legend className="font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink">
        Available Study Hours This Week
      </legend>
      <p id="study-hours-helper" className="mt-2 text-sm leading-6 text-copy sm:text-base">
        Think about your schedule after classes, work, commuting, and other responsibilities.
      </p>
      <p className="mt-4 text-sm font-semibold text-ink sm:text-base">
        How many hours do you realistically have available to study this week?
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-5" aria-invalid={Boolean(error)}>
        {studyHoursOptions.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name="available_study_hours"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-surface px-3 text-center text-sm font-semibold text-copy shadow-field transition duration-200 hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-deep peer-checked:shadow-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export default StudyHoursSelector;
