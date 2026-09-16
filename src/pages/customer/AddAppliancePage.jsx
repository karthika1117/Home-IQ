import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function AddAppliancePage() {
  const { customer } = useCustomer();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    appliance_type: '',
    brand: '',
    model: '',
    installation_date: '',
    last_service_date: '',
    technician_notes: ''
  });

  const handleChange = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.appliance_type.trim()) {
      setError("Appliance Type is required.");
      return;
    }
    if (!user || profile?.role !== 'customer') {
      setError('Please log in as a customer to add an appliance.');
      return;
    }
    if (!customer?.customer_code) {
      setError('Your customer account is missing a customer code. Please contact support.');
      return;
    }

    if (import.meta.env.DEV) {
      console.log('AUTH USER ID:', user.id);
      console.log('CUSTOMER PROFILE ID:', customer.profile_id || null);
      console.log('CUSTOMER CODE EXISTS:', Boolean(customer.customer_code));
      console.log('APPLIANCE INSERT CUSTOMER ID:', customer.customer_code);
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from('appliances').insert({
        customer_id: customer.customer_code,
        appliance_type: form.appliance_type,
        brand: form.brand || null,
        model: form.model || null,
        installation_date: form.installation_date || null,
        last_service_date: form.last_service_date || null,
        technician_notes: form.technician_notes || null
      });

      if (insertErr) throw insertErr;
      navigate('/customer/appliances');
    } catch (err) {
      const isRlsError = err.code === '42501' || err.message?.toLowerCase().includes('row-level security');
      setError(isRlsError
        ? 'Unable to add this appliance. Your customer account could not be verified.'
        : 'Unable to add this appliance. Please try again.');
      setLoading(false);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Add New Appliance</h1>
        <Card padding="lg">
          {error && <div className="auth-message auth-message--error" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <Input label="Appliance Type *" id="appliance_type" value={form.appliance_type} onChange={handleChange('appliance_type')} required placeholder="e.g. Refrigerator, HVAC" />
            <div className="form-row">
              <Input label="Brand" id="brand" value={form.brand} onChange={handleChange('brand')} placeholder="e.g. Samsung" />
              <Input label="Model" id="model" value={form.model} onChange={handleChange('model')} placeholder="e.g. RF28R7351SG" />
            </div>
            <div className="form-row">
              <Input label="Installation Date" id="installation_date" type="date" value={form.installation_date} onChange={handleChange('installation_date')} />
              <Input label="Last Service Date" id="last_service_date" type="date" value={form.last_service_date} onChange={handleChange('last_service_date')} />
            </div>
            <div className="field">
              <label htmlFor="notes" className="field__label">Technician Notes</label>
              <textarea id="notes" className="field__input" style={{ minHeight: '100px', resize: 'vertical' }} value={form.technician_notes} onChange={handleChange('technician_notes')} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="submit" loading={loading}>Save Appliance</Button>
              <Button variant="ghost" onClick={() => navigate('/customer/appliances')} type="button" disabled={loading}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
