import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerProvider } from '../context/CustomerContext';
import Navbar from '../components/Navbar';

export default function CustomerLayout() {
  return (
    <CustomerProvider>
      <div className="dashboard-layout">
        <Navbar />
        <Outlet />
      </div>
    </CustomerProvider>
  );
}
