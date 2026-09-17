import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  WashingMachine, Wrench, MapPin, CalendarClock, Search, 
  CheckCircle, ArrowLeft, Star, User
} from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Badge from '../../components/Badge';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  sendServiceRequestToAgent1,
  sendBookingConfirmationToAgent1,
  buildBookingConfirmationPayload,
} from '../../services/agent1Service';
import './Dashboard.css';

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
    category: '',
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
    async function getAppliances() {
      if (!customer?.customer_code) {
        setAppliances([]);
        setAppliancesLoading(false);
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('appliances')
          .select('appliance_id, brand, appliance_type')
          .eq('customer_id', customer.customer_code);

        if (fetchError) throw fetchError;
        setAppliances(data || []);
      } catch (fetchError) {
        setError(fetchError.message || 'Unable to load your appliances.');
      } finally {
        setAppliancesLoading(false);
      }
    }
    getAppliances();
  }, [customer]);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleConfirmBooking = async () => {
    if (!selectedTechnician || !requestSnapshot?.requestId) {
      setBookingError('Please select a technician before confirming the booking.');
      return;
    }
    setBookingSubmitting(true);
    setBookingError(null);
    setBookingResult(null);

    try {
      const payload = buildBookingConfirmationPayload({
        requestId: requestSnapshot.requestId,
        customerId: requestSnapshot.customerId,
        technicianId: selectedTechnician.technician_id,
        applianceId: requestSnapshot.appliance_id ?? null,
        category: requestSnapshot.category,
        area: requestSnapshot.area,
        preferredDate: requestSnapshot.preferredDate,
        preferredStart: requestSnapshot.preferredStart,
        preferredEnd: requestSnapshot.preferredEnd,
      });

      const response = await sendBookingConfirmationToAgent1(payload);

      if (response?.success === true) {
        setBookingResult({
          bookingId: response.bookingId || response.booking_id || 'N/A',
          requestId: response.requestId || response.request_id || requestSnapshot.requestId,
          technicianName: response.technicianName || selectedTechnician?.name || 'Technician',
          date: response.preferredDate || requestSnapshot.preferredDate,
          time: response.preferredStart && response.preferredEnd
            ? `${response.preferredStart} - ${response.preferredEnd}`
            : `${requestSnapshot.preferredStart} - ${requestSnapshot.preferredEnd}`,
          area: response.area || requestSnapshot.area,
        });
        setShortlist([]);
        setSelectedTechnicianId('');
        setSelectedTechnician(null);
        setError(null);
        setRequestSnapshot(null);
      } else {
        setBookingError(response?.message || 'Unable to contact the booking system. Please try again.');
      }
    } catch (err) {
      setBookingError(err.message || 'Unable to contact the booking system. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customerId = customer?.customer_code;
    const customerName = profile?.full_name?.trim();
    if (!customerId) return setError('Your customer account could not be loaded. Please complete your account setup.');
    if (!customerName) return setError('Customer name is required.');
    if (!form.category.trim()) return setError('Category is required.');
    if (!form.area.trim()) return setError('Area is required.');
    if (!form.preferred_date) return setError('Preferred date is required.');
    if (!form.preferred_start) return setError('Preferred start time is required.');
    if (!form.preferred_end) return setError('Preferred end time is required.');
    if (form.preferred_start >= form.preferred_end) return setError('Preferred start time must be earlier than the preferred end time.');
    if (form.appliance_id && !appliances.some((a) => a.appliance_id === form.appliance_id)) return setError('Please select an appliance from your account.');

    setLoading(true);
    setError(null);
    setShortlist([]);
    setSelectedTechnicianId('');
    setSelectedTechnician(null);
    setBookingResult(null);
    setBookingError(null);

    try {
      const { data: createdRequest, error: requestError } = await supabase
        .from('service_requests')
        .insert({
          customer_id: customerId,
          customer_name: customerName,
          phone: profile?.phone || null,
          email: profile?.email || null,
          category: form.category.trim(),
          appliance_id: form.appliance_id || null,
          address: form.address.trim() || customer?.address || null,
          area: form.area.trim(),
          preferred_date: form.preferred_date,
          preferred_start: form.preferred_start,
          preferred_end: form.preferred_end,
          status: 'Searching',
        })
        .select('request_id, customer_id, customer_name, category, area, preferred_date, preferred_start, preferred_end, appliance_id')
        .single();

      if (requestError) throw requestError;

      const snapshot = {
        requestId: createdRequest.request_id,
        customerId: createdRequest.customer_id,
        category: createdRequest.category,
        area: createdRequest.area,
        preferredDate: createdRequest.preferred_date,
        preferredStart: createdRequest.preferred_start,
        preferredEnd: createdRequest.preferred_end,
        appliance_id: createdRequest.appliance_id || null,
      };

      setRequestSnapshot(snapshot);

      const response = await sendServiceRequestToAgent1({
        customerId,
        customerName,
        phone: profile?.phone || '',
        email: profile?.email || '',
        category: form.category.trim(),
        applianceId: form.appliance_id || null,
        address: form.address.trim() || customer?.address || '',
        area: form.area.trim(),
        preferredDate: form.preferred_date,
        preferredStart: form.preferred_start,
        preferredEnd: form.preferred_end,
      });

      const technicians = Array.isArray(response?.technicians) ? response.technicians : [];

      if (response?.success === true && technicians.length > 0) {
        setShortlist(technicians);
        setError(null);
      } else if (response?.success === true && technicians.length === 0) {
        setError('No matching technicians are currently available.');
      } else {
        setError(response?.message || response?.error || 'Unable to contact the service matching system.');
      }
    } catch (err) {
      setError(err.message || 'Unable to contact the service matching system.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-title">Request Service</h1>
      </div>

      <div className="flex-col gap-6" style={{ maxWidth: '800px' }}>
        
        {/* Step 1: Request Form */}
        {!shortlist.length && !bookingResult && (
          <Card padding="lg">
            {error && <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} className="flex-col gap-6">
              
              <div className="form-section">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-navy)' }}><WashingMachine size={20} /> 1. Appliance & Service</h3>
                <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Appliance (Optional)</label>
                    <select
                      value={form.appliance_id}
                      onChange={handleChange('appliance_id')}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', width: '100%', fontFamily: 'inherit' }}
                      disabled={appliancesLoading}
                    >
                      <option value="">-- Select your appliance --</option>
                      {appliances.map((app) => (
                        <option key={app.appliance_id} value={app.appliance_id}>
                          {app.brand} {app.appliance_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <Input label="Service Category *" id="category" value={form.category} onChange={handleChange('category')} required placeholder="e.g. AC Repair" />
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
                            <span className="text-muted">• {technician.area || 'N/A'}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>
                          <strong>₹{technician.hourly_rate ?? 'N/A'}</strong> / hour
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
                  <p><strong>Rate:</strong> ₹{selectedTechnician.hourly_rate}/hour</p>
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
