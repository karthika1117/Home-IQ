import React from 'react';
import { User, Briefcase, MapPin, Phone, Mail, Star, DollarSign } from 'lucide-react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { useTechnician } from '../../context/TechnicianContext';

export default function TechnicianProfilePage() {
  const { technician } = useTechnician();

  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-title">My Profile</h1>
      </div>
      
      <div className="grid-cards">
        <Card padding="lg">
          <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
            <User size={20} /> Personal Information
          </h2>
          <div className="flex-col gap-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted" />
              <strong style={{ minWidth: '80px', color: 'var(--color-navy)' }}>Name:</strong>
              <span className="text-muted">{technician.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted" />
              <strong style={{ minWidth: '80px', color: 'var(--color-navy)' }}>Email:</strong>
              <span className="text-muted">{technician.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-muted" />
              <strong style={{ minWidth: '80px', color: 'var(--color-navy)' }}>Phone:</strong>
              <span className="text-muted">{technician.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-muted" />
              <strong style={{ minWidth: '80px', color: 'var(--color-navy)' }}>Area:</strong>
              <span className="text-muted">{technician.area}</span>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
              <span className="text-muted">Status:</span>
              <Badge variant={technician.is_available ? 'success' : 'danger'}>{technician.is_available ? 'Available for Jobs' : 'Unavailable'}</Badge>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-title flex items-center gap-2" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
            <Briefcase size={20} /> Professional Details
          </h2>
          <div className="flex-col gap-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted" />
              <strong style={{ minWidth: '120px', color: 'var(--color-navy)' }}>Hourly Rate:</strong>
              <span className="text-muted">₹{technician.hourly_rate}/hr</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-muted" />
              <strong style={{ minWidth: '120px', color: 'var(--color-navy)' }}>Current Rating:</strong>
              <span className="text-muted">{technician.rating > 0 ? `${technician.rating} / 5.0` : 'New / No ratings'}</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-navy)' }}>Service Categories:</strong>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {technician.service_categories?.length ? technician.service_categories.map(c => (
                  <Badge key={c} variant="neutral">{c}</Badge>
                )) : <span className="text-muted">None specified</span>}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
