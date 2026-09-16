import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';

export default function JobsPage() {
  const { technician } = useTechnician();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [appliances, setAppliances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!technician?.technician_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: jobsErr } = await supabase
        .from('bookings')
        .select('booking_id, customer_id, customer_name, service_category, appliance_id, service_date, start_time, end_time, status, area, address')
        .eq('technician_id', technician.technician_id)
        .order('service_date', { ascending: true });

      if (jobsErr) throw jobsErr;

      setJobs(data || []);

      const applianceIds = [...new Set((data || []).map(j => j.appliance_id).filter(Boolean))];
      if (applianceIds.length > 0) {
        const { data: applianceData } = await supabase
          .from('appliances')
          .select('appliance_id, appliance_type, brand, model')
          .in('appliance_id', applianceIds);
        setAppliances(Object.fromEntries((applianceData || []).map(a => [a.appliance_id, a])));
      } else {
        setAppliances({});
      }
    } catch (err) {
      setError(err.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, [technician]);

  useEffect(() => { 
    load(); 
    
    // Refresh when tab gains focus
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

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
            <Card key={j.booking_id} padding="md" style={{ cursor: 'pointer', borderLeft: '4px solid var(--color-primary)' }} onClick={() => navigate(`/technician/jobs/${j.booking_id}`)}>
              <h3 style={{ margin: '0 0 0.5rem' }}>{j.customer_name || 'Customer'}</h3>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Service:</strong> {j.service_category}</p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Appliance:</strong> {formatAppliance(appliances[j.appliance_id], j.appliance_id)}</p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Date:</strong> {j.service_date || 'TBD'}</p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Time:</strong> {(j.start_time && j.end_time) ? `${j.start_time} - ${j.end_time}` : j.start_time || 'TBD'}</p>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Area:</strong> {j.area || 'N/A'}</p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}><strong>Address:</strong> {j.address || 'N/A'}</p>
              <span className="status-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{j.status}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title" style={{ margin: 0 }}>My Jobs</h1>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Refresh
        </button>
      </div>
      {error && (
        <div className="auth-message auth-message--error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
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

function formatAppliance(appliance, applianceId) {
  if (appliance) return [appliance.brand, appliance.model, appliance.appliance_type].filter(Boolean).join(' ') || 'Appliance';
  return applianceId || 'N/A';
}
