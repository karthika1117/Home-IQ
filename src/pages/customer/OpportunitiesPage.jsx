import React, { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function OpportunitiesPage() {
  const { customer } = useCustomer();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!customer?.customer_code) return;
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
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-title">Opportunities & Recommendations</h1>
      </div>

      {loading ? <LoadingState message="Loading opportunities..." fullHeight={true} /> : opportunities.length === 0 ? (
        <EmptyState 
          icon={Lightbulb}
          title="No recommendations"
          description="Your appliances are in great shape. Check back later for maintenance tips!"
        />
      ) : (
        <div className="grid-cards">
          {opportunities.map(o => (
            <Card key={o.opportunity_id} padding="lg" style={{ borderLeft: o.priority === 'High' ? '4px solid var(--color-danger)' : '4px solid var(--color-info)' }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1.125rem', color: 'var(--color-navy)' }}>
                  {o.priority === 'High' ? <AlertCircle size={18} color="var(--color-danger)" /> : <Lightbulb size={18} color="var(--color-info)" />}
                  {o.title}
                </h3>
                <Badge variant={o.status === 'Open' ? 'warning' : 'neutral'}>{o.status}</Badge>
              </div>
              <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '0.9375rem' }}>{o.description}</p>
              
              <div className="flex-col gap-2" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                {o.suggested_action && <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-navy-light)' }}><strong>Suggested Action:</strong> {o.suggested_action}</p>}
                {o.estimated_revenue && (
                  <p className="flex items-center gap-1" style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                    <TrendingUp size={16} /> Est. Cost: ₹{o.estimated_revenue}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
