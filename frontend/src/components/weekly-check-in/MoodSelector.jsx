import { moodOptions } from "./options";

function MoodSelector({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#10251e]">
        What best describes your overall mood?
      </legend>
      <div className="mt-6 grid grid-cols-5 gap-2" aria-invalid={Boolean(error)}>
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
            <span className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-[#d8e0dc] bg-white px-1 text-center transition peer-checked:border-[#4b8360] peer-checked:bg-[#edf6eb] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4b8360] peer-focus-visible:ring-offset-2">
              <span className="text-2xl" aria-hidden="true">{mood.emoji}</span>
              <span className="mt-1 text-xs font-medium text-[#59706a] peer-checked:text-[#174635]">{mood.label}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-[#a34343]">{error}</p>}
    </fieldset>
  );
}

export default MoodSelector;
