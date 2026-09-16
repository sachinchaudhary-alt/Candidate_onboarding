import Icon from '../common/Icon.jsx';

/* Numbered heading for a workflow step: a circled number that turns into a
   tick when the step is done and highlights while it's the current step. */
export default function StepTitle({ n, label, state }) {
  return (
    <span className="ta-step">
      <span className={`ta-step__num ta-step__num--${state}`}>
        {state === 'done' ? <Icon name="Check" size={15} strokeWidth={3} /> : n}
      </span>
      <span>Step {n} · {label}</span>
      {state === 'current' && <span className="ta-step__now">In progress</span>}
    </span>
  );
}
