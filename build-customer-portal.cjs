const fs = require('fs');
const path = require('path');

const files = {
  'src/context/CustomerContext.jsx': `import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageContainer from '../components/PageContainer';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  const { user, profile } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'customer') {
      setLoading(false);
      return;
    }

    async function fetchCustomer() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('customers')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (fetchErr) throw fetchErr;
        if (!data.customer_code) {
          throw new Error("Customer profile is incomplete. Please contact support.");
        }
        setCustomer(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [user, profile]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading customer data...
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
    <CustomerContext.Provider value={{ customer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
`,

  'src/layouts/CustomerLayout.jsx': `import React from 'react';
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

import CustomerDashboard from '../pages/customer/CustomerDashboard';
import AppliancesPage from '../pages/customer/AppliancesPage';
import AddAppliancePage from '../pages/customer/AddAppliancePage';
import ApplianceDetailsPage from '../pages/customer/ApplianceDetailsPage';
import ServiceRequestsPage from '../pages/customer/ServiceRequestsPage';
import CreateServiceRequestPage from '../pages/customer/CreateServiceRequestPage';
import BookingsPage from '../pages/customer/BookingsPage';
import ServiceHistoryPage from '../pages/customer/ServiceHistoryPage';
import OpportunitiesPage from '../pages/customer/OpportunitiesPage';
import NotificationsPage from '../pages/customer/NotificationsPage';

import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import Navbar from '../components/Navbar';

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
        <Route path="notifications" element={<NotificationsPage />} />
        
        {/* Redirect /customer to /customer/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Technician Portal */}
      <Route path="/technician" element={
        <ProtectedRoute allowedRoles={['technician']}>
          <div className="dashboard-layout">
            <Navbar />
            <Routes>
              <Route path="dashboard" element={<TechnicianDashboard />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </ProtectedRoute>
      } />

      <Route path="/dev/connection" element={<ConnectionStatusPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
`,

  'src/pages/customer/CustomerDashboard.jsx': `import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import './Dashboard.css';

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { customer } = useCustomer();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    appliances: null,
    bookings: null,
    history: null,
    opportunities: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;

    async function loadStats() {
      const code = customer.customer_code;
      try {
        const [appRes, bookRes, histRes, oppRes] = await Promise.all([
          supabase.from('appliances').select('appliance_id', { count: 'exact', head: true }).eq('customer_id', code),
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('customer_id', code),
          supabase.from('service_history').select('history_id', { count: 'exact', head: true }).eq('customer_id', code),
          supabase.from('opportunities').select('opportunity_id', { count: 'exact', head: true }).eq('customer_id', code).eq('status', 'Open')
        ]);

        setStats({
          appliances: appRes.count || 0,
          bookings: bookRes.count || 0,
          history: histRes.count || 0,
          opportunities: oppRes.count || 0
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <section className="dashboard-welcome">
        <div>
          <h1 className="dashboard-welcome__title">Welcome back, {profile?.full_name?.split(' ')[0] || 'Customer'} 👋</h1>
          <p className="dashboard-welcome__subtitle">Manage your home appliances and service requests from one place.</p>
        </div>
        <Button size="md" onClick={() => navigate('/customer/requests/new')}>+ Request Service</Button>
      </section>

      <div className="stat-grid">
        <StatCard icon="🏠" label="My Appliances" value={loading ? '...' : stats.appliances} link="/customer/appliances" />
        <StatCard icon="📅" label="Upcoming Bookings" value={loading ? '...' : stats.bookings} link="/customer/bookings" />
        <StatCard icon="✅" label="Service History" value={loading ? '...' : stats.history} link="/customer/history" />
        <StatCard icon="⭐" label="Open Opportunities" value={loading ? '...' : stats.opportunities} link="/customer/opportunities" />
      </div>

      <div className="dashboard-section">
        <h2 className="dashboard-section__title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={() => navigate('/customer/appliances/new')}>Add Appliance</Button>
          <Button variant="secondary" onClick={() => navigate('/customer/notifications')}>View Notifications</Button>
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

  'src/pages/customer/AppliancesPage.jsx': `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function AppliancesPage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAppliances() {
      try {
        const { data, error } = await supabase
          .from('appliances')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAppliances(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAppliances();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title">My Appliances</h1>
        <Button onClick={() => navigate('/customer/appliances/new')}>+ Add Appliance</Button>
      </div>

      {error && <div className="auth-message auth-message--error">{error}</div>}

      {loading ? (
        <p>Loading appliances...</p>
      ) : appliances.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No appliances added yet. Add your first appliance to keep track of its health and service history.</p>
          <Button variant="secondary" onClick={() => navigate('/customer/appliances/new')}>Add Appliance</Button>
        </Card>
      ) : (
        <div className="item-grid">
          {appliances.map(a => (
            <Card key={a.appliance_id} padding="md" className="item-card" style={{ cursor: 'pointer' }} onClick={() => navigate(\`/customer/appliances/\${a.appliance_id}\`)}>
              <div className="item-card__info">
                <h3 className="item-card__name" style={{ marginBottom: '0.5rem' }}>{a.brand} {a.appliance_type}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Model: {a.model || 'Unknown'}</p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Status: <span style={{ fontWeight: 'bold' }}>{a.health_status}</span> ({a.health_score}/100)</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/customer/AddAppliancePage.jsx': `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function AddAppliancePage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    appliance_type: '',
    brand: '',
    model: '',
    installation_date: '',
    last_service_date: '',
    technician_notes: ''
  });

  const handleChange = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.appliance_type.trim()) {
      setError("Appliance Type is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from('appliances').insert({
        customer_id: customer.customer_code,
        appliance_type: form.appliance_type,
        brand: form.brand || null,
        model: form.model || null,
        installation_date: form.installation_date || null,
        last_service_date: form.last_service_date || null,
        technician_notes: form.technician_notes || null
      });

      if (insertErr) throw insertErr;
      navigate('/customer/appliances');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Add New Appliance</h1>
        <Card padding="lg">
          {error && <div className="auth-message auth-message--error" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <Input label="Appliance Type *" id="appliance_type" value={form.appliance_type} onChange={handleChange('appliance_type')} required placeholder="e.g. Refrigerator, HVAC" />
            <div className="form-row">
              <Input label="Brand" id="brand" value={form.brand} onChange={handleChange('brand')} placeholder="e.g. Samsung" />
              <Input label="Model" id="model" value={form.model} onChange={handleChange('model')} placeholder="e.g. RF28R7351SG" />
            </div>
            <div className="form-row">
              <Input label="Installation Date" id="installation_date" type="date" value={form.installation_date} onChange={handleChange('installation_date')} />
              <Input label="Last Service Date" id="last_service_date" type="date" value={form.last_service_date} onChange={handleChange('last_service_date')} />
            </div>
            <div className="field">
              <label htmlFor="notes" className="field__label">Technician Notes</label>
              <textarea id="notes" className="field__input" style={{ minHeight: '100px', resize: 'vertical' }} value={form.technician_notes} onChange={handleChange('technician_notes')} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" loading={loading}>Save Appliance</Button>
              <Button variant="ghost" onClick={() => navigate('/customer/appliances')} type="button" disabled={loading}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
`,

  'src/pages/customer/ApplianceDetailsPage.jsx': `import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function ApplianceDetailsPage() {
  const { applianceId } = useParams();
  const { customer } = useCustomer();
  const navigate = useNavigate();
  
  const [appliance, setAppliance] = useState(null);
  const [history, setHistory] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: app, error: appErr } = await supabase
          .from('appliances')
          .select('*')
          .eq('appliance_id', applianceId)
          .eq('customer_id', customer.customer_code)
          .single();

        if (appErr) throw new Error("Appliance not found or unauthorized.");
        setAppliance(app);

        const [histRes, oppRes] = await Promise.all([
          supabase.from('service_history').select('*').eq('appliance_id', applianceId).order('service_date', { ascending: false }),
          supabase.from('opportunities').select('*').eq('appliance_id', applianceId).order('created_at', { ascending: false })
        ]);

        if (histRes.data) setHistory(histRes.data);
        if (oppRes.data) setOpportunities(oppRes.data);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [applianceId, customer.customer_code]);

  if (loading) return <PageContainer className="dashboard-content"><p>Loading appliance details...</p></PageContainer>;
  if (error) return <PageContainer className="dashboard-content"><div className="auth-message auth-message--error">{error}</div><Button onClick={() => navigate('/customer/appliances')}>Back</Button></PageContainer>;

  return (
    <PageContainer className="dashboard-content">
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/customer/appliances')} style={{ marginBottom: '1rem' }}>← Back to Appliances</Button>
        <h1 className="dashboard-welcome__title">{appliance.brand} {appliance.appliance_type}</h1>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card padding="lg">
          <h2 className="dashboard-section__title">Basic Information</h2>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Model:</strong> {appliance.model || 'N/A'}</p>
            <p><strong>Health Score:</strong> {appliance.health_score}/100 ({appliance.health_status})</p>
            <p><strong>Installation Date:</strong> {appliance.installation_date || 'N/A'}</p>
            <p><strong>Last Service:</strong> {appliance.last_service_date || 'N/A'}</p>
            {appliance.technician_notes && (
              <div>
                <strong>Technician Notes:</strong>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{appliance.technician_notes}</p>
              </div>
            )}
          </div>
        </Card>

        <div>
          <h2 className="dashboard-section__title" style={{ marginBottom: '1rem' }}>Service History</h2>
          {history.length === 0 ? (
            <Card padding="md"><p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No service history recorded.</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map(h => (
                <Card key={h.history_id} padding="md">
                  <h4 style={{ margin: '0 0 0.5rem' }}>{h.service_date} - {h.service_category}</h4>
                  {h.issues_found && <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}><strong>Issues:</strong> {h.issues_found}</p>}
                  {h.technician_notes && <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}><strong>Notes:</strong> {h.technician_notes}</p>}
                  {h.amount && <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'bold' }}>Cost: \${h.amount}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="dashboard-section__title" style={{ marginBottom: '1rem' }}>Opportunities</h2>
          {opportunities.length === 0 ? (
            <Card padding="md"><p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No open opportunities.</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {opportunities.map(o => (
                <Card key={o.opportunity_id} padding="md" style={{ borderLeft: o.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
                  <h4 style={{ margin: '0 0 0.5rem' }}>{o.title} <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{o.status}</span></h4>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{o.description}</p>
                  {o.suggested_action && <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Action:</strong> {o.suggested_action}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
`,

  'src/pages/customer/ServiceRequestsPage.jsx': `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function ServiceRequestsPage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });

        if (!error && data) setRequests(data);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title">Service Requests</h1>
        <Button onClick={() => navigate('/customer/requests/new')}>+ Request Service</Button>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No service requests yet.</p>
          <Button variant="secondary" onClick={() => navigate('/customer/requests/new')}>Request Service</Button>
        </Card>
      ) : (
        <Card padding="none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Area</th>
                <th>Preferred Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.request_id}>
                  <td className="td-primary">{r.category}</td>
                  <td>{r.area || 'N/A'}</td>
                  <td>{r.preferred_date || 'Flexible'}</td>
                  <td><span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/customer/CreateServiceRequestPage.jsx': `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function CreateServiceRequestPage() {
  const { customer } = useCustomer();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appliances, setAppliances] = useState([]);

  const [form, setForm] = useState({
    category: '',
    appliance_id: '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: customer?.address || '',
    area: customer?.city || '',
    preferred_date: '',
    preferred_start: '',
    preferred_end: ''
  });

  useEffect(() => {
    async function getAppliances() {
      const { data } = await supabase.from('appliances').select('appliance_id, brand, appliance_type').eq('customer_id', customer.customer_code);
      if (data) setAppliances(data);
    }
    getAppliances();
  }, [customer]);

  const handleChange = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category.trim()) {
      setError('Category is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from('service_requests').insert({
        customer_id: customer.customer_code,
        customer_name: profile.full_name,
        category: form.category,
        appliance_id: form.appliance_id || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        area: form.area || null,
        preferred_date: form.preferred_date || null,
        preferred_start: form.preferred_start || null,
        preferred_end: form.preferred_end || null,
        status: 'Searching'
      });

      if (insertErr) throw insertErr;
      navigate('/customer/requests');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Request Service</h1>
        <Card padding="lg">
          {error && <div className="auth-message auth-message--error" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <Input label="Service Category *" id="category" value={form.category} onChange={handleChange('category')} required placeholder="e.g. Plumbing, Appliance Repair" />
              <div className="field">
                <label className="field__label">Related Appliance</label>
                <select className="field__input" value={form.appliance_id} onChange={handleChange('appliance_id')}>
                  <option value="">-- None --</option>
                  {appliances.map(a => <option key={a.appliance_id} value={a.appliance_id}>{a.brand} {a.appliance_type}</option>)}
                </select>
              </div>
            </div>
            
            <div className="form-divider"><span>Contact Information</span></div>
            <div className="form-row">
              <Input label="Phone" id="phone" type="tel" value={form.phone} onChange={handleChange('phone')} />
              <Input label="Email" id="email" type="email" value={form.email} onChange={handleChange('email')} />
            </div>
            
            <div className="form-divider"><span>Location</span></div>
            <div className="form-row">
              <Input label="Address" id="address" value={form.address} onChange={handleChange('address')} />
              <Input label="Area / City" id="area" value={form.area} onChange={handleChange('area')} />
            </div>
            
            <div className="form-divider"><span>Preferences (Optional)</span></div>
            <div className="form-row">
              <Input label="Preferred Date" id="preferred_date" type="date" value={form.preferred_date} onChange={handleChange('preferred_date')} />
              <Input label="Start Time" id="preferred_start" type="time" value={form.preferred_start} onChange={handleChange('preferred_start')} />
              <Input label="End Time" id="preferred_end" type="time" value={form.preferred_end} onChange={handleChange('preferred_end')} />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button type="submit" loading={loading}>Submit Request</Button>
              <Button variant="ghost" onClick={() => navigate('/customer/requests')} type="button" disabled={loading}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
`,

  'src/pages/customer/BookingsPage.jsx': `import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function BookingsPage() {
  const { customer } = useCustomer();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('service_date', { ascending: false });
        if (data) setBookings(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>My Bookings</h1>
      {loading ? <p>Loading bookings...</p> : bookings.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No upcoming bookings.</p>
        </Card>
      ) : (
        <Card padding="none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.booking_id}>
                  <td className="td-primary">{b.service_category || 'Service Call'}</td>
                  <td>{b.service_date || 'TBD'}</td>
                  <td className="td-muted">{(b.start_time && b.end_time) ? \`\${b.start_time} - \${b.end_time}\` : 'TBD'}</td>
                  <td><span className="status-badge" style={{ background: '#dcfce7', color: '#15803d' }}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/customer/ServiceHistoryPage.jsx': `import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function ServiceHistoryPage() {
  const { customer } = useCustomer();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('service_history')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('service_date', { ascending: false });
        if (data) setHistory(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Service History</h1>
      {loading ? <p>Loading history...</p> : history.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No service history found.</p>
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

  'src/pages/customer/OpportunitiesPage.jsx': `import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function OpportunitiesPage() {
  const { customer } = useCustomer();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('opportunities')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });
        if (data) setOpportunities(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Opportunities & Recommendations</h1>
      {loading ? <p>Loading opportunities...</p> : opportunities.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No open opportunities or recommendations at this time.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {opportunities.map(o => (
            <Card key={o.opportunity_id} padding="md" style={{ borderLeft: o.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.0625rem' }}>{o.title}</h3>
                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{o.status}</span>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{o.description}</p>
              {o.suggested_action && <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Suggested Action:</strong> {o.suggested_action}</p>}
              {o.estimated_revenue && <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#15803d', fontWeight: 'bold' }}>Est. Cost: \${o.estimated_revenue}</p>}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
`,

  'src/pages/customer/NotificationsPage.jsx': `import React, { useState, useEffect } from 'react';
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
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>You have no notifications.</p>
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
`
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filepath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('Wrote', filepath);
}
