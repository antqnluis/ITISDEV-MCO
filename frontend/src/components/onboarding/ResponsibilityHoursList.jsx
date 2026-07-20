import TextInput from "../ui/TextInput";

function ResponsibilityHoursList({
  errors,
  hours,
  onHoursChange,
  onOtherResponsibilityChange,
  otherResponsibility,
  otherResponsibilityError,
  responsibilities,
  totalHours
}) {
  return (
    <section className="surface-card mt-7 overflow-hidden" aria-labelledby="weekly-time-commitment-title">
      <header className="grid gap-4 border-b border-line bg-brand-wash p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div>
          <h2 id="weekly-time-commitment-title" className="text-base font-bold text-ink sm:text-lg">
            Weekly time commitment
          </h2>
          <p className="mt-1 text-sm leading-5 text-copy">
            Estimate the time you spend on each responsibility in a typical week.
          </p>
        </div>
        <p className="w-fit whitespace-nowrap rounded-full border border-brand/15 bg-white px-3 py-2 text-sm font-semibold text-brand-deep sm:justify-self-end">
          Total: {totalHours} hours/week
        </p>
      </header>

      <div className="divide-y divide-line">
        {responsibilities.map(({ id, label }) => {
          const hoursInputId = `${id}-hours-per-week`;
          const hoursError = errors[id];
          const descriptionId = hoursError
            ? `${hoursInputId}-error`
            : `${hoursInputId}-helper`;

          return (
            <div
              key={id}
              className="p-5 sm:p-6"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(9.5rem,11rem)_auto]">
                <label
                  htmlFor={hoursInputId}
                  className="col-span-2 text-sm font-bold text-ink sm:col-span-1 sm:text-base"
                >
                  {label}
                </label>

                <input
                  id={hoursInputId}
                  name={`${id}HoursPerWeek`}
                  type="number"
                  min="0"
                  max="168"
                  step="0.01"
                  inputMode="decimal"
                  value={hours[id] ?? ""}
                  onChange={(event) => onHoursChange(id, event.target.value)}
                  placeholder="e.g. 8"
                  aria-describedby={descriptionId}
                  aria-invalid={Boolean(hoursError)}
                  className={`form-control min-h-12 py-3 ${hoursError ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
                  required
                />

                <span className="whitespace-nowrap text-xs font-semibold text-soft sm:text-sm">
                  hours/week
                </span>

                {hoursError ? (
                  <p id={`${hoursInputId}-error`} className="col-span-2 min-h-5 text-sm font-medium text-danger sm:col-start-2">
                    {hoursError}
                  </p>
                ) : (
                  <p id={`${hoursInputId}-helper`} className="col-span-2 min-h-5 text-xs leading-5 text-soft sm:col-start-2">
                    Enter a value from 0 to 168.
                  </p>
                )}
              </div>

              {id === "other" && (
                <div className="mt-4 border-t border-line pt-4">
                  <TextInput
                    id="other-responsibility"
                    label="Describe this responsibility"
                    name="otherResponsibility"
                    type="text"
                    value={otherResponsibility}
                    onChange={(event) => onOtherResponsibilityChange(event.target.value)}
                    placeholder="Enter another responsibility"
                    error={otherResponsibilityError}
                    required
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ResponsibilityHoursList;
