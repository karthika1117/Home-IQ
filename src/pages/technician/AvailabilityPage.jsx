import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';

export default function AvailabilityPage() {
  const { technician } = useTechnician();

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '1.5rem' }}>Availability Settings</h1>
      
      <div className="auth-message auth-message--info" style={{ marginBottom: '2rem' }}>
        <strong>READ ONLY:</strong> Profile editing will be fully enabled in a future phase.
      </div>

      <Card padding="lg" style={{ maxWidth: '600px' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Current Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '16px', height: '16px', borderRadius: '50%', 
            background: technician.is_available ? '#15803d' : '#ef4444' 
          }} />
          <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>
            {technician.is_available ? 'Available for new jobs' : 'Unavailable'}
          </span>
        </div>

        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Configured Schedule</h2>
        {(!technician.availability || Object.keys(technician.availability).length === 0) ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No specific schedule configured.</p>
        ) : (
          <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', overflowX: 'auto' }}>
            {JSON.stringify(technician.availability, null, 2)}
          </pre>
        )}
      </Card>
    </PageContainer>
  );
}
