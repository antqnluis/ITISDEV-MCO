function TextInput({
  error,
  helper,
  id,
  inputClassName = "form-control",
  label,
  labelClassName = "mb-2 block text-sm font-semibold text-ink",
  ...props
}) {
  const descriptionId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        className={`${inputClassName} ${error ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
        {...props}
      />
      {error && <p id={`${id}-error`} className="mt-2 text-sm font-medium text-danger">{error}</p>}
      {!error && helper && <p id={`${id}-helper`} className="mt-2 text-sm leading-5 text-soft">{helper}</p>}
    </div>
  );
}

export default TextInput;
