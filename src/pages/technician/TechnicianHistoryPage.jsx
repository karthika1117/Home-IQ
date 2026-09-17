import React, { useState, useEffect } from 'react';
import { ClipboardList, Calendar, WashingMachine, MessageSquare, AlertTriangle, Receipt } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';

export default function TechnicianHistoryPage() {
  const { technician } = useTechnician();
  const [history, setHistory] = useState([]);
  const [appliances, setAppliances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!technician?.technician_id) return;
      try {
        const { data } = await supabase
          .from('service_history')
          .select('*')
          .eq('technician_id', technician.technician_id)
          .order('service_date', { ascending: false });
        if (data) {
          setHistory(data);
          const applianceIds = [...new Set(data.map(item => item.appliance_id).filter(Boolean))];
          if (applianceIds.length > 0) {
            const { data: applianceData } = await supabase
              .from('appliances')
              .select('appliance_id, appliance_type, brand, model')
              .in('appliance_id', applianceIds);
            setAppliances(Object.fromEntries((applianceData || []).map(appliance => [appliance.appliance_id, appliance])));
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [technician]);

  const formatAppliance = (appliance, applianceId) => {
    if (appliance) return [appliance.brand, appliance.model, appliance.appliance_type].filter(Boolean).join(' ') || 'Appliance';
    return applianceId || 'N/A';
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-title">Service History</h1>
      </div>

      {loading ? <LoadingState message="Loading your service history..." fullHeight={true} /> : history.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title="No history yet"
          description="Your completed service jobs will appear here."
        />
      ) : (
        <div className="flex-col gap-4">
          {history.map(h => (
            <Card key={h.history_id} padding="lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-title flex items-center gap-2" style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>
                    {h.service_category || 'Service Call'}
                  </h3>
                  <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.9375rem' }}>
                    <Calendar size={16} />
                    {h.service_date ? new Date(h.service_date).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
                {h.amount && (
                  <div className="flex items-center gap-1" style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--color-navy)' }}>
                    <Receipt size={18} /> ₹{h.amount}
                  </div>
                )}
              </div>
              
              <div className="flex-col gap-3" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex items-start gap-2">
                  <WashingMachine size={16} className="text-muted" style={{ marginTop: '2px' }} />
                  <span style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>
                    <strong className="text-muted">Appliance:</strong> {formatAppliance(appliances[h.appliance_id], h.appliance_id)}
                  </span>
                </div>
                
                {h.issues_found && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-muted" style={{ marginTop: '2px' }} />
                    <span style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>
                      <strong className="text-muted">Issues:</strong> {h.issues_found}
                    </span>
                  </div>
                )}
                
                {h.technician_notes && (
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-muted" style={{ marginTop: '2px' }} />
                    <span style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>
                      <strong className="text-muted">Notes:</strong> {h.technician_notes}
                    </span>
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
