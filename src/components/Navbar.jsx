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
  const userName = profile?.full_name || 'User';

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="HomeIQ home">
          <span className="navbar__logo-icon" aria-hidden="true">🏠</span>
          <span className="navbar__logo-text">HomeIQ</span>
        </Link>

        <nav className="navbar__nav" aria-label="Main navigation">
          {role === 'customer' && (
            <>
              <NavLink to="/customer/dashboard" className="navbar__link" end>Dashboard</NavLink>
              <NavLink to="/customer/appliances" className="navbar__link">My Appliances</NavLink>
              <NavLink to="/customer/requests" className="navbar__link">Requests</NavLink>
              <NavLink to="/customer/bookings" className="navbar__link">Bookings</NavLink>
              <NavLink to="/customer/history" className="navbar__link">History</NavLink>
              <NavLink to="/customer/opportunities" className="navbar__link">Opportunities</NavLink>
              <NavLink to="/customer/notifications" className="navbar__link">Notifications</NavLink>
            </>
          )}
          {role === 'technician' && (
            <>
              <NavLink to="/technician/dashboard" className="navbar__link" end>Dashboard</NavLink>
              <NavLink to="/technician/jobs" className="navbar__link">Jobs</NavLink>
              <NavLink to="/technician/availability" className="navbar__link">Availability</NavLink>
              <NavLink to="/technician/history" className="navbar__link">History</NavLink>
              <NavLink to="/technician/notifications" className="navbar__link">Notifications</NavLink>
              <NavLink to="/technician/profile" className="navbar__link">Profile</NavLink>
            </>
          )}
        </nav>

        <div className="navbar__actions">
          {profile && (
            <span className="navbar__user">
              <span className="navbar__avatar" aria-hidden="true">
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className="navbar__username">{userName}</span>
            </span>
          )}
          <button className="navbar__logout" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
