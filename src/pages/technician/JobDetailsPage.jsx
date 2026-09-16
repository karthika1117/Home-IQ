import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTechnician } from '../../context/TechnicianContext';
import { supabase } from '../../lib/supabaseClient';
import { calculateApplianceHealth, detectRevenueOpportunity } from '../../services/applianceHealthService';
import { createNotification } from '../../services/notificationService';

export default function JobDetailsPage() {
  const { bookingId } = useParams();
  const { technician } = useTechnician();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [appliance, setAppliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleCompleteJob = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Update booking status
      const { error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'Completed' })
        .eq('booking_id', job.booking_id);
      if (bErr) throw new Error(bErr.message);

      // 2. Insert Service History (if appliance exists)
      if (appliance) {
        const { error: shErr } = await supabase
          .from('service_history')
          .insert({
            appliance_id: appliance.appliance_id,
            customer_id: job.customer_id,
            technician_id: technician.technician_id,
            service_date: job.service_date,
            service_category: job.service_category,
            technician_notes: notes,
            issues_found: notes, // For simplicity
            amount: amount ? parseFloat(amount) : null
          });
        if (shErr) throw new Error(shErr.message);

        // 3. Agent 2: Calculate Health & Identify Opportunity
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedAppliance = { ...appliance, last_service_date: todayStr };
        const { score, status } = calculateApplianceHealth(updatedAppliance, notes);
        
        // Update Appliance
        const { error: appUpdateErr } = await supabase
          .from('appliances')
          .update({
            last_service_date: todayStr,
            technician_notes: notes,
            health_score: score,
            health_status: status
          })
          .eq('appliance_id', appliance.appliance_id);
        if (appUpdateErr) throw new Error(appUpdateErr.message);

        // Opportunity detection
        const opportunity = detectRevenueOpportunity(updatedAppliance, status);
        if (opportunity) {
          // Check if an open opportunity of this type already exists to prevent duplicates
          const { data: existingOpps } = await supabase
            .from('opportunities')
            .select('opportunity_id')
            .eq('appliance_id', appliance.appliance_id)
            .eq('opportunity_type', opportunity.type)
            .eq('status', 'Open')
            .limit(1);

          if (!existingOpps || existingOpps.length === 0) {
            await supabase.from('opportunities').insert({
              appliance_id: appliance.appliance_id,
              customer_id: job.customer_id,
              opportunity_type: opportunity.type,
              title: opportunity.title,
              description: opportunity.description,
              priority: opportunity.priority,
              status: 'Open',
              suggested_action: opportunity.suggested_action
            });

            // Need to lookup customer profile ID for notification
            const { data: custData } = await supabase
              .from('customers')
              .select('profile_id')
              .eq('customer_code', job.customer_id)
              .maybeSingle();

            if (custData?.profile_id) {
              const msg = `Your ${appliance.brand || ''} ${appliance.appliance_type} is ${status}. ${opportunity.suggested_action}`;
              await createNotification(custData.profile_id, 'OPPORTUNITY_REMINDER', `Opportunity: ${opportunity.title}`, msg, job.booking_id);
            }
          }
        }
      }

      // Reload page data
      setJob({ ...job, status: 'Completed' });
      setNotes('');
      setAmount('');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: jobData, error: jobErr } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('technician_id', technician.technician_id)
          .single();

        if (jobErr) throw new Error("Job not found or unauthorized.");
        setJob(jobData);

        if (jobData.appliance_id) {
          const { data: appData, error: appErr } = await supabase
            .from('appliances')
            .select('*')
            .eq('appliance_id', jobData.appliance_id)
            .single();
          
          if (!appErr && appData) {
            setAppliance(appData);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId, technician.technician_id]);

  if (loading) return <PageContainer className="dashboard-content"><p>Loading job details...</p></PageContainer>;
  if (error) return <PageContainer className="dashboard-content"><div className="auth-message auth-message--error">{error}</div><Button onClick={() => navigate('/technician/jobs')}>Back to Jobs</Button></PageContainer>;

  return (
    <PageContainer className="dashboard-content">
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/technician/jobs')} style={{ marginBottom: '1rem' }}>← Back to Jobs</Button>
        <h1 className="dashboard-welcome__title">Job: {job.service_category}</h1>
        <span className="status-badge" style={{ background: '#dcfce7', color: '#15803d', marginTop: '0.5rem', display: 'inline-block' }}>{job.status}</span>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Service Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Customer:</strong> {job.customer_name || 'N/A'}</p>
            <p><strong>Date:</strong> {job.service_date || 'TBD'}</p>
            <p><strong>Time Window:</strong> {(job.start_time && job.end_time) ? `${job.start_time} - ${job.end_time}` : 'TBD'}</p>
            <p><strong>Address:</strong> {job.address || 'N/A'}</p>
            <p><strong>Area:</strong> {job.area || 'N/A'}</p>
          </div>
        </Card>

        {appliance && (
          <Card padding="lg">
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Appliance Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p><strong>Type:</strong> {appliance.appliance_type}</p>
              <p><strong>Brand:</strong> {appliance.brand || 'N/A'}</p>
              <p><strong>Model:</strong> {appliance.model || 'N/A'}</p>
              <p><strong>Health Score:</strong> {appliance.health_score}/100 ({appliance.health_status})</p>
              <p><strong>Installation Date:</strong> {appliance.installation_date || 'N/A'}</p>
              <p><strong>Last Service:</strong> {appliance.last_service_date || 'N/A'}</p>
              {appliance.technician_notes && (
                <div>
                  <strong>Previous Notes:</strong>
                  <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{appliance.technician_notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {job.status === 'Booked' && (
        <Card padding="lg" style={{ marginTop: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Complete Job & Add Notes</h2>
          <form onSubmit={handleCompleteJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Service Notes / Issues Found</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Cleaned filters, found minor vibration. Recommended maintenance."
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cost Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Optional"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
              />
            </div>
            {submitError && <div className="auth-message auth-message--error">{submitError}</div>}
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Completing...' : 'Mark as Completed'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
