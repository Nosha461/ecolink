function getOptionValue(option) {
  return typeof option === "object" && option ? option.value : option;
}

function getOptionLabel(option) {
  return typeof option === "object" && option ? option.label : option;
}

export default function DashboardDropdown({
  id,
  label,
  options,
  value,
  isOpen,
  onToggle,
  onSelect,
  onClose,
}) {
  const selectedOption = options.find((option) => getOptionValue(option) === value);
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : value;

  return (
    <div
      className={`dashboard-dropdown ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="dashboard-dropdown-trigger"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{displayValue || label}</span>
        <span className="dashboard-dropdown-chevron" aria-hidden="true" />
      </button>

      <div className="dashboard-dropdown-menu" role="listbox" aria-label={label}>
        {options.map((option) => {
          const optionValue = getOptionValue(option);
          const optionLabel = getOptionLabel(option);

          return (
          <button
            key={`${id}-${optionValue}`}
            type="button"
            className={value === optionValue ? "selected" : ""}
            onClick={() => onSelect(optionValue)}
            role="option"
            aria-selected={value === optionValue}
          >
            <span>{optionLabel}</span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
