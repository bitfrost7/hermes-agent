export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id: externalId, ...rest }: InputProps): React.ReactElement {
  return (
    <div className="hw-field">
      {label && <label className="hw-field__label">{label}</label>}
      <input className={["hw-input", className].filter(Boolean).join(" ")} {...rest} />
    </div>
  );
}
