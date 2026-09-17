import React from 'react';
import './Badge.css';

/**
 * Reusable Badge Component for statuses
 * @param {object} props
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} props.variant
 */
export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {children}
    </span>
  );
}

