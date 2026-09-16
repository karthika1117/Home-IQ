import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRequests() {
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

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title">Service Requests</h1>
        <Button onClick={() => navigate('/customer/requests/new')}>+ Request Service</Button>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : error ? (
        <div className="auth-message auth-message--error" role="alert">{error}</div>
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
                  <td className="td-primary">{r.category || 'Service request'}</td>
                  <td>{r.appliance_id || 'None selected'}</td>
                  <td>{r.area || 'N/A'}</td>
                  <td>{r.preferred_date || 'Flexible'}</td>
                  <td>
                    <span className="status-badge" style={statusStyle(r.status)}>{r.status || 'Status unavailable'}</span>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {statusDescription(r.status)}
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

function statusStyle(status) {
  if (['Completed', 'Complete'].includes(status)) return { background: '#dcfce7', color: '#15803d' };
  if (['Cancelled', 'Canceled', 'Rejected'].includes(status)) return { background: '#fee2e2', color: '#b91c1c' };
  if (['Booked', 'Confirmed', 'Assigned'].includes(status)) return { background: '#ede9fe', color: '#6d28d9' };
  return { background: '#dbeafe', color: '#1d4ed8' };
}

function statusDescription(status) {
  const descriptions = {
    Searching: 'Request submitted and searching for a technician.',
    Assigned: 'A technician has been assigned.',
    Booked: 'Your service appointment is confirmed.',
    Confirmed: 'Your service appointment is confirmed.',
    Completed: 'Service completed.',
    Complete: 'Service completed.'
  };
  return descriptions[status] || 'Current status from your service request.';
}
