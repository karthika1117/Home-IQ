import React, { useState, useEffect } from 'react';
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
    history: 0,
    notifications: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!technician) return;

    async function loadStats() {
      const techId = technician.technician_id;
      try {
        const [upRes, compRes, histRes, notificationRes, recentRes] = await Promise.all([
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('technician_id', techId).eq('status', 'Booked'),
          supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('technician_id', techId).eq('status', 'Completed'),
          supabase.from('service_history').select('history_id', { count: 'exact', head: true }).eq('technician_id', techId),
          supabase.from('notifications').select('notification_id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('read', false),
          supabase.from('bookings').select('booking_id, customer_name, service_category, service_date, start_time, status, area').eq('technician_id', techId).order('service_date', { ascending: false }).limit(5)
        ]);

        const failedRequest = [upRes, compRes, histRes, notificationRes, recentRes].find(result => result.error);
        if (failedRequest) throw failedRequest.error;

        setStats({
          upcomingJobs: upRes.count || 0,
          completedJobs: compRes.count || 0,
          history: histRes.count || 0,
          notifications: notificationRes.count || 0
        });
        setRecentJobs(recentRes.data || []);
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    
    const handleFocus = () => loadStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [profile?.id, technician]);

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

      {error && <div className="auth-message auth-message--error" role="alert">{error}</div>}

      <div className="stat-grid">
        <StatCard icon="📅" label="Upcoming Jobs" value={loading ? '...' : stats.upcomingJobs} link="/technician/jobs" />
        <StatCard icon="✅" label="Completed Jobs" value={loading ? '...' : stats.completedJobs} link="/technician/history" />
        <StatCard icon="▣" label="Service History" value={loading ? '...' : stats.history} link="/technician/history" />
        <StatCard icon="⭐" label="Current Rating" value={technician.rating > 0 ? technician.rating.toFixed(1) : 'New'} link="/technician/profile" />
        <StatCard icon="🔔" label="Unread Notifications" value={loading ? '...' : stats.notifications} link="/technician/notifications" />
      </div>

      <div className="dashboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
          <h2 className="dashboard-section__title">Recent Jobs</h2>
          <Link to="/technician/jobs" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>View all</Link>
        </div>
        {loading ? <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading recent jobs...</p> : recentJobs.length === 0 ? (
          <Card padding="md" style={{ marginTop: '1rem' }}><p style={{ color: 'var(--color-text-secondary)' }}>No jobs have been assigned yet.</p></Card>
        ) : (
          <Card padding="none" style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Area</th><th>Status</th></tr></thead>
              <tbody>{recentJobs.map(job => (
                <tr key={job.booking_id}>
                  <td className="td-primary"><Link to={`/technician/jobs/${job.booking_id}`}>{job.customer_name || 'Customer'}</Link></td>
                  <td>{job.service_category || 'Service Call'}</td>
                  <td>{job.service_date || 'TBD'}{job.start_time ? `, ${job.start_time}` : ''}</td>
                  <td>{job.area || 'N/A'}</td>
                  <td><span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{job.status || 'Unknown'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        )}
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
