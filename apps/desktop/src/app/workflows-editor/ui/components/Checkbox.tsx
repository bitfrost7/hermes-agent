export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Checkbox({ checked, onCheckedChange, disabled, label }: CheckboxProps): React.ReactElement {
  return (
    <label className="hw-checkbox-row" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        style={{ margin: 0 }}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
