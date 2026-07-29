function SelectInput({ children, error, id, label, ...props }) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`form-control cursor-pointer pr-10 ${error ? "border-danger focus:border-danger focus:ring-danger/15" : ""}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default SelectInput;
