const ratings = [1, 2, 3, 4, 5];

function RatingQuestion({ id, question, helper, value, onChange, lowLabel, highLabel, error }) {
  return (
    <fieldset aria-describedby={helper ? `${id}-helper` : undefined}>
      <legend className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#10251e]">
        {question}
      </legend>
      {helper && <p id={`${id}-helper`} className="mt-2 text-base leading-6 text-[#6b8077]">{helper}</p>}

      <div className="mt-6 grid grid-cols-5 gap-2" aria-invalid={Boolean(error)}>
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
            <span className="flex h-12 items-center justify-center rounded-xl border border-[#d8e0dc] bg-white text-base font-semibold text-[#59706a] transition peer-checked:border-[#4b8360] peer-checked:bg-[#edf6eb] peer-checked:text-[#174635] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4b8360] peer-focus-visible:ring-offset-2">
              {rating}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex justify-between text-sm text-[#789087]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-[#a34343]">{error}</p>}
    </fieldset>
  );
}

export default RatingQuestion;
