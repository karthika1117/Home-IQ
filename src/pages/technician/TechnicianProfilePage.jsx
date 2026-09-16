import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import { useTechnician } from '../../context/TechnicianContext';

export default function TechnicianProfilePage() {
  const { technician } = useTechnician();

  return (
    <PageContainer className="dashboard-content">
      <h1 className="dashboard-welcome__title" style={{ marginBottom: '2rem' }}>My Profile</h1>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Name:</strong> {technician.name}</p>
            <p><strong>Email:</strong> {technician.email}</p>
            <p><strong>Phone:</strong> {technician.phone}</p>
            <p><strong>Service Area:</strong> {technician.area}</p>
            <p><strong>Availability:</strong> {technician.is_available ? 'Available' : 'Unavailable'}</p>
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Professional Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p><strong>Hourly Rate:</strong> ${technician.hourly_rate}/hr</p>
            <p><strong>Current Rating:</strong> {technician.rating > 0 ? `${technician.rating} / 5.0` : 'New / No ratings yet'}</p>
            <div>
              <strong>Service Categories:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {technician.service_categories?.length ? technician.service_categories.map(c => (
                  <span key={c} className="status-badge" style={{ background: '#f1f5f9', color: '#334155' }}>{c}</span>
                )) : 'None specified'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
