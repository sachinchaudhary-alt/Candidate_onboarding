import { useState } from 'react';
import Icon from './Icon.jsx';

export default function ChipsInput({ value = [], onChange, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const remove = (chip) => onChange(value.filter((c) => c !== chip));

  return (
    <div className="chips-input">
      {value.map((chip) => (
        <span className="chip" key={chip}>
          {chip}
          <button type="button" onClick={() => remove(chip)} aria-label={`Remove ${chip}`}>
            <Icon name="X" size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
          if (e.key === 'Backspace' && !draft && value.length) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
