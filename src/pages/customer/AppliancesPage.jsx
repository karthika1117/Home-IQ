import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useCustomer } from '../../context/CustomerContext';
import { supabase } from '../../lib/supabaseClient';

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

  return (
    <PageContainer className="dashboard-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="dashboard-welcome__title">My Appliances</h1>
        <Button onClick={() => navigate('/customer/appliances/new')}>+ Add Appliance</Button>
      </div>

      {error && <div className="auth-message auth-message--error">{error}</div>}

      {loading ? (
        <p>Loading appliances...</p>
      ) : appliances.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No appliances added yet. Add your first appliance to keep track of its health and service history.</p>
          <Button variant="secondary" onClick={() => navigate('/customer/appliances/new')}>Add Appliance</Button>
        </Card>
      ) : (
        <div className="item-grid">
          {appliances.map(a => (
            <Card key={a.appliance_id} padding="md" className="item-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/customer/appliances/${a.appliance_id}`)}>
              <div className="item-card__info">
                <h3 className="item-card__name" style={{ marginBottom: '0.5rem' }}>{a.brand} {a.appliance_type}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Model: {a.model || 'Unknown'}</p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Status: <span style={{ fontWeight: 'bold' }}>{a.health_status}</span> ({a.health_score}/100)</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
