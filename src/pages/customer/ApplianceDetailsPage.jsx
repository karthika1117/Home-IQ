import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, WashingMachine, Calendar, Activity, PenTool, AlertCircle } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import LoadingState from '../../components/LoadingState';
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
          .eq('customer_id', customer.customer_code)
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

  if (loading) return <PageContainer><LoadingState message="Loading..." fullHeight={true} /></PageContainer>;
  if (error) return (
    <PageContainer>
      <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>
      <Button variant="secondary" onClick={() => navigate('/customer/appliances')}>Back to Appliances</Button>
    </PageContainer>
  );

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/customer/appliances')}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-title">{appliance.brand} {appliance.appliance_type}</h1>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Basic Information */}
        <Card padding="lg">
          <h2 className="flex items-center gap-2 text-title" style={{ fontSize: '1.125rem', marginBottom: '16px' }}><WashingMachine size={20} /> Basic Information</h2>
          <div className="flex-col gap-4">
            <div className="flex justify-between" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted">Model</span>
              <span style={{ fontWeight: 500, color: 'var(--color-navy)' }}>{appliance.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted flex items-center gap-2"><Activity size={16} /> Health</span>
              <span className="flex items-center gap-2">
                <strong>{appliance.health_score}/100</strong>
                <Badge variant={appliance.health_status === 'Good' ? 'success' : appliance.health_status === 'Critical' ? 'danger' : 'warning'}>
                  {appliance.health_status}
                </Badge>
              </span>
            </div>
            <div className="flex justify-between" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted flex items-center gap-2"><Calendar size={16} /> Installation</span>
              <span style={{ fontWeight: 500, color: 'var(--color-navy)' }}>{appliance.installation_date || 'N/A'}</span>
            </div>
            <div className="flex justify-between" style={{ paddingBottom: '12px' }}>
              <span className="text-muted flex items-center gap-2"><PenTool size={16} /> Last Service</span>
              <span style={{ fontWeight: 500, color: 'var(--color-navy)' }}>{appliance.last_service_date || 'N/A'}</span>
            </div>
            {appliance.technician_notes && (
              <div style={{ marginTop: '8px', backgroundColor: 'var(--color-surface-hover)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-muted" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>Technician Notes</span>
                <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-navy)', whiteSpace: 'pre-wrap' }}>{appliance.technician_notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service History */}
        <div>
          <h2 className="text-title" style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Service History</h2>
          {history.length === 0 ? (
            <Card padding="md"><p className="text-muted" style={{ margin: 0 }}>No service history recorded.</p></Card>
          ) : (
            <div className="flex-col gap-4">
              {history.map(h => (
                <Card key={h.history_id} padding="md">
                  <h4 style={{ margin: '0 0 8px', fontSize: '1rem', color: 'var(--color-navy)' }}>{new Date(h.service_date).toLocaleDateString()} - {h.service_category}</h4>
                  {h.issues_found && <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: 'var(--color-navy-light)' }}><strong>Issues:</strong> {h.issues_found}</p>}
                  {h.technician_notes && <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: 'var(--color-navy-light)' }}><strong>Notes:</strong> {h.technician_notes}</p>}
                  {h.amount && <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-primary-dark)' }}>Cost: ₹{h.amount}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Opportunities */}
        <div>
          <h2 className="text-title" style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Opportunities</h2>
          {opportunities.length === 0 ? (
            <Card padding="md"><p className="text-muted" style={{ margin: 0 }}>No open opportunities.</p></Card>
          ) : (
            <div className="flex-col gap-4">
              {opportunities.map(o => (
                <Card key={o.opportunity_id} padding="md" style={{ borderLeft: o.priority === 'High' ? '4px solid var(--color-danger)' : '4px solid var(--color-info)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1rem', color: 'var(--color-navy)' }}>
                      {o.priority === 'High' && <AlertCircle size={16} color="var(--color-danger)" />}
                      {o.title}
                    </h4>
                    <Badge variant="neutral">{o.status}</Badge>
                  </div>
                  <p className="text-muted" style={{ margin: '0 0 8px', fontSize: '0.875rem' }}>{o.description}</p>
                  {o.suggested_action && <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-navy-light)' }}><strong>Action:</strong> {o.suggested_action}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
