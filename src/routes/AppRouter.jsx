import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';

import ProtectedRoute from './ProtectedRoute';
import CustomerLayout from '../layouts/CustomerLayout';
import TechnicianLayout from '../layouts/TechnicianLayout';

// Customer Pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import AppliancesPage from '../pages/customer/AppliancesPage';
import AddAppliancePage from '../pages/customer/AddAppliancePage';
import ApplianceDetailsPage from '../pages/customer/ApplianceDetailsPage';
import ServiceRequestsPage from '../pages/customer/ServiceRequestsPage';
import CreateServiceRequestPage from '../pages/customer/CreateServiceRequestPage';
import BookingsPage from '../pages/customer/BookingsPage';
import ServiceHistoryPage from '../pages/customer/ServiceHistoryPage';
import OpportunitiesPage from '../pages/customer/OpportunitiesPage';
import CustomerNotificationsPage from '../pages/customer/NotificationsPage';

// Technician Pages
import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import JobsPage from '../pages/technician/JobsPage';
import JobDetailsPage from '../pages/technician/JobDetailsPage';
import AvailabilityPage from '../pages/technician/AvailabilityPage';
import TechnicianHistoryPage from '../pages/technician/TechnicianHistoryPage';
import TechnicianProfilePage from '../pages/technician/TechnicianProfilePage';
import TechnicianNotificationsPage from '../pages/technician/NotificationsPage';

// DEV ONLY
import ConnectionStatusPage from '../pages/dev/ConnectionStatusPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Customer Portal */}
      <Route path="/customer" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="appliances" element={<AppliancesPage />} />
        <Route path="appliances/new" element={<AddAppliancePage />} />
        <Route path="appliances/:applianceId" element={<ApplianceDetailsPage />} />
        <Route path="requests" element={<ServiceRequestsPage />} />
        <Route path="requests/new" element={<CreateServiceRequestPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="history" element={<ServiceHistoryPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="notifications" element={<CustomerNotificationsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Technician Portal */}
      <Route path="/technician" element={
        <ProtectedRoute allowedRoles={['technician']}>
          <TechnicianLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<TechnicianDashboard />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:bookingId" element={<JobDetailsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="history" element={<TechnicianHistoryPage />} />
        <Route path="notifications" element={<TechnicianNotificationsPage />} />
        <Route path="profile" element={<TechnicianProfilePage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="/dev/connection" element={<ConnectionStatusPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
