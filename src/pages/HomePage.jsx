import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home">
      {/* Top nav */}
      <header className="home-header">
        <div className="home-header__inner">
          <span className="home-header__brand">
            <span aria-hidden="true" style={{color: 'var(--color-primary)'}}>🏠</span> HomeIQ
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
            { icon: '⭐', label: 'Skilled Technicians' },
            { icon: '📱', label: 'Mobile Friendly' },
            { icon: '📅', label: 'Easy Scheduling' },
            { icon: '🛡️', label: 'Trusted Platform' },
          ].map(({ icon, label }) => (
            <div key={label} className="home-feature">
              <span className="home-feature__icon" aria-hidden="true">{icon}</span>
              <span className="home-feature__label">{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

