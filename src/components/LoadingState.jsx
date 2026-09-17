import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingState.css';

export default function LoadingState({ message = 'Loading...', fullHeight = false }) {
  return (
    <div className={`loading-state ${fullHeight ? 'loading-state--full' : ''}`}>
      <Loader2 className="loading-state__spinner" size={32} />
      <p className="loading-state__message">{message}</p>
    </div>
  );
}

