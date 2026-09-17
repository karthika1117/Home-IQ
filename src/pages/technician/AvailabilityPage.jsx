import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { useTechnician } from '../../context/TechnicianContext';

export default function AvailabilityPage() {
  const { technician } = useTechnician();

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-title">Availability Settings</h1>
      </div>
      
      <div className="mb-6 flex items-start gap-2" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '4px' }}>READ ONLY</strong>
          <span style={{ fontSize: '0.9375rem' }}>Profile editing will be fully enabled in a future phase.</span>
        </div>
      </div>

      <Card padding="lg" style={{ maxWidth: '600px' }}>
        <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
          <Clock size={20} /> Current Status
        </h2>
        <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
          <Badge variant={technician.is_available ? 'success' : 'danger'} style={{ fontSize: '1rem', padding: '6px 12px' }}>
            {technician.is_available ? 'Available for new jobs' : 'Unavailable'}
          </Badge>
        </div>

        <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
          <Calendar size={20} /> Configured Schedule
        </h2>
        {(!technician.availability || Object.keys(technician.availability).length === 0) ? (
          <p className="text-muted" style={{ margin: 0, fontSize: '0.9375rem' }}>No specific schedule configured.</p>
        ) : (
          <pre style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-navy)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '0.9375rem', overflowX: 'auto', margin: 0 }}>
            {JSON.stringify(technician.availability, null, 2)}
          </pre>
        )}
      </Card>
    </PageContainer>
  );
}
