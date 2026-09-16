import Icon from './Icon.jsx';

export default function Button({
  children,
  variant = 'primary',
  size,
  icon,
  iconRight,
  block,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : size === 'lg' ? 'btn--lg' : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} className="btn__ir" />}
    </button>
  );
}
