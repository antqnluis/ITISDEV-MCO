function TextInput({ id, label, inputClassName, labelClassName = "mb-2 block text-base font-medium text-[#174635]", ...props }) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input id={id} className={inputClassName} {...props} />
    </div>
  );
}

export default TextInput;
