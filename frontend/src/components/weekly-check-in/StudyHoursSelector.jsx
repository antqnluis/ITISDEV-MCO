import { studyHoursOptions } from "./options";

function StudyHoursSelector({ value, onChange, error }) {
  return (
    <fieldset aria-describedby="study-hours-helper">
      <legend className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#10251e]">
        Available Study Hours This Week
      </legend>
      <p id="study-hours-helper" className="mt-2 text-base leading-6 text-[#6b8077]">
        Think about your schedule after classes, work, commuting, and other responsibilities.
      </p>
      <p className="mt-4 text-base font-medium text-[#174635]">
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
            <span className="flex min-h-14 items-center justify-center rounded-xl border border-[#d8e0dc] bg-white px-3 text-center text-sm font-medium text-[#59706a] transition peer-checked:border-[#4b8360] peer-checked:bg-[#edf6eb] peer-checked:text-[#174635] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4b8360] peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-[#a34343]">{error}</p>}
    </fieldset>
  );
}

export default StudyHoursSelector;
