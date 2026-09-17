import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  WashingMachine, 
  ClipboardList, 
  CalendarCheck, 
  History, 
  Bell, 
  User, 
  Wrench,
  CalendarDays,
  BadgeDollarSign,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css'; // We'll rewrite Navbar.css to be minimalistic

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const role = profile?.role;

  return (
    <aside className="app-sidebar">
      <div className="navbar__brand-container">
        <Link to="/" className="navbar__brand" aria-label="HomeIQ home">
          <Sparkles className="navbar__logo-icon" size={24} />
          <span className="navbar__logo-text">HomeIQ</span>
        </Link>
      </div>

      <nav className="navbar__nav" aria-label="Main navigation">
        <div className="navbar__nav-group">
          <p className="navbar__nav-title">Menu</p>
          {role === 'customer' && (
            <>
              <NavLink to="/customer/dashboard" className="navbar__link" end><LayoutDashboard size={20} /> Dashboard</NavLink>
              <NavLink to="/customer/appliances" className="navbar__link"><WashingMachine size={20} /> My Appliances</NavLink>
              <NavLink to="/customer/requests" className="navbar__link"><ClipboardList size={20} /> Active Requests</NavLink>
              <NavLink to="/customer/bookings" className="navbar__link"><CalendarCheck size={20} /> My Bookings</NavLink>
            </>
          )}
          {role === 'technician' && (
            <>
              <NavLink to="/technician/dashboard" className="navbar__link" end><LayoutDashboard size={20} /> Dashboard</NavLink>
              <NavLink to="/technician/jobs" className="navbar__link"><Wrench size={20} /> My Jobs</NavLink>
              <NavLink to="/technician/availability" className="navbar__link"><CalendarDays size={20} /> Schedule</NavLink>
            </>
          )}
        </div>

        <div className="navbar__nav-group">
          <p className="navbar__nav-title">Account</p>
          {role === 'customer' && (
            <>
              <NavLink to="/customer/history" className="navbar__link"><History size={20} /> History</NavLink>
              <NavLink to="/customer/notifications" className="navbar__link"><Bell size={20} /> Notifications</NavLink>
              <NavLink to="/customer/profile" className="navbar__link"><User size={20} /> Profile</NavLink>
            </>
          )}
          {role === 'technician' && (
            <>
              <NavLink to="/technician/history" className="navbar__link"><BadgeDollarSign size={20} /> Earnings & History</NavLink>
              <NavLink to="/technician/notifications" className="navbar__link"><Bell size={20} /> Notifications</NavLink>
              <NavLink to="/technician/profile" className="navbar__link"><User size={20} /> Profile</NavLink>
            </>
          )}
        </div>
      </nav>

      <div className="navbar__footer">
        <button className="navbar__logout" type="button" onClick={handleSignOut}>
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
}
