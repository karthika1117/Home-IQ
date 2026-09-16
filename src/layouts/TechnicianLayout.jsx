import React from 'react';
import { Outlet } from 'react-router-dom';
import { TechnicianProvider } from '../context/TechnicianContext';
import Navbar from '../components/Navbar';
import Header from '../components/Header';

export default function TechnicianLayout() {
  return (
    <TechnicianProvider>
      <div className="dashboard-layout">
        <Navbar />
        <div className="dashboard-main">
          <Header />
          <Outlet />
        </div>
      </div>
    </TechnicianProvider>
  );
}
