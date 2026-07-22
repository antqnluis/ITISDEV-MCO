const ratings = [1, 2, 3, 4, 5];

function RatingQuestion({ id, question, helper, value, onChange, lowLabel, highLabel, error, compact = false }) {
  return (
    <fieldset aria-describedby={helper ? `${id}-helper` : undefined}>
      <legend className={`${compact ? "text-lg" : "text-2xl"} font-display font-semibold leading-tight tracking-[-0.025em] text-ink`}>
        {question}
      </legend>
      {helper && <p id={`${id}-helper`} className="mt-2 text-sm leading-6 text-copy sm:text-base">{helper}</p>}

      <div className={`${compact ? "mt-3" : "mt-5"} grid grid-cols-5 gap-2 sm:gap-2.5`} aria-invalid={Boolean(error)}>
        {ratings.map((rating) => (
          <label key={rating} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="peer sr-only"
            />
            <span className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface text-base font-bold text-copy shadow-field transition duration-200 hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2">
              {rating}
            </span>
          </label>
        ))}
      </div>

      <div className={`${compact ? "mt-2" : "mt-3"} flex justify-between gap-4 text-xs font-medium text-soft sm:text-sm`}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

export default RatingQuestion;
