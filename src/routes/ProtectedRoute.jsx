import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/PageContainer';
import './ProtectedRoute.css';

/**
 * Protects a route requiring authentication and optionally specific roles.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <PageContainer className="auth-loading-page">
        <div className="auth-loading-spinner" aria-hidden="true" />
        <p className="auth-loading-text">Loading...</p>
      </PageContainer>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Profile not found yet (should not happen normally unless trigger failed)
  if (!profile) {
    return (
      <PageContainer className="auth-loading-page">
        <div className="auth-error-box">
          <h2>Unable to load profile</h2>
          <p>Your account exists, but we couldn't load your profile details.</p>
        </div>
      </PageContainer>
    );
  }

  // Check roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(profile.role)) {
      // Role mismatch -> send them to their correct dashboard
      const fallbackRoute = profile.role === 'technician' ? '/technician/dashboard' : '/customer/dashboard';
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  return children;
}

