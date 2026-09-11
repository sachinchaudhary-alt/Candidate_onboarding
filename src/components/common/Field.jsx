import Icon from './Icon.jsx';

/**
 * `state`:
 *   'extracted' — value pulled from the resume (blue tint + "From resume" tag)
 *   'missing'   — resume had no value for this (amber tint + "Add this" tag)
 */
export function Field({ label, required, error, hint, autofilled, state, children, full }) {
  const tag =
    state === 'extracted' ? (
      <span className="field__tag field__tag--resume">From resume</span>
    ) : state === 'missing' ? (
      <span className="field__tag field__tag--missing">Add this</span>
    ) : null;

  return (
    <div className={`field${full ? ' field--full' : ''}`}>
      {label && (
        <div className="field__labelrow">
          <label className="field__label">
            {label}
            {required && <span className="req">*</span>}
          </label>
          {tag}
        </div>
      )}
      {state ? <div className={`field__control field__control--${state}`}>{children}</div> : children}
      {autofilled && (
        <span className="field__autofill">
          <Icon name="Sparkles" size={12} /> Auto-filled from resume
        </span>
      )}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && (
        <span className="field__error">
          <Icon name="AlertCircle" size={12} /> {error}
        </span>
      )}
    </div>
  );
}

export function Input({ error, ...rest }) {
  return <input className={`input${error ? ' input--error' : ''}`} {...rest} />;
}

export function Textarea({ error, ...rest }) {
  return <textarea className={`textarea${error ? ' textarea--error' : ''}`} {...rest} />;
}

export function Select({ error, options = [], placeholder, children, ...rest }) {
  return (
    <select className={`select${error ? ' select--error' : ''}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
      {children}
    </select>
  );
}
