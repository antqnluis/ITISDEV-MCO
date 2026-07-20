function SelectInput({ children, error, helper, id, label, ...props }) {
  const descriptionId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        className={`form-control cursor-pointer pr-10 ${error ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
        {...props}
      >
        {children}
      </select>
      {error && <p id={`${id}-error`} className="mt-2 text-sm font-medium text-danger">{error}</p>}
      {!error && helper && <p id={`${id}-helper`} className="mt-2 text-sm leading-5 text-soft">{helper}</p>}
    </div>
  );
}

export default SelectInput;
