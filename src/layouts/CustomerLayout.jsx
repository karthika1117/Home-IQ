import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerProvider } from '../context/CustomerContext';
import Navbar from '../components/Navbar';
import Header from '../components/Header';

export default function CustomerLayout() {
  return (
    <CustomerProvider>
      <div className="app-shell">
        <Navbar />
        <div className="app-main">
          <Header />
          <div className="app-content">
            <Outlet />
          </div>
        </div>
      </div>
    </CustomerProvider>
  );
}
