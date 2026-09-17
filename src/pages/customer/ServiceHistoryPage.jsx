import React, { useState, useEffect } from 'react';
import { History, Receipt, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

export default function ServiceHistoryPage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [appliances, setAppliances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!customer?.customer_code) return;
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
    <PageContainer>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-title">Service History</h1>
      </div>

      {loading ? <LoadingState message="Loading history..." fullHeight={true} /> : history.length === 0 ? (
        <EmptyState 
          icon={History}
          title="No service history" 
          description="You haven't had any completed services yet."
        />
      ) : (
        <div className="flex-col gap-4">
          {history.map(h => (
            <Card key={h.history_id} padding="lg">
              <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                <div className="flex gap-4">
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck size={24} color="var(--color-text-muted)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-navy)', margin: '0 0 4px' }}>
                      {h.service_category || 'Service Call'}
                    </h3>
                    <p className="text-muted" style={{ marginBottom: '12px' }}>
                      {new Date(h.service_date).toLocaleDateString()} • {formatAppliance(appliances[h.appliance_id], h.appliance_id)}
                    </p>
                    {h.issues_found && (
                      <p style={{ fontSize: '0.9375rem', color: 'var(--color-navy-light)', marginBottom: '4px' }}>
                        <strong>Issues found:</strong> {h.issues_found}
                      </p>
                    )}
                    {h.technician_notes && (
                      <p style={{ fontSize: '0.9375rem', color: 'var(--color-navy-light)' }}>
                        <strong>Technician notes:</strong> {h.technician_notes}
                      </p>
                    )}
                  </div>
                </div>
                {h.amount != null && (
                  <div className="flex items-center gap-2" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <Receipt size={16} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>₹{h.amount}</span>
                  </div>
                )}
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
  return applianceId || 'General Service';
}
