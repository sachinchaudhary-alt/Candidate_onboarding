import Icon from './Icon.jsx';

export default function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : '';
        return (
          <div key={label} className="row gap-2" style={{ alignItems: 'center' }}>
            <div className={`stepper__step ${state ? `stepper__step--${state}` : ''}`}>
              <span className="stepper__num">
                {i < current ? <Icon name="Check" size={12} /> : i + 1}
              </span>
              <span className="nowrap">{label}</span>
            </div>
            {i < steps.length - 1 && <span className="stepper__line" />}
          </div>
        );
      })}
    </div>
  );
}
