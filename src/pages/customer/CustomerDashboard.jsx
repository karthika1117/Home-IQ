import React, { useState, useEffect } from 'react';
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
          supabase.from('appliances').select('appliance_id', { count: 'exact', head: true }).eq('customer_id', customer.customer_id),
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
