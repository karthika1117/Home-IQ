const fs = require('fs');
const path = require('path');

const files = {
  'src/context/TechnicianContext.jsx': `import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageContainer from '../components/PageContainer';

const TechnicianContext = createContext();

export function TechnicianProvider({ children }) {
  const { user, profile } = useAuth();
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'technician') {
      setLoading(false);
      return;
    }

    async function fetchTechnician() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('technicians')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (fetchErr) throw fetchErr;
        if (!data || !data.technician_id) {
          throw new Error("Technician profile is incomplete. Please contact support.");
        }
        setTechnician(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTechnician();
  }, [user, profile]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading technician data...
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginTop: '2rem' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Access Error</h2>
          <p style={{ color: '#7f1d1d', marginBottom: 0 }}>{error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <TechnicianContext.Provider value={{ technician }}>
      {children}
    </TechnicianContext.Provider>
  );
}

export function useTechnician() {
  const context = useContext(TechnicianContext);
  if (context === undefined) {
    throw new Error('useTechnician must be used within a TechnicianProvider');
  }
  return context;
}
`,

  'src/layouts/TechnicianLayout.jsx': `import React from 'react';
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
`,

  'src/components/Navbar.jsx': `import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const role = profile?.role;
  const userName = profile?.full_name || 'User';

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="HomeIQ home">
          <span className="navbar__logo-icon" aria-hidden="true">🏠</span>
          <span className="navbar__logo-text">HomeIQ</span>
        </Link>

        <nav className="navbar__nav" aria-label="Main navigation">
          {role === 'customer' && (
            <>
              <NavLink to="/customer/dashboard" className="navbar__link" end>Dashboard</NavLink>
              <NavLink to="/customer/appliances" className="navbar__link">My Appliances</NavLink>
              <NavLink to="/customer/requests" className="navbar__link">Requests</NavLink>
              <NavLink to="/customer/bookings" className="navbar__link">Bookings</NavLink>
              <NavLink to="/customer/history" className="navbar__link">History</NavLink>
              <NavLink to="/customer/opportunities" className="navbar__link">Opportunities</NavLink>
              <NavLink to="/customer/notifications" className="navbar__link">Notifications</NavLink>
            </>
          )}
          {role === 'technician' && (
            <>
              <NavLink to="/technician/dashboard" className="navbar__link" end>Dashboard</NavLink>
              <NavLink to="/technician/jobs" className="navbar__link">Jobs</NavLink>
              <NavLink to="/technician/availability" className="navbar__link">Availability</NavLink>
              <NavLink to="/technician/history" className="navbar__link">History</NavLink>
              <NavLink to="/technician/notifications" className="navbar__link">Notifications</NavLink>
              <NavLink to="/technician/profile" className="navbar__link">Profile</NavLink>
            </>
          )}
        </nav>

        <div className="navbar__actions">
          {profile && (
            <span className="navbar__user">
              <span className="navbar__avatar" aria-hidden="true">
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className="navbar__username">{userName}</span>
            </span>
          )}
          <button className="navbar__logout" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
`,

  'src/routes/AppRouter.jsx': `import React from 'react';
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
`,

  'src/pages/technician/TechnicianDashboard.jsx': `import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTechnician } from '../../context/TechnicianContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import '../customer/Dashboard.css';

export default function TechnicianDashboard() {
  const { profile } = useAuth();
  const { technician } = useTechnician();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    upcomingJobs: 0,
    completedJobs: 0,
    history: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!technician) return;

    async function loadStats() {
      const techId = technician.technician_id;
      try {
        const [upRes, compRes, histRes] = await Promise.all([
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('technician_id', techId).eq('status', 'Booked'),
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('technician_id', techId).eq('status', 'Completed'),
          supabase.from('service_history').select('history_id', { count: 'exact', head: true }).eq('technician_id', techId)
        ]);

        setStats({
          upcomingJobs: upRes.count || 0,
          completedJobs: compRes.count || 0,
          history: histRes.count || 0
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [technician]);

  return (
    <PageContainer className="dashboard-content">
      <section className="dashboard-welcome">
        <div>
          <h1 className="dashboard-welcome__title">Welcome back, {profile?.full_name?.split(' ')[0] || 'Technician'} 👋</h1>
          <p className="dashboard-welcome__subtitle">
            Status: <span style={{ fontWeight: '600', color: technician.is_available ? '#15803d' : '#b91c1c' }}>
              {technician.is_available ? 'Available' : 'Unavailable'}
            </span>
          </p>
        </div>
        <Button size="md" onClick={() => navigate('/technician/jobs')}>View Schedule</Button>
      </section>

      <div className="stat-grid">
        <StatCard icon="📅" label="Upcoming Jobs" value={loading ? '...' : stats.upcomingJobs} link="/technician/jobs" />
        <StatCard icon="✅" label="Completed Jobs" value={loading ? '...' : stats.completedJobs} link="/technician/history" />
        <StatCard icon="⭐" label="Current Rating" value={technician.rating > 0 ? technician.rating.toFixed(1) : 'New'} link="/technician/profile" />
        <StatCard icon="🔔" label="Notifications" value="View" link="/technician/notifications" />
      </div>

      <div className="dashboard-section">
        <h2 className="dashboard-section__title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={() => navigate('/technician/availability')}>Update Availability</Button>
          <Button variant="secondary" onClick={() => navigate('/technician/profile')}>View Profile</Button>
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({ icon, label, value, link }) {
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <Card padding="md" className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', height: '100%' }}>
        <div className="stat-card__icon" aria-hidden="true">{icon}</div>
        <div>
          <p className="stat-card__value">{value}</p>
          <p className="stat-card__label">{label}</p>
        </div>
      </Card>
    </Link>
  );
}
`,

  'src/pages/technician/JobsPage.jsx': `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';

export default function JobsPage() {
  const { technician } = useTechnician();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('technician_id', technician.technician_id)
          .order('service_date', { ascending: true });
        if (data) setJobs(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [technician]);

  const upcoming = jobs.filter(j => j.status === 'Booked');
  const completed = jobs.filter(j => j.status === 'Completed');
  const other = jobs.filter(j => j.status !== 'Booked' && j.status !== 'Completed');

  const renderSection = (title, list) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{title} ({list.length})</h2>
      {list.length === 0 ? (
        <Card padding="md">
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No jobs in this category.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {list.map(j => (
            <Card key={j.booking_id} padding="md" style={{ cursor: 'pointer', borderLeft: '4px solid var(--color-primary)' }} onClick={() => navigate(\`/technician/jobs/\${j.booking_id}\`)}>
              <h3 style={{ margin: '0 0 0.5rem' }}>{j.customer_name || 'Customer'}</h3>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Service:</strong> {j.service_category}</p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Date:</strong> {j.service_date} ({j.start_time || 'TBD'})</p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}><strong>Area:</strong> {j.area}</p>
              <span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{j.status}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>My Jobs</h1>
      {loading ? (
        <p>Loading jobs...</p>
      ) : (
        <>
          {renderSection('Upcoming', upcoming)}
          {renderSection('Completed', completed)}
          {renderSection('Other', other)}
        </>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/technician/JobDetailsPage.jsx': `import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';

export default function JobDetailsPage() {
  const { bookingId } = useParams();
  const { technician } = useTechnician();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [appliance, setAppliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: jobData, error: jobErr } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('technician_id', technician.technician_id)
          .single();

        if (jobErr) throw new Error("Job not found or unauthorized.");
        setJob(jobData);

        if (jobData.appliance_id) {
          const { data: appData, error: appErr } = await supabase
            .from('appliances')
            .select('*')
            .eq('appliance_id', jobData.appliance_id)
            .single();
          
          if (!appErr && appData) {
            setAppliance(appData);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId, technician.technician_id]);

  if (loading) return <PageContainer className="dashboard-content"><p>Loading job details...</p></PageContainer>;
  if (error) return <PageContainer className="dashboard-content"><div className="auth-message auth-message--error">{error}</div><Button onClick={() => navigate('/technician/jobs')}>Back to Jobs</Button></PageContainer>;

  return (
    <PageContainer className="dashboard-content">
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/technician/jobs')} style={{ marginBottom: '1rem' }}>← Back to Jobs</Button>
        <h1 className="dashboard-welcome__title">Job: {job.service_category}</h1>
        <span className="status-badge" style={{ background: '#dcfce7', color: '#15803d', marginTop: '0.5rem', display: 'inline-block' }}>{job.status}</span>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Service Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Customer:</strong> {job.customer_name || 'N/A'}</p>
            <p><strong>Date:</strong> {job.service_date || 'TBD'}</p>
            <p><strong>Time Window:</strong> {(job.start_time && job.end_time) ? \`\${job.start_time} - \${job.end_time}\` : 'TBD'}</p>
            <p><strong>Address:</strong> {job.address || 'N/A'}</p>
            <p><strong>Area:</strong> {job.area || 'N/A'}</p>
          </div>
        </Card>

        {appliance && (
          <Card padding="lg">
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Appliance Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p><strong>Type:</strong> {appliance.appliance_type}</p>
              <p><strong>Brand:</strong> {appliance.brand || 'N/A'}</p>
              <p><strong>Model:</strong> {appliance.model || 'N/A'}</p>
              <p><strong>Health Score:</strong> {appliance.health_score}/100 ({appliance.health_status})</p>
              <p><strong>Installation Date:</strong> {appliance.installation_date || 'N/A'}</p>
              <p><strong>Last Service:</strong> {appliance.last_service_date || 'N/A'}</p>
              {appliance.technician_notes && (
                <div>
                  <strong>Previous Notes:</strong>
                  <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{appliance.technician_notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
`,

  'src/pages/technician/AvailabilityPage.jsx': `import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';

export default function AvailabilityPage() {
  const { technician } = useTechnician();

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Availability Settings</h1>
      
      <div className="auth-message auth-message--info" style={{ marginBottom: '2rem' }}>
        <strong>READ ONLY:</strong> Profile editing will be fully enabled in a future phase.
      </div>

      <Card padding="lg" style={{ maxWidth: '600px' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Current Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '16px', height: '16px', borderRadius: '50%', 
            background: technician.is_available ? '#15803d' : '#ef4444' 
          }} />
          <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>
            {technician.is_available ? 'Available for new jobs' : 'Unavailable'}
          </span>
        </div>

        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Configured Schedule</h2>
        {(!technician.availability || Object.keys(technician.availability).length === 0) ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No specific schedule configured.</p>
        ) : (
          <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', overflowX: 'auto' }}>
            {JSON.stringify(technician.availability, null, 2)}
          </pre>
        )}
      </Card>
    </PageContainer>
  );
}
`,

  'src/pages/technician/TechnicianHistoryPage.jsx': `import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';

export default function TechnicianHistoryPage() {
  const { technician } = useTechnician();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('service_history')
          .select('*')
          .eq('technician_id', technician.technician_id)
          .order('service_date', { ascending: false });
        if (data) setHistory(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [technician]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Completed Jobs & History</h1>
      {loading ? <p>Loading history...</p> : history.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Completed service visits will appear here.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map(h => (
            <Card key={h.history_id} padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem' }}>{h.service_category || 'Service Call'}</h3>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Date: {h.service_date}</p>
                  {h.issues_found && <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Issues:</strong> {h.issues_found}</p>}
                  {h.technician_notes && <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Notes:</strong> {h.technician_notes}</p>}
                </div>
                {h.amount && <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>\${h.amount}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/technician/NotificationsPage.jsx': `import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) setNotifications(data);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('notification_id', id);
      if (!error) {
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Notifications</h1>
      {loading ? <p>Loading notifications...</p> : notifications.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>You're all caught up.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(n => (
            <Card key={n.notification_id} padding="md" style={{ background: n.read ? 'var(--color-surface)' : '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.0625rem' }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{n.message}</p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.notification_id)}>Mark Read</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/technician/TechnicianProfilePage.jsx': `import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';

export default function TechnicianProfilePage() {
  const { technician } = useTechnician();

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>My Profile</h1>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Name:</strong> {technician.name}</p>
            <p><strong>Email:</strong> {technician.email}</p>
            <p><strong>Phone:</strong> {technician.phone}</p>
            <p><strong>Service Area:</strong> {technician.area}</p>
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Professional Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Hourly Rate:</strong> \${technician.hourly_rate}/hr</p>
            <p><strong>Current Rating:</strong> {technician.rating > 0 ? \`\${technician.rating} / 5.0\` : 'New / No ratings yet'}</p>
            <div>
              <strong>Service Categories:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {technician.service_categories?.map(c => (
                  <span key={c} className="status-badge" style={{ background: '#f1f5f9', color: '#334155' }}>{c}</span>
                )) || 'None specified'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
`
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filepath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('Wrote', filepath);
}

