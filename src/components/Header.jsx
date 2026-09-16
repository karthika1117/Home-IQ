import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header() {
  const { profile } = useAuth();
  const userName = profile?.full_name || 'User';
  const roleDisplay = profile?.role === 'technician' ? 'Technician' : 'Customer';

  return (
    <header className="top-header">
      <div className="top-header__inner">
        <div className="top-header__left">
          {/* Breadcrumb or simple greeting could go here if needed */}
        </div>
        <div className="top-header__right">
          <div className="top-header__location" aria-hidden="true">
            📍 {profile?.role === 'technician' ? 'Service Area' : 'Coimbatore'}
          </div>
          <button className="top-header__icon-btn" aria-label="Notifications">
            🔔
          </button>
          <div className="top-header__user">
            <div className="top-header__avatar" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="top-header__user-info">
              <span className="top-header__username">{userName}</span>
              <span className="top-header__role">{roleDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

