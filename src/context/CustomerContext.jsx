import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { createCustomer } from '../lib/customerProvisioning';
import PageContainer from '../components/PageContainer';

const CustomerContext = createContext();

export function CustomerProvider({ children }) {
  const { user, profile } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('AUTH USER ID:', user?.id || null);
      console.log('AUTH EMAIL:', user?.email || null);
      console.log('PROFILE:', profile);
      console.log('PROFILE ID:', profile?.id || null);
    }
    if (!user || profile?.role !== 'customer') {
      setCustomer(null);
      setError(null);
      setLoading(false);
      return;
    }

    async function fetchCustomer() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('customers')
          .select('*')
          .eq('profile_id', user.id)
          .limit(2);

        if (fetchErr) throw fetchErr;
        if (!data || data.length === 0) {
          const metadata = user.user_metadata || {};
          const canProvisionCustomer = metadata.role === 'customer';

          if (!canProvisionCustomer) {
            if (import.meta.env.DEV) console.log('CUSTOMER:', null);
            throw new Error('Customer record could not be found. Please contact support.');
          }

          const createdRecord = await createCustomer({
            profileId: user.id,
            address: metadata.address,
            city: metadata.city
          });
          const createdIdentifier = createdRecord.customer_code || createdRecord.customer_id;
          if (!createdIdentifier) {
            throw new Error('Customer record is missing its customer identifier. Please contact support.');
          }
          if (import.meta.env.DEV) console.log('CUSTOMER:', createdRecord);
          setCustomer({ ...createdRecord, customer_code: createdIdentifier });
          return;
        }
        if (data.length > 1) {
          throw new Error('Multiple customer records were found. Please contact support.');
        }
        const customerRecord = data[0];
        if (import.meta.env.DEV) console.log('CUSTOMER:', customerRecord);
        const customerIdentifier = customerRecord.customer_code || customerRecord.customer_id;
        if (!customerIdentifier) {
          throw new Error('Customer record is missing its customer identifier. Please contact support.');
        }
        setCustomer({ ...customerRecord, customer_code: customerIdentifier });
      } catch (err) {
        const knownMessages = [
          'Customer record could not be found. Please contact support.',
          'Multiple customer records were found. Please contact support.',
          'Customer record is missing its customer identifier. Please contact support.'
        ];
        setError(knownMessages.includes(err.message)
          ? err.message
          : 'Customer data could not be loaded. Please try again or contact support.');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [user, profile]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading customer data...
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
    <CustomerContext.Provider value={{ customer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
