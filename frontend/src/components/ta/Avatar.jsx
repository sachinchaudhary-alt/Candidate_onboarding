import { initialsOf } from '../../utils/format.js';

/* Initials avatar used across the TA tables and headers. */
export default function Avatar({ name = '', size }) {
  return (
    <span className={`ta-avatar${size ? ` ta-avatar--${size}` : ''}`} title={name} aria-hidden="true">
      {initialsOf(name) || '?'}
    </span>
  );
}
