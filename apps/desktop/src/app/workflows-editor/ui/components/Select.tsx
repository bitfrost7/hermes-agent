export interface SelectItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function Select({ value, onValueChange, items, placeholder, disabled, label }: SelectProps): React.ReactElement {
  return (
    <div className="hw-field">
      {label && <label className="hw-field__label">{label}</label>}
      <select
        className="hw-input hw-select-trigger"
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
