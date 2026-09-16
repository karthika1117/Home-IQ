import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runValidation() {
  console.log('Validating Demo Data...');
  let hasErrors = false;

  const { data: customers } = await supabase.from('customers').select('*');
  const { data: technicians } = await supabase.from('technicians').select('*');
  const { data: bookings } = await supabase.from('bookings').select('*');
  const { data: requests } = await supabase.from('service_requests').select('*');
  const { data: history } = await supabase.from('service_history').select('*');
  const { data: appliances } = await supabase.from('appliances').select('*');
  const { data: opportunities } = await supabase.from('opportunities').select('*');
  const { data: profiles } = await supabase.from('profiles').select('*');

  console.log(`Customers: ${customers.length}`);
  console.log(`Technicians: ${technicians.length}`);
  console.log(`Bookings: ${bookings.length}`);
  console.log(`Service History: ${history.length}`);
  console.log(`Appliances: ${appliances.length}`);

  if (customers.length !== 50) { console.error(`FAIL: Expected 50 customers, got ${customers.length}`); hasErrors = true; }
  if (technicians.length !== 50) { console.error(`FAIL: Expected 50 technicians, got ${technicians.length}`); hasErrors = true; }
  if (appliances.length < 100 || appliances.length > 200) { console.error(`FAIL: Appliances count out of bounds: ${appliances.length}`); hasErrors = true; }

  // Check auth consistency (customers and technicians must have profiles)
  for (const c of customers) {
    if (!profiles.find(p => p.id === c.profile_id)) {
      console.error(`FAIL: Customer ${c.customer_code} has no profile record.`);
      hasErrors = true;
    }
  }

  // Check foreign keys
  for (const b of bookings) {
    if (!customers.find(c => c.customer_code === b.customer_id)) {
      console.error(`FAIL: Booking ${b.booking_id} has invalid customer ${b.customer_id}`);
      hasErrors = true;
    }
    const t = technicians.find(t => t.technician_id === b.technician_id);
    if (!t) {
      console.error(`FAIL: Booking ${b.booking_id} has invalid technician ${b.technician_id}`);
      hasErrors = true;
    } else {
      // Check category match
      const cats = t.service_categories || [];
      if (!cats.includes(b.service_category)) {
        console.error(`FAIL: Technician ${t.technician_id} booked for ${b.service_category} but doesn't support it.`);
        hasErrors = true;
      }
    }
    if (b.status === 'Completed' && !history.find(h => h.appliance_id === b.appliance_id && h.service_date === b.service_date)) {
      console.error(`FAIL: Completed booking ${b.booking_id} has no service history.`);
      hasErrors = true;
    }
  }

  // Check history
  for (const h of history) {
    if (!customers.find(c => c.customer_code === h.customer_id)) {
      console.error(`FAIL: History ${h.history_id} has invalid customer ${h.customer_id}`);
      hasErrors = true;
    }
  }

  // Check opportunities
  for (const o of opportunities) {
    if (!appliances.find(a => a.appliance_id === o.appliance_id)) {
      console.error(`FAIL: Opportunity ${o.opportunity_id} has invalid appliance.`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('Validation FAILED.');
    process.exit(1);
  } else {
    console.log('Validation PASSED! Data is consistent.');
    process.exit(0);
  }
}

runValidation().catch(e => { console.error(e); process.exit(1); });
