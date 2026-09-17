import React from 'react';
import { Outlet } from 'react-router-dom';
import { TechnicianProvider } from '../context/TechnicianContext';
import Navbar from '../components/Navbar';
import Header from '../components/Header';

export default function TechnicianLayout() {
  return (
    <TechnicianProvider>
      <div className="app-shell">
        <Navbar />
        <div className="app-main">
          <Header />
          <div className="app-content">
            <Outlet />
          </div>
        </div>
      </div>
    </TechnicianProvider>
  );
}
