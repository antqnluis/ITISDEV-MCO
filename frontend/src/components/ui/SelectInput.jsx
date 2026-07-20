function SelectInput({ children, id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select id={id} className="form-control cursor-pointer pr-10" {...props}>
        {children}
      </select>
    </div>
  );
}

export default SelectInput;
