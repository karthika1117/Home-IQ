import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, Search, FileText } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

export default function ServiceRequestsPage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRequests() {
      if (!customer?.customer_code) return;
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (fetchError) {
        setError(fetchError.message || 'Unable to load service requests.');
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
    
    const handleFocus = () => loadRequests();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [customer]);

  const getStatusVariant = (status) => {
    if (['Completed', 'Complete'].includes(status)) return 'success';
    if (['Cancelled', 'Canceled', 'Rejected'].includes(status)) return 'danger';
    if (['Booked', 'Confirmed', 'Assigned'].includes(status)) return 'info';
    if (status === 'Searching') return 'warning';
    return 'neutral';
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      Searching: 'Finding a technician...',
      Assigned: 'A technician has been assigned.',
      Booked: 'Your appointment is confirmed.',
      Confirmed: 'Your appointment is confirmed.',
      Completed: 'Service completed.',
      Complete: 'Service completed.'
    };
    return descriptions[status] || 'Active request.';
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-title">Service Requests</h1>
        <Button onClick={() => navigate('/customer/requests/new')}><Plus size={16} /> Request Service</Button>
      </div>

      {loading ? (
        <LoadingState message="Loading your service requests..." fullHeight />
      ) : error ? (
        <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>
      ) : requests.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No service requests yet"
          description="You haven't made any service requests yet."
          action={<Button variant="primary" onClick={() => navigate('/customer/requests/new')}>Request Service</Button>}
        />
      ) : (
        <Card padding="none" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Appliance</th>
                <th>Area</th>
                <th>Preferred Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.request_id}>
                  <td style={{ fontWeight: 500, color: 'var(--color-navy)' }}>{r.category || 'Service request'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{r.appliance_id || 'None selected'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{r.area || 'N/A'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{r.preferred_date ? new Date(r.preferred_date).toLocaleDateString() : 'Flexible'}</td>
                  <td>
                    <Badge variant={getStatusVariant(r.status)}>{r.status || 'Unknown'}</Badge>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {getStatusDescription(r.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}
