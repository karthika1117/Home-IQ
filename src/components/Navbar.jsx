import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const role = profile?.role;

  return (
    <aside className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="HomeIQ home">
          <span className="navbar__logo-icon" aria-hidden="true">🏠</span>
          <span className="navbar__logo-text">HomeIQ</span>
        </Link>

        <nav className="navbar__nav" aria-label="Main navigation">
          {role === 'customer' && (
            <>
              <NavLink to="/customer/dashboard" className="navbar__link" end><span aria-hidden="true">📊</span> Dashboard</NavLink>
              <NavLink to="/customer/appliances" className="navbar__link"><span aria-hidden="true">🔌</span> My Appliances</NavLink>
              <NavLink to="/customer/requests" className="navbar__link"><span aria-hidden="true">📝</span> Active Requests</NavLink>
              <NavLink to="/customer/bookings" className="navbar__link"><span aria-hidden="true">📅</span> My Bookings</NavLink>
              <NavLink to="/customer/history" className="navbar__link"><span aria-hidden="true">⏱️</span> History</NavLink>
              <NavLink to="/customer/notifications" className="navbar__link"><span aria-hidden="true">🔔</span> Notifications</NavLink>
              <NavLink to="/customer/profile" className="navbar__link"><span aria-hidden="true">👤</span> Profile</NavLink>
            </>
          )}
          {role === 'technician' && (
            <>
              <NavLink to="/technician/dashboard" className="navbar__link" end><span aria-hidden="true">📊</span> Dashboard</NavLink>
              <NavLink to="/technician/jobs" className="navbar__link"><span aria-hidden="true">📋</span> My Jobs</NavLink>
              <NavLink to="/technician/availability" className="navbar__link"><span aria-hidden="true">📅</span> Schedule</NavLink>
              <NavLink to="/technician/history" className="navbar__link"><span aria-hidden="true">💰</span> Earnings & History</NavLink>
              <NavLink to="/technician/notifications" className="navbar__link"><span aria-hidden="true">🔔</span> Notifications</NavLink>
              <NavLink to="/technician/profile" className="navbar__link"><span aria-hidden="true">👤</span> Profile</NavLink>
            </>
          )}
        </nav>

        <div className="navbar__actions">
          <button className="navbar__logout" type="button" onClick={handleSignOut}>
            <span aria-hidden="true">🚪</span> Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
