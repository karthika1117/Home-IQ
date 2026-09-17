import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WashingMachine, Plus, ArrowRight } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

export default function AppliancesPage() {
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAppliances() {
      try {
        const { data, error } = await supabase
          .from('appliances')
          .select('*')
          .eq('customer_id', customer.customer_code)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAppliances(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAppliances();
  }, [customer]);

  const getHealthVariant = (status) => {
    if (status === 'Good') return 'success';
    if (status === 'Fair') return 'warning';
    if (status === 'Critical') return 'danger';
    return 'neutral';
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-title">My Appliances</h1>
        <Button onClick={() => navigate('/customer/appliances/new')}><Plus size={16} /> Add Appliance</Button>
      </div>

      {error && <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {loading ? (
        <LoadingState message="Loading your appliances..." fullHeight />
      ) : appliances.length === 0 ? (
        <EmptyState 
          icon={WashingMachine}
          title="No appliances yet"
          description="Add your first appliance to keep track of its health and service history."
          action={<Button variant="primary" onClick={() => navigate('/customer/appliances/new')}>Add Appliance</Button>}
        />
      ) : (
        <div className="grid-cards">
          {appliances.map(a => (
            <Card key={a.appliance_id} padding="lg" className="appliance-mini-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/customer/appliances/${a.appliance_id}`)}>
              <div className="appliance-mini-card__header">
                <div className="appliance-icon"><WashingMachine size={24} /></div>
                <Badge variant={getHealthVariant(a.health_status)}>{a.health_status}</Badge>
              </div>
              <div>
                <h3 className="appliance-mini-card__title" style={{ fontSize: '1.125rem' }}>{a.brand} {a.appliance_type}</h3>
                <p className="text-muted" style={{ fontSize: '0.9375rem', marginTop: '4px' }}>Model: {a.model || 'Unknown'}</p>
                <p className="text-muted" style={{ fontSize: '0.9375rem' }}>Health Score: <strong>{a.health_score}/100</strong></p>
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm">
                  View Details <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
