import React from 'react';
import { Outlet } from 'react-router-dom';
import { TechnicianProvider } from '../context/TechnicianContext';
import Navbar from '../components/Navbar';

export default function TechnicianLayout() {
  return (
    <TechnicianProvider>
      <div className="dashboard-layout">
        <Navbar />
        <Outlet />
      </div>
    </TechnicianProvider>
  );
}
