import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useCustomer } from '../../context/CustomerContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  sendServiceRequestToAgent1,
  sendBookingConfirmationToAgent1,
  buildBookingConfirmationPayload,
} from '../../services/agent1Service';

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
        // Clear all intermediate state — only the confirmation banner should remain
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
    if (!customerId) {
      setError('Your customer account could not be loaded. Please complete your account setup.');
      return;
    }
    if (!customerName) {
      setError('Customer name is required.');
      return;
    }

    if (!form.category.trim()) {
      setError('Category is required.');
      return;
    }
    if (!form.area.trim()) {
      setError('Area is required.');
      return;
    }
    if (!form.preferred_date) {
      setError('Preferred date is required.');
      return;
    }
    if (!form.preferred_start) {
      setError('Preferred start time is required.');
      return;
    }
    if (!form.preferred_end) {
      setError('Preferred end time is required.');
      return;
    }
    if (form.preferred_start >= form.preferred_end) {
      setError('Preferred start time must be earlier than the preferred end time.');
      return;
    }
    if (form.appliance_id && !appliances.some((appliance) => appliance.appliance_id === form.appliance_id)) {
      setError('Please select an appliance from your account.');
      return;
    }

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
      } else if (response?.success === false || response?.status === 'error' || response?.error) {
        setError(response?.message || response?.error || 'Unable to contact the service matching system. Please try again.');
      } else if (!response || typeof response !== 'object') {
        setError('Unable to contact the service matching system. Please try again.');
      } else {
        setError(response?.message || 'Unable to contact the service matching system. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Unable to contact the service matching system. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer className="dashboard-content">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Request Service</h1>
        <Card padding="lg">
          {error && <div className="auth-message auth-message--error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <Input label="Service Category *" id="category" value={form.category} onChange={handleChange('category')} required placeholder="e.g. AC, Plumbing, Appliance Repair" />
              <div className="field">
                <label className="field__label">Related Appliance</label>
                <select className="field__input" value={form.appliance_id} onChange={handleChange('appliance_id')} disabled={appliancesLoading}>
                  <option value="">-- None --</option>
                  {appliances.map((a) => (
                    <option key={a.appliance_id} value={a.appliance_id}>{a.brand} {a.appliance_type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-divider"><span>Contact Information</span></div>
            <div className="form-row">
              <Input label="Phone" id="phone" type="tel" value={profile?.phone || ''} readOnly />
              <Input label="Email" id="email" type="email" value={profile?.email || ''} readOnly />
            </div>

            <div className="form-divider"><span>Location</span></div>
            <div className="form-row">
              <Input label="Address" id="address" value={form.address} onChange={handleChange('address')} />
              <Input label="Area / City *" id="area" value={form.area} onChange={handleChange('area')} required />
            </div>

            <div className="form-divider"><span>Preferences</span></div>
            <div className="form-row">
              <Input label="Preferred Date *" id="preferred_date" type="date" value={form.preferred_date} onChange={handleChange('preferred_date')} required />
              <Input label="Start Time *" id="preferred_start" type="time" value={form.preferred_start} onChange={handleChange('preferred_start')} required />
              <Input label="End Time *" id="preferred_end" type="time" value={form.preferred_end} onChange={handleChange('preferred_end')} required />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button type="submit" loading={loading} disabled={loading}>
                {loading ? 'Finding the best technicians...' : 'Submit Request'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/customer/requests')} type="button" disabled={loading}>Cancel</Button>
            </div>
          </form>

          {shortlist.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2 className="dashboard-welcome__title" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Recommended Technicians</h2>
              {shortlist.map((technician) => {
                const techId = technician.technician_id || technician.email || technician.name;
                const selected = techId === selectedTechnicianId;
                return (
                  <div key={techId} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.4rem' }}>{technician.name}</h3>
                        <div style={{ color: '#475569', fontSize: '0.95rem' }}>★ {technician.rating ?? 'N/A'}</div>
                        <div style={{ color: '#475569', fontSize: '0.95rem' }}>₹{technician.hourly_rate ?? 'N/A'}/hour</div>
                        <div style={{ color: '#475569', fontSize: '0.95rem' }}>{technician.area || 'N/A'}</div>
                        <div style={{ color: '#475569', fontSize: '0.95rem' }}>Match Score: {technician.match_score ?? 'N/A'}</div>
                        <div style={{ color: '#475569', fontSize: '0.95rem' }}>{technician.match_status || 'Pending'}</div>
                        {technician.availability && (
                          <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            {Object.entries(technician.availability).slice(0, 3).map(([day, slots]) => (
                              <div key={day}>{day}: {Array.isArray(slots) ? slots.join(', ') : 'N/A'}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant={selected ? 'secondary' : 'primary'}
                        onClick={() => {
                          setSelectedTechnicianId(techId);
                          setSelectedTechnician({
                            technician_id: technician.technician_id || techId,
                            name: technician.name,
                            service_categories: technician.service_categories || [],
                            area: technician.area || '',
                            hourly_rate: technician.hourly_rate ?? null,
                            rating: technician.rating ?? null,
                            availability: technician.availability || {},
                            match_score: technician.match_score ?? null,
                            match_status: technician.match_status || 'Recommended',
                          });
                          setBookingError(null);
                          setBookingResult(null);
                        }}
                      >
                        {selected ? 'Selected' : 'Select Technician'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTechnician && (
            <div style={{ marginTop: '2rem', border: '1px solid #dbeafe', borderRadius: '12px', background: '#f8fafc', padding: '1rem' }}>
              <h2 className="dashboard-welcome__title" style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>Selected Technician</h2>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{selectedTechnician.name}</div>
              <div style={{ color: '#475569', marginBottom: '0.35rem' }}>₹{selectedTechnician.hourly_rate ?? 'N/A'}/hour</div>
              <div style={{ color: '#475569' }}>{selectedTechnician.area || 'N/A'}</div>
              {requestSnapshot && (
                <div style={{ marginTop: '0.75rem', color: '#475569', fontSize: '0.85rem' }}>
                  Request: {requestSnapshot.customerId} • {requestSnapshot.category} • {requestSnapshot.area} • {requestSnapshot.preferredDate} {requestSnapshot.preferredStart}-{requestSnapshot.preferredEnd}
                </div>
              )}
              {bookingError && (
                <div className="auth-message auth-message--error" style={{ marginTop: '1rem' }}>{bookingError}</div>
              )}
              <div style={{ marginTop: '1rem' }}>
                <Button type="button" variant="primary" loading={bookingSubmitting} disabled={bookingSubmitting} onClick={handleConfirmBooking}>
                  Confirm Booking
                </Button>
              </div>
            </div>
          )}

          {bookingResult && (
            <div style={{ marginTop: '2rem', border: '1px solid #bbf7d0', borderRadius: '12px', background: '#f0fdf4', padding: '1rem' }}>
              <h2 className="dashboard-welcome__title" style={{ fontSize: '1.3rem', marginBottom: '0.75rem' }}>Booking Confirmed</h2>
              <div style={{ color: '#166534', fontWeight: 600, marginBottom: '0.5rem' }}>Booking ID: {bookingResult.bookingId}</div>
              <div style={{ color: '#166534', marginBottom: '0.35rem' }}>Technician: {bookingResult.technicianName}</div>
              <div style={{ color: '#166534', marginBottom: '0.35rem' }}>Date: {bookingResult.date}</div>
              <div style={{ color: '#166534', marginBottom: '0.35rem' }}>Time: {bookingResult.time}</div>
              <div style={{ color: '#166534', marginBottom: '0.35rem' }}>Area: {bookingResult.area}</div>
              <div style={{ marginTop: '1rem' }}>
                <Button variant="ghost" onClick={() => navigate('/customer/bookings')}>View My Bookings</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
