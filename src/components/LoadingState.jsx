import React from 'react';
import './LoadingState.css';

export default function LoadingState({ message = 'Loading...', fullHeight = false }) {
  return (
    <div className={`loading-state ${fullHeight ? 'loading-state--full' : ''}`}>
      <div className="loading-state__spinner" aria-hidden="true" />
      <p className="loading-state__message">{message}</p>
    </div>
  );
}

