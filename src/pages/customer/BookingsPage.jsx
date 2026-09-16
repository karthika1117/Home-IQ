import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

export default function BookingsPage() {
  const { customer } = useCustomer();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!customer?.customer_code) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select('booking_id, service_category, service_date, start_time, end_time, status, technician_id, area, address, customer_name')
        .eq('customer_id', customer.customer_code)
        .order('service_date', { ascending: false });

      if (fetchErr) throw fetchErr;
      setBookings(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => { 
    load(); 
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

  const statusStyle = (status) => {
    if (status === 'Booked') return { background: '#dbeafe', color: '#1d4ed8' };
    if (status === 'Completed') return { background: '#dcfce7', color: '#15803d' };
    if (status === 'Cancelled') return { background: '#fee2e2', color: '#b91c1c' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title" style={{ margin: 0 }}>My Bookings</h1>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {error && (
        <div className="auth-message auth-message--error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading your bookings..." fullHeight />
      ) : bookings.length === 0 ? (
        <EmptyState 
          icon="📅"
          title="No bookings yet"
          description="You don't have any upcoming or past bookings at this time."
        />
      ) : (
        <Card padding="none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Technician ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.booking_id}>
                  <td className="td-primary">{b.service_category || 'Service Call'}</td>
                  <td className="td-muted" style={{ fontSize: '0.78rem', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.technician_id || '—'}</td>
                  <td>{b.service_date || '—'}</td>
                  <td className="td-muted">{(b.start_time && b.end_time) ? `${b.start_time} – ${b.end_time}` : '—'}</td>
                  <td className="td-muted">{b.area || '—'}</td>
                  <td><span className="status-badge" style={statusStyle(b.status)}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}
