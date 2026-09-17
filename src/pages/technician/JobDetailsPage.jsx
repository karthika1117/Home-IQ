import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Calendar, Clock, WashingMachine, CheckCircle, PenTool, Receipt } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import LoadingState from '../../components/LoadingState';
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
  const [completedSuccess, setCompletedSuccess] = useState(false);

  const handleCompleteJob = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/complete-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          bookingId: job.booking_id,
          notes,
          amount,
          applianceId: appliance?.appliance_id
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to complete job.');
      }
      
      if (appliance) {
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedAppliance = { ...appliance, last_service_date: todayStr };
        const { score, status } = calculateApplianceHealth(updatedAppliance, notes);
        
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

        const opportunity = detectRevenueOpportunity(updatedAppliance, status);
        if (opportunity) {
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

      setJob({ ...job, status: 'Completed' });
      setNotes('');
      setAmount('');
      setCompletedSuccess(true);
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

  if (loading) return <PageContainer><LoadingState message="Loading..." fullHeight={true} /></PageContainer>;
  if (error) return (
    <PageContainer>
      <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>
      <Button variant="secondary" onClick={() => navigate('/technician/jobs')}>Back to Jobs</Button>
    </PageContainer>
  );

  return (
    <PageContainer>
      <div className="flex-row justify-between mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/technician/jobs')} style={{ marginBottom: '8px' }}>
            <ArrowLeft size={16} /> Back to Jobs
          </Button>
          <h1 className="text-title" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Job: {job.service_category}</h1>
          <Badge variant={job.status === 'Completed' ? 'success' : 'info'}>{job.status}</Badge>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '2rem' }}>
        <Card padding="lg">
          <h2 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Service Details</h2>
          <div className="flex-col gap-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-muted" />
              <span className="text-muted" style={{ minWidth: '100px' }}>Customer:</span>
              <strong style={{ color: 'var(--color-navy)' }}>{job.customer_name || 'N/A'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-muted" />
              <span className="text-muted" style={{ minWidth: '100px' }}>Date:</span>
              <strong style={{ color: 'var(--color-navy)' }}>{job.service_date ? new Date(job.service_date).toLocaleDateString() : 'TBD'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-muted" />
              <span className="text-muted" style={{ minWidth: '100px' }}>Time:</span>
              <strong style={{ color: 'var(--color-navy)' }}>{((job.start_time && job.end_time) ? `${job.start_time} - ${job.end_time}` : job.start_time) || 'TBD'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-muted" />
              <span className="text-muted" style={{ minWidth: '100px' }}>Area:</span>
              <strong style={{ color: 'var(--color-navy)' }}>{job.area || 'N/A'}</strong>
            </div>
            {job.address && (
              <div className="flex items-start gap-2" style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <MapPin size={16} className="text-muted" style={{ marginTop: '2px' }} />
                <span style={{ fontSize: '0.9375rem', color: 'var(--color-navy)' }}>{job.address}</span>
              </div>
            )}
          </div>
        </Card>

        {appliance && (
          <Card padding="lg">
            <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              <WashingMachine size={20} /> Appliance Info
            </h2>
            <div className="flex-col gap-4">
              <div className="flex justify-between" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-muted">Type</span>
                <strong style={{ color: 'var(--color-navy)' }}>{appliance.appliance_type}</strong>
              </div>
              <div className="flex justify-between" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-muted">Brand</span>
                <strong style={{ color: 'var(--color-navy)' }}>{appliance.brand || 'N/A'}</strong>
              </div>
              <div className="flex justify-between" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-muted">Health Score</span>
                <span className="flex items-center gap-2">
                  <strong>{appliance.health_score}/100</strong>
                  <Badge variant={appliance.health_status === 'Good' ? 'success' : appliance.health_status === 'Critical' ? 'danger' : 'warning'}>{appliance.health_status}</Badge>
                </span>
              </div>
              {appliance.technician_notes && (
                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <strong className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>Previous Notes</strong>
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-navy)' }}>{appliance.technician_notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {completedSuccess && (
        <Card padding="lg" style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)' }}>
          <h2 className="flex items-center gap-2 text-title" style={{ fontSize: '1.25rem', color: 'var(--color-success)', marginBottom: '16px' }}>
            <CheckCircle size={24} /> Job Completed
          </h2>
          <p style={{ color: 'var(--color-success)', margin: '0 0 24px' }}>Service history recorded successfully.</p>
          <Button onClick={() => navigate('/technician/dashboard')} style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
            Return to Dashboard
          </Button>
        </Card>
      )}

      {job.status === 'Booked' && !completedSuccess && (
        <Card padding="lg">
          <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
            <PenTool size={20} /> Complete Job & Add Notes
          </h2>
          <form onSubmit={handleCompleteJob} className="flex-col gap-6">
            <div className="field">
              <label className="input__label" style={{ display: 'block', marginBottom: '8px' }}>Service Notes / Issues Found *</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Cleaned filters, found minor vibration. Recommended maintenance."
                rows={4}
                className="input__field"
                style={{ resize: 'vertical' }}
                required
              />
            </div>
            <div className="field">
              <label className="input__label flex items-center gap-2" style={{ display: 'flex', marginBottom: '8px' }}>
                <Receipt size={16} /> Cost Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Optional"
                className="input__field"
              />
            </div>
            {submitError && <div className="mb-4" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{submitError}</div>}
            <div>
              <Button type="submit" loading={submitting} disabled={submitting}>
                <CheckCircle size={16} /> {submitting ? 'Completing...' : 'Mark as Completed'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
