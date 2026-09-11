import Icon from './Icon.jsx';

export default function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-bar">
      <Icon name="Search" size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}
