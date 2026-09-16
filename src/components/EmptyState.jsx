import React from 'react';
import Card from './Card';
import './EmptyState.css';

export default function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <Card padding="lg" className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </Card>
  );
}

