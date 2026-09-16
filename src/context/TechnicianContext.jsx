import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageContainer from '../components/PageContainer';

const TechnicianContext = createContext();

export function TechnicianProvider({ children }) {
  const { user, profile } = useAuth();
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'technician') {
      setTechnician(null);
      setError(null);
      setLoading(false);
      return;
    }

    async function fetchTechnician() {
      setLoading(true);
      setError(null);
      try {
        const { data: technicianRows, error: fetchErr } = await supabase
          .from('technicians')
          .select('technician_id, name, phone, email, service_categories, area, hourly_rate, rating, availability, is_available, created_at, profile_id')
          .eq('profile_id', user.id)
          .limit(1);
        let data = technicianRows?.[0] || null;

        if (fetchErr) throw fetchErr;

        if (!data) {
          const metadata = user.user_metadata || {};
          const { error: insertErr } = await supabase.from('technicians').insert({
            profile_id: user.id,
            name: metadata.full_name || profile.full_name || 'Technician',
            phone: metadata.phone || profile.phone || '',
            email: user.email || profile.email || '',
            service_categories: metadata.service_categories || [],
            area: metadata.area || 'Not specified',
            hourly_rate: Number(metadata.hourly_rate) || 0,
            rating: 0,
            availability: {},
            is_available: true,
          });

          if (insertErr) throw insertErr;

          const refreshed = await supabase
            .from('technicians')
            .select('technician_id, name, phone, email, service_categories, area, hourly_rate, rating, availability, is_available, created_at, profile_id')
            .eq('profile_id', user.id)
            .limit(1);
          data = refreshed.data?.[0] || null;
          if (refreshed.error) throw refreshed.error;
        }

        if (!data || !data.technician_id) {
          throw new Error("Technician profile is incomplete. Please contact support.");
        }
        setTechnician(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTechnician();
  }, [user, profile]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading technician data...
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginTop: '2rem' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Access Error</h2>
          <p style={{ color: '#7f1d1d', marginBottom: 0 }}>{error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <TechnicianContext.Provider value={{ technician }}>
      {children}
    </TechnicianContext.Provider>
  );
}

export function useTechnician() {
  const context = useContext(TechnicianContext);
  if (context === undefined) {
    throw new Error('useTechnician must be used within a TechnicianProvider');
  }
  return context;
}
