import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerProvider } from '../context/CustomerContext';
import Navbar from '../components/Navbar';
import Header from '../components/Header';

export default function CustomerLayout() {
  return (
    <CustomerProvider>
      <div className="dashboard-layout">
        <Navbar />
        <div className="dashboard-main">
          <Header />
          <Outlet />
        </div>
      </div>
    </CustomerProvider>
  );
}
