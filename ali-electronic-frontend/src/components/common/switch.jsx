export default function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="switch-row">
      <span className="switch-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider" />
      </span>
    </label>
  );
}