import { moodOptions } from "./options";

function MoodSelector({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
        What best describes your overall mood?
      </legend>
      <div className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2.5" aria-invalid={Boolean(error)}>
        {moodOptions.map((mood) => (
          <label key={mood.value} className="cursor-pointer">
            <input
              type="radio"
              name="mood_level"
              value={mood.value}
              checked={value === mood.value}
              onChange={() => onChange(mood.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-line bg-surface px-1 text-center shadow-field transition duration-200 hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2">
              <span className="text-xl sm:text-2xl" aria-hidden="true">{mood.emoji}</span>
              <span className="mt-1 text-[0.65rem] font-semibold text-copy peer-checked:text-brand-deep sm:text-xs">{mood.label}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export default MoodSelector;
