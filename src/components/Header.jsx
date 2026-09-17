import React from 'react';
import { Bell, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header() {
  const { profile } = useAuth();
  const userName = profile?.full_name || 'User';
  const roleDisplay = profile?.role === 'technician' ? 'Technician' : 'Customer';

  return (
    <header className="app-header">
      <div className="app-header__left">
        {/* Placeholder for page title or breadcrumbs */}
      </div>
      <div className="app-header__right">
        <div className="app-header__location" aria-hidden="true">
          <MapPin size={18} /> {profile?.role === 'technician' ? 'Service Area' : 'Coimbatore'}
        </div>
        <button className="app-header__icon-btn" aria-label="Notifications">
          <Bell size={20} />
        </button>
        <div className="app-header__user">
          <div className="app-header__avatar" aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="app-header__user-info">
            <span className="app-header__username">{userName}</span>
            <span className="app-header__role">{roleDisplay}</span>
          </div>
        </div>
      </div>
    </header>
  );
}