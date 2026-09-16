import React, { forwardRef } from 'react';
import './Input.css';

/**
 * Reusable Input component
 */
const Input = forwardRef(function Input(
  {
    label,
    id,
    type = 'text',
    error,
    hint,
    required,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
          {required && <span className="field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className="field__input"
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        required={required}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;

