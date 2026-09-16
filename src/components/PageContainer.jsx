import React from 'react';
import './PageContainer.css';

/**
 * Wraps page content with consistent max-width and padding.
 * @param {'narrow'|'default'|'wide'} props.width
 */
export default function PageContainer({ children, width = 'default', className = '' }) {
  return (
    <main className={`page-container page-container--${width} ${className}`}>
      {children}
    </main>
  );
}

