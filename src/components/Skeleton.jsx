import React from 'react';
import './Skeleton.css';

export default function Skeleton({ className = '', variant = 'text', width, height }) {
  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
  };

  return <div className={`skeleton skeleton--${variant} ${className}`} style={style} />;
}

