import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon.jsx';

/* Premium form controls — same visual language as the TA screens.
   Used across the candidate application flow. */

export function Field({ label, required, error, hint, extracted, full, children }) {
  return (
    <div className={`ta-field${full ? ' ta-field--full' : ''}${extracted ? ' ta-field--extracted' : ''}`}>
      {label && (
        <div className="ta-field__labelrow">
          <label className="ta-field__label">
            {label}
            {required && <span className="req">*</span>}
          </label>
          {extracted && <span className="ta-field__tag">From resume</span>}
        </div>
      )}
      {children}
      {hint && !error && <span className="ta-field__hint">{hint}</span>}
      {error && (
        <span className="ta-field__error">
          <Icon name="AlertCircle" size={12} /> {error}
        </span>
      )}
    </div>
  );
}

export function Input({ error, ...rest }) {
  return <input className={`ta-input${error ? ' ta-input--error' : ''}`} {...rest} />;
}

export function Textarea({ error, ...rest }) {
  return <textarea className={`ta-textarea${error ? ' ta-input--error' : ''}`} {...rest} />;
}

export function Select({ error, options = [], placeholder, children, ...rest }) {
  return (
    <select className={`ta-input ta-input--select${error ? ' ta-input--error' : ''}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
      {children}
    </select>
  );
}

/* A text input with a filtered, click-to-pick dropdown underneath — for
   lookup lists too long for a plain <select> (companies, cities...). Typing
   still free-types a value not in the list; the dropdown is just a shortcut. */
export function SearchableSelect({ value, onChange, onBlur, options = [], placeholder, error, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const term = (value || '').trim().toLowerCase();
  const matches = term ? options.filter((o) => o.toLowerCase().includes(term)).slice(0, 50) : options.slice(0, 50);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Input
        value={value || ''}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
            maxHeight: 220, overflowY: 'auto', background: 'var(--ta-surface, #fff)',
            border: '1px solid var(--ta-border, #e2e5eb)', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              className="ta-searchselect__item"
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, children }) {
  return (
    <label className="ta-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

/* Two-column responsive field grid. */
export function FieldGrid({ children }) {
  return <div className="ta-formgrid">{children}</div>;
}
