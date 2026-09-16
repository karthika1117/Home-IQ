import React from 'react';
import './Card.css';

/**
 * Reusable Card component
 */
export default function Card({ children, className = '', padding = 'md', ...props }) {
  return (
    <div className={`card card--pad-${padding} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`card__header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card__footer ${className}`}>{children}</div>;
}

