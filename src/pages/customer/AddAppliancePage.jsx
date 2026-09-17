import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft } from 'lucide-react';
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
    if (!form.appliance_type.trim()) return setError("Appliance Type is required.");
    if (!user || profile?.role !== 'customer') return setError('Please log in as a customer to add an appliance.');
    if (!customer?.customer_code) return setError('Your customer account is missing a customer code. Please contact support.');

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
    <PageContainer>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-title">Add New Appliance</h1>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <Card padding="lg">
          {error && <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
          
          <form className="flex-col gap-6" onSubmit={handleSubmit}>
            <div className="form-section">
              <Input label="Appliance Type *" id="appliance_type" value={form.appliance_type} onChange={handleChange('appliance_type')} required placeholder="e.g. Refrigerator, HVAC" />
              <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px' }}>
                <Input label="Brand" id="brand" value={form.brand} onChange={handleChange('brand')} placeholder="e.g. Samsung" />
                <Input label="Model" id="model" value={form.model} onChange={handleChange('model')} placeholder="e.g. RF28R7351SG" />
              </div>
            </div>

            <div className="form-section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '16px' }}>
                <Input label="Installation Date" id="installation_date" type="date" value={form.installation_date} onChange={handleChange('installation_date')} />
                <Input label="Last Service Date" id="last_service_date" type="date" value={form.last_service_date} onChange={handleChange('last_service_date')} />
              </div>
              <div className="field">
                <label htmlFor="notes" className="input__label">Technician Notes</label>
                <textarea id="notes" className="input__field" style={{ minHeight: '100px', resize: 'vertical' }} value={form.technician_notes} onChange={handleChange('technician_notes')} />
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => navigate('/customer/appliances')} type="button" disabled={loading}>Cancel</Button>
              <Button type="submit" loading={loading}><PlusCircle size={16} /> Save Appliance</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
