import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Briefcase, MapPin, Clock } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

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
        .select('booking_id, customer_id, customer_name, service_category, appliance_id, service_date, service_time_slot, start_time, end_time, status, area, address')
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
    
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

  const upcoming = jobs.filter(j => j.status === 'Booked');
  const completed = jobs.filter(j => j.status === 'Completed');
  const other = jobs.filter(j => j.status !== 'Booked' && j.status !== 'Completed');

  const getStatusVariant = (status) => {
    if (status === 'Completed') return 'success';
    if (status === 'Booked') return 'info';
    return 'neutral';
  };

  const renderSection = (title, list, badgeVariant) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-title" style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
        <Badge variant={badgeVariant}>{list.length}</Badge>
      </div>
      
      {list.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title={`No ${title.toLowerCase()} jobs`}
          description={`You have no ${title.toLowerCase()} jobs assigned.`}
        />
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {list.map(j => (
            <Card key={j.booking_id} padding="lg" onClick={() => navigate(`/technician/jobs/${j.booking_id}`)} style={{ cursor: 'pointer', borderLeft: `4px solid var(--color-${badgeVariant})` }}>
              <div className="flex justify-between items-start mb-2">
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--color-navy)' }}>{j.customer_name || 'Customer'}</h3>
                <Badge variant={getStatusVariant(j.status)}>{j.status}</Badge>
              </div>
              <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '0.875rem' }}>{j.service_category}</p>
              
              <div className="flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted" />
                  <span className="text-muted" style={{ fontSize: '0.9375rem' }}>{j.service_date ? new Date(j.service_date).toLocaleDateString() : 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted" />
                  <span className="text-muted" style={{ fontSize: '0.9375rem' }}>{j.service_time_slot || ((j.start_time && j.end_time) ? `${j.start_time} - ${j.end_time}` : j.start_time) || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-muted" />
                  <span className="text-muted" style={{ fontSize: '0.9375rem' }}>{j.area || 'N/A'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-title">My Jobs</h1>
        <Button variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </Button>
      </div>
      
      {error && (
        <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}
      
      {loading ? (
        <LoadingState message="Loading your assigned jobs..." fullHeight />
      ) : (
        <>
          {renderSection('Upcoming', upcoming, 'info')}
          {renderSection('Completed', completed, 'success')}
          {renderSection('Other', other, 'neutral')}
        </>
      )}
    </PageContainer>
  );
}
