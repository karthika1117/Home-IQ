import LoadingState from '../../components/LoadingState';
import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function ServiceHistoryPage() {
  const { customer } = useCustomer();
  const [history, setHistory] = useState([]);
  const [appliances, setAppliances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('service_history')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('service_date', { ascending: false });
        if (error) throw error;
        setHistory(data || []);
        const applianceIds = [...new Set((data || []).map(item => item.appliance_id).filter(Boolean))];
        if (applianceIds.length > 0) {
          const { data: applianceData } = await supabase
            .from('appliances')
            .select('appliance_id, appliance_type, brand, model')
            .eq('customer_id', customer.customer_code)
            .in('appliance_id', applianceIds);
          setAppliances(Object.fromEntries((applianceData || []).map(appliance => [appliance.appliance_id, appliance])));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer]);

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>Service History</h1>
      {loading ? <LoadingState message="Loading..." fullHeight={true} /> : history.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No service history found.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map(h => (
            <Card key={h.history_id} padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem' }}>{h.service_category || 'Service Call'}</h3>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Date: {h.service_date}</p>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}><strong>Appliance:</strong> {formatAppliance(appliances[h.appliance_id], h.appliance_id)}</p>
                  {h.issues_found && <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem' }}><strong>Issues:</strong> {h.issues_found}</p>}
                  {h.technician_notes && <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Notes:</strong> {h.technician_notes}</p>}
                </div>
                {h.amount && <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>${h.amount}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function formatAppliance(appliance, applianceId) {
  if (appliance) return [appliance.brand, appliance.model, appliance.appliance_type].filter(Boolean).join(' ') || 'Appliance';
  return applianceId || 'N/A';
}
