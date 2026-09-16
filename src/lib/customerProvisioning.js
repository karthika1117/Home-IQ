import { supabase } from './supabaseClient';

const CUSTOMER_CODE_ATTEMPTS = 5;

/**
 * Creates a customer code without using user-controlled values.
 * Uniqueness is ultimately enforced by the database constraint; callers retry
 * only when that constraint reports a collision.
 */
function generateCustomerCode() {
  if (globalThis.crypto?.randomUUID) {
    return `CUS${globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  }

  const randomBytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(randomBytes);
  return `CUS${Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function isUniqueViolation(error) {
  return error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate key');
}

export async function createCustomer({ profileId, address, city }) {
  for (let attempt = 0; attempt < CUSTOMER_CODE_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        profile_id: profileId,
        customer_code: generateCustomerCode(),
        address: address || null,
        city: city || null
      })
      .select('*');

    if (!error && data?.length === 1) return data[0];
    if (!isUniqueViolation(error)) throw error || new Error('Customer record could not be created.');
  }

  throw new Error('Customer code could not be generated uniquely. Please try again.');
}
