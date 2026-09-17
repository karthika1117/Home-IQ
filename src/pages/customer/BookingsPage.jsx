import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
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
        .select('booking_id, service_category, service_date, service_time_slot, status, technicians(name), area, address, customer_name')
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

  const getStatusVariant = (status) => {
    if (status === 'Confirmed' || status === 'Booked') return 'info';
    if (status === 'Completed') return 'success';
    if (status === 'Cancelled') return 'danger';
    return 'warning';
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-title">My Bookings</h1>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading your bookings..." fullHeight />
      ) : bookings.length === 0 ? (
        <EmptyState 
          icon={CalendarCheck}
          title="No bookings yet"
          description="You don't have any upcoming or past bookings at this time."
        />
      ) : (
        <Card padding="none" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Technician</th>
                <th>Date</th>
                <th>Time</th>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.booking_id}>
                  <td style={{ fontWeight: 500, color: 'var(--color-navy)' }}>{b.service_category || 'Service Call'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{b.technicians?.name || 'Assigned Technician'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(b.service_date).toLocaleDateString() || '-'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{b.service_time_slot || '-'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{b.area || '-'}</td>
                  <td><Badge variant={getStatusVariant(b.status)}>{b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}
