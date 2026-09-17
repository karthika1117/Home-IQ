import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  WashingMachine, MapPin, CalendarClock, Search, 
  CheckCircle, ArrowLeft, Star, User
} from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { sendServiceRequestToAgent1, sendBookingConfirmationToAgent1 } from '../../services/agent1Service';

export default function CreateServiceRequestPage() {
  const { customer } = useCustomer();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shortlist, setShortlist] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [requestSnapshot, setRequestSnapshot] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [appliancesLoading, setAppliancesLoading] = useState(true);

  const [form, setForm] = useState({
    issueDescription: '',
    appliance_id: '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: customer?.address || '',
    area: customer?.city || '',
    preferred_date: '',
    preferred_start: '',
    preferred_end: ''
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      address: customer?.address || '',
      area: customer?.city || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
    }));
  }, [customer, profile]);

  useEffect(() => {
    async function loadAppliances() {
      if (!customer?.customer_code) return;
      try {
        const { data } = await supabase.from('appliances').select('*').eq('customer_id', customer.customer_code);
        setAppliances(data || []);
      } finally {
        setAppliancesLoading(false);
      }
    }
    loadAppliances();
  }, [customer]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.issueDescription.trim()) {
      setError('Please provide a description of the issue.');
      return;
    }
    setLoading(true);
    setError(null);

    const requestPayload = {
      customerId: customer?.customer_code,
      customerName: profile?.full_name,
      phone: form.phone,
      email: form.email,
      issueDescription: form.issueDescription,
      applianceId: form.appliance_id || null,
      address: form.address,
      area: form.area,
      preferredDate: form.preferred_date,
      preferredStart: form.preferred_start,
      preferredEnd: form.preferred_end
    };

    try {
      const matchResult = await sendServiceRequestToAgent1(requestPayload);
      
      if (matchResult && matchResult.success) {
        setShortlist(matchResult.technicians || []);
        setRequestSnapshot(requestPayload);
      } else {
        setError(matchResult?.message || 'Failed to find matching technicians. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const result = await sendBookingConfirmationToAgent1({
        requestId: `TEMP-${Date.now()}`,
        customerId: requestSnapshot.customerId,
        technicianId: selectedTechnician.technician_id,
        applianceId: requestSnapshot.applianceId,
        category: 'TBD', // The backend AI matched category will be handled downstream or can just be TBD
        area: requestSnapshot.area,
        preferredDate: requestSnapshot.preferredDate,
        preferredStart: requestSnapshot.preferredStart,
        preferredEnd: requestSnapshot.preferredEnd
      });

      if (result && result.success) {
        setBookingResult({
          bookingId: result.bookingId,
          technicianName: selectedTechnician.name,
          date: new Date(requestSnapshot.preferredDate).toLocaleDateString(),
          time: `${requestSnapshot.preferredStart} - ${requestSnapshot.preferredEnd}`
        });
      } else {
        setBookingError(result?.message || 'Failed to confirm booking.');
      }
    } catch (err) {
      setBookingError(err.message || 'Error communicating with booking service.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-title">Request Service</h1>
      </div>

      <div className="flex-col gap-6" style={{ maxWidth: '800px' }}>
        
        {/* Step 1: Request Form */}
        {shortlist.length === 0 && !bookingResult && (
          <Card padding="lg">
            {error && (
              <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex-col gap-6">
              
              <div className="form-section">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-navy)' }}><WashingMachine size={20} /> 1. Appliance & Issue</h3>
                <div className="flex-col gap-4">
                  <div className="input-group">
                    <label className="input-label" htmlFor="appliance_id">Appliance (Optional)</label>
                    <select
                      id="appliance_id"
                      className="input-field"
                      value={form.appliance_id}
                      onChange={handleChange('appliance_id')}
                      disabled={appliancesLoading}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%', fontFamily: 'inherit' }}
                    >
                      <option value="">-- Select your appliance --</option>
                      {appliances.map(app => (
                        <option key={app.appliance_id} value={app.appliance_id}>
                          {app.brand} {app.appliance_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label className="input-label" htmlFor="issueDescription" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Issue Description *</label>
                    <textarea 
                      id="issueDescription" 
                      className="input-field" 
                      style={{ minHeight: '100px', resize: 'vertical', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%', fontFamily: 'inherit' }}
                      value={form.issueDescription} 
                      onChange={handleChange('issueDescription')} 
                      required 
                      placeholder="E.g., My refrigerator is leaking water onto the kitchen floor from underneath the freezer compartment."
                    />
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-navy)' }}><MapPin size={20} /> 2. Location</h3>
                <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <Input label="Address" id="address" value={form.address} onChange={handleChange('address')} />
                  <Input label="Area / City *" id="area" value={form.area} onChange={handleChange('area')} required />
                </div>
              </div>

              <div className="form-section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-navy)' }}><CalendarClock size={20} /> 3. Preferred Date & Time</h3>
                <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  <Input label="Date *" id="preferred_date" type="date" value={form.preferred_date} onChange={handleChange('preferred_date')} required />
                  <Input label="Start Time *" id="preferred_start" type="time" value={form.preferred_start} onChange={handleChange('preferred_start')} required />
                  <Input label="End Time *" id="preferred_end" type="time" value={form.preferred_end} onChange={handleChange('preferred_end')} required />
                </div>
              </div>

              <div className="flex justify-between" style={{ marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => navigate('/customer/requests')} type="button" disabled={loading}>Cancel</Button>
                <Button type="submit" loading={loading} disabled={loading}>
                  <Search size={16} /> {loading ? 'Finding Technicians...' : 'Find Technicians'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 2: Technician Selection */}
        {shortlist.length > 0 && !bookingResult && (
          <div className="flex-col gap-4">
            <h2 className="text-title" style={{ fontSize: '1.5rem' }}>Select a Technician</h2>
            {shortlist.map((technician) => {
              const techId = technician.technician_id || technician.email || technician.name;
              const selected = techId === selectedTechnicianId;
              
              return (
                <Card key={techId} padding="md" style={{ border: selected ? '2px solid var(--color-primary)' : undefined }}>
                  <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
                    <div className="flex gap-4">
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={32} color="var(--color-text-muted)" />
                      </div>
                      <div className="flex-col gap-2">
                        <div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-navy)', margin: 0 }}>{technician.name}</h3>
                          <div className="flex gap-2 items-center" style={{ marginTop: '4px' }}>
                            <Badge variant={technician.verification ? 'success' : 'info'}>{technician.match_status || 'Recommended'}</Badge>
                            <span className="flex items-center gap-1 text-muted"><Star size={14} color="var(--color-warning)" fill="var(--color-warning)" /> {technician.rating ?? 'New'}</span>
                            <span className="text-muted">? {technician.area || 'N/A'}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>
                          <strong>,1{technician.hourly_rate ?? 'N/A'}</strong> / hour
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant={selected ? 'secondary' : 'primary'}
                      onClick={() => {
                        setSelectedTechnicianId(techId);
                        setSelectedTechnician({
                          technician_id: technician.technician_id || techId,
                          name: technician.name,
                          hourly_rate: technician.hourly_rate ?? null,
                          area: technician.area || '',
                        });
                      }}
                    >
                      {selected ? 'Selected' : 'Select Technician'}
                    </Button>
                  </div>
                </Card>
              );
            })}

            {/* Step 3: Confirmation Box */}
            {selectedTechnician && (
              <Card padding="md" style={{ backgroundColor: 'var(--color-bg)', marginTop: '1rem', border: '1px solid var(--color-border-focus)' }}>
                <h3 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Confirm Your Booking</h3>
                <div className="flex-col gap-2" style={{ marginBottom: '24px' }}>
                  <p><strong>Technician:</strong> {selectedTechnician.name}</p>
                  <p><strong>Rate:</strong> ,1{selectedTechnician.hourly_rate}/hour</p>
                  <p><strong>Schedule:</strong> {requestSnapshot?.preferredDate} ({requestSnapshot?.preferredStart} - {requestSnapshot?.preferredEnd})</p>
                </div>
                {bookingError && <div style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>{bookingError}</div>}
                <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => { setSelectedTechnician(null); setSelectedTechnicianId(''); }} disabled={bookingSubmitting}>Change Technician</Button>
                  <Button variant="primary" loading={bookingSubmitting} onClick={handleConfirmBooking}>Confirm Booking</Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Success State */}
        {bookingResult && (
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle size={64} color="var(--color-success)" />
            </div>
            <h2 className="text-title mb-4">Booking Confirmed!</h2>
            <p className="text-subtitle" style={{ marginBottom: '24px' }}>
              Your service appointment with <strong>{bookingResult.technicianName}</strong> has been scheduled.
            </p>
            <div className="flex-col gap-2" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'inline-flex', textAlign: 'left', margin: '0 auto 24px' }}>
              <div><strong>Booking ID:</strong> {bookingResult.bookingId}</div>
              <div><strong>Date:</strong> {bookingResult.date}</div>
              <div><strong>Time:</strong> {bookingResult.time}</div>
            </div>
            <div>
              <Button onClick={() => navigate('/customer/bookings')}>View My Bookings</Button>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
