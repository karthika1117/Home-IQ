import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Shield, Smartphone, Calendar, CheckCircle } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home">
      {/* Top nav */}
      <header className="home-header">
        <div className="home-header__inner">
          <span className="home-header__brand flex items-center gap-2">
            <Home size={24} color="var(--color-primary)" /> HomeIQ
          </span>
          <nav className="home-header__nav">
            <Link to="/login" className="home-header__link">Sign in</Link>
            <Link to="/signup" className="home-header__cta">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="home-hero">
        <p className="home-hero__eyebrow">Smart Home Services, Simplified.</p>
        <h1 className="home-hero__title">
          Home care,<br />made simple.
        </h1>
        <p className="home-hero__desc">
          Find trusted appliance technicians, schedule services, and manage every repair from one intelligent platform.
        </p>
        <div className="home-hero__actions">
          <Link to="/signup?role=customer" className="home-btn home-btn--primary">Book a Service</Link>
          <Link to="/signup?role=technician" className="home-btn home-btn--ghost">Become a Technician</Link>
        </div>

        {/* Feature strip */}
        <div className="home-features">
          {[
            { icon: <Shield size={20} />, label: 'Skilled Technicians' },
            { icon: <Smartphone size={20} />, label: 'Mobile Friendly' },
            { icon: <Calendar size={20} />, label: 'Easy Scheduling' },
            { icon: <CheckCircle size={20} />, label: 'Trusted Platform' },
          ].map(({ icon, label }) => (
            <div key={label} className="home-feature">
              <span className="home-feature__icon" style={{ display: 'flex' }} aria-hidden="true">{icon}</span>
              <span className="home-feature__label">{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

