import { initialsOf } from '../../utils/format.js';

export default function Avatar({ name = '', size, muted }) {
  const cls = ['avatar', size ? `avatar--${size}` : '', muted ? 'avatar--muted' : ''].filter(Boolean).join(' ');
  return (
    <span className={cls} title={name} aria-hidden="true">
      {initialsOf(name) || '?'}
    </span>
  );
}

/** Avatar + name/meta, used in tables and headers. */
export function Identity({ name, meta, size = 'sm', muted }) {
  return (
    <span className="identity">
      <Avatar name={name} size={size} muted={muted} />
      <span className="stack">
        <span className="identity__name">{name}</span>
        {meta && <span className="identity__meta">{meta}</span>}
      </span>
    </span>
  );
}
