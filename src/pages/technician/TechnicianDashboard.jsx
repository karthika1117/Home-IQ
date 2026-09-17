import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, Star, Bell, ArrowRight, UserCheck, Settings } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { useTechnician } from '../../context/TechnicianContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
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
          supabase.from('bookings').select('booking_id, customer_name, service_category, service_date, start_time, end_time, status, area').eq('technician_id', techId).order('service_date', { ascending: false }).limit(5)
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

  const getStatusVariant = (status) => {
    if (status === 'Completed') return 'success';
    if (status === 'Booked') return 'info';
    return 'warning';
  };

  return (
    <PageContainer>
      <div className="flex-row justify-between mb-8">
        <div>
          <h1 className="text-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Technician'}
          </h1>
          <div className="flex gap-2 items-center">
            <span className="text-muted">Status:</span>
            <Badge variant={technician?.is_available ? 'success' : 'danger'}>
              {technician?.is_available ? 'Available for Jobs' : 'Unavailable'}
            </Badge>
          </div>
        </div>
        <div>
          <Button onClick={() => navigate('/technician/jobs')}><Calendar size={16} /> View Schedule</Button>
        </div>
      </div>

      {error && <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <StatCard icon={<Calendar size={24} />} label="Upcoming Jobs" value={loading ? '...' : stats.upcomingJobs} onClick={() => navigate('/technician/jobs')} />
        <StatCard icon={<CheckCircle size={24} />} label="Completed Jobs" value={loading ? '...' : stats.completedJobs} onClick={() => navigate('/technician/history')} />
        <StatCard icon={<Star size={24} />} label="Current Rating" value={technician?.rating > 0 ? technician.rating.toFixed(1) : 'New'} onClick={() => navigate('/technician/profile')} />
        <StatCard icon={<Bell size={24} />} label="Notifications" value={loading ? '...' : stats.notifications} onClick={() => navigate('/technician/notifications')} highlight={stats.notifications > 0} />
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: '1fr', marginBottom: '2rem' }}>
        <Card padding="none" className="dashboard-section" style={{ overflowX: 'auto' }}>
          <div className="flex justify-between items-center" style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-title" style={{ fontSize: '1.25rem', margin: 0 }}>Recent Jobs</h2>
            <Link to="/technician/jobs" className="flex items-center gap-1" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '24px' }}><LoadingState message="Loading recent jobs..." /></div>
          ) : recentJobs.length === 0 ? (
            <div style={{ padding: '24px' }}><EmptyState icon={Calendar} title="No jobs yet" description="No jobs have been assigned yet." /></div>
          ) : (
            <table className="data-table" style={{ margin: 0 }}>
              <thead><tr><th>Customer</th><th>Service</th><th>Date & Time</th><th>Area</th><th>Status</th></tr></thead>
              <tbody>
                {recentJobs.map(job => (
                  <tr key={job.booking_id}>
                    <td style={{ fontWeight: 500 }}><Link to={`/technician/jobs/${job.booking_id}`} style={{ color: 'var(--color-navy)', textDecoration: 'none' }}>{job.customer_name || 'Customer'}</Link></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{job.service_category || 'Service Call'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(job.service_date).toLocaleDateString()} {(job.start_time || job.end_time) ? `, ${job.start_time || ''} - ${job.end_time || ''}`.replace(/ - $/, '') : ''}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{job.area || 'N/A'}</td>
                    <td><Badge variant={getStatusVariant(job.status)}>{job.status || 'Unknown'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <Card padding="lg" style={{ cursor: 'pointer' }} onClick={() => navigate('/technician/availability')} className="appliance-mini-card">
          <div className="flex items-center gap-4">
            <div className="appliance-icon"><Clock size={24} color="var(--color-primary)" /></div>
            <div>
              <h3 className="text-title" style={{ fontSize: '1.125rem', margin: '0 0 4px' }}>Update Availability</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9375rem' }}>Manage your weekly schedule</p>
            </div>
          </div>
        </Card>
        
        <Card padding="lg" style={{ cursor: 'pointer' }} onClick={() => navigate('/technician/profile')} className="appliance-mini-card">
          <div className="flex items-center gap-4">
            <div className="appliance-icon"><UserCheck size={24} color="var(--color-primary)" /></div>
            <div>
              <h3 className="text-title" style={{ fontSize: '1.125rem', margin: '0 0 4px' }}>Manage Profile</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9375rem' }}>Update skills and areas</p>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function StatCard({ icon, label, value, onClick, highlight }) {
  return (
    <Card padding="lg" className="stat-card" onClick={onClick} style={{ cursor: 'pointer', border: highlight ? '1px solid var(--color-primary)' : undefined }}>
      <div className="stat-card__icon" style={{ backgroundColor: highlight ? 'var(--color-primary-bg)' : undefined, color: highlight ? 'var(--color-primary)' : undefined }}>
        {icon}
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </Card>
  );
}
