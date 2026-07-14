import { useId, useState } from "react";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, label, id: externalId }: SwitchProps): React.ReactElement {
  const autoId = useId();
  const id = externalId ?? autoId;
  return (
    <label htmlFor={id} className="hw-switch-row">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="hw-switch"
        data-checked={checked || undefined}
        onClick={() => onCheckedChange(!checked)}
        type="button"
      >
        <span className="hw-switch-thumb" />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
