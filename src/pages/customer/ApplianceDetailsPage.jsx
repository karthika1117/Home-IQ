import React, { useState, useEffect } from 'react';
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
          .eq('customer_id', customer.customer_id)
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
                  {h.amount && <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 'bold' }}>Cost: ${h.amount}</p>}
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
