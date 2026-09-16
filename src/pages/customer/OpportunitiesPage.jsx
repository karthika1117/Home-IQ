import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function OpportunitiesPage() {
  const { customer } = useCustomer();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('opportunities')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });
        if (data) setOpportunities(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Opportunities & Recommendations</h1>
      {loading ? <p>Loading opportunities...</p> : opportunities.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No open opportunities or recommendations at this time.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {opportunities.map(o => (
            <Card key={o.opportunity_id} padding="md" style={{ borderLeft: o.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.0625rem' }}>{o.title}</h3>
                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{o.status}</span>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{o.description}</p>
              {o.suggested_action && <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Suggested Action:</strong> {o.suggested_action}</p>}
              {o.estimated_revenue && <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#15803d', fontWeight: 'bold' }}>Est. Cost: ${o.estimated_revenue}</p>}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
