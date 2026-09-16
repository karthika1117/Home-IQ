import React from 'react';
import './Button.css';

/**
 * Reusable Button component
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {boolean} props.fullWidth
 * @param {boolean} props.loading
 * @param {boolean} props.disabled
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span className={loading ? 'btn__label--hidden' : 'btn__label'}>
        {children}
      </span>
    </button>
  );
}

