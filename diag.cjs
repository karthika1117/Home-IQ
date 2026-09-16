const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const db = createClient(url, svcKey);

async function fix() {
  // Get the Prajith customer code
  const { data: profile } = await db.from('profiles').select('*').eq('email', 'demo_cust1@example.com').single();
  const { data: customer } = await db.from('customers').select('*').eq('profile_id', profile.id).single();
  const code = customer.customer_code;
  console.log('Customer code:', code);
  console.log('Customer UUID:', customer.customer_id);

  // Check what customer_id the appliances have
  const { data: apps } = await db.from('appliances').select('*').eq('customer_id', code);
  console.log('Appliances with code as customer_id:', apps?.length);

  // Fetch RLS info by checking the OpenAPI spec for appliances
  const schema = await (await fetch(`${url}/rest/v1/?apikey=${svcKey}`)).json();
  const appDef = schema.definitions?.appliances?.properties?.customer_id;
  console.log('appliances.customer_id definition:', JSON.stringify(appDef));

  // The appliances table likely uses customer_id as the auth user.id (UUID) for RLS,
  // but the column stores customer_code (text). Let's check the actual RLS policy
  // by testing with logged-in session
  console.log('\n--- Checking if customer_id in appliances is UUID or text ---');
  console.log('Seeded appliances customer_id value:', apps?.[0]?.customer_id);
  console.log('Expected (customer_code text):', code);
  console.log('customer_id UUID:', customer.customer_id);

  // Check what the RLS actually expects. Try reading an appliance with auth.uid() simulation
  // The old appliance was seeded with customer_id = '05e05d39-cd98-4cc9-8df8-0a96a0b6478d' (UUID)
  // The new demo ones have customer_id = 'CUS4DF607E2CB81' (text)
  // But the RLS might check auth.uid() === customer_id (UUID format)
  
  // Let's check the existing working appliance from Kim's account
  const { data: kimProfile } = await db.from('profiles').select('*').eq('email', 'kimkiaraa006@gmail.com').single();
  const { data: kimCustomer } = await db.from('customers').select('*').eq('profile_id', kimProfile.id).single();
  const { data: kimApps } = await db.from('appliances').select('*').eq('customer_id', kimCustomer.customer_code);
  const { data: kimAppsUUID } = await db.from('appliances').select('*').eq('customer_id', kimCustomer.customer_id);
  console.log('\nKim customer_code:', kimCustomer.customer_code);
  console.log('Kim customer_id (UUID):', kimCustomer.customer_id);
  console.log('Kim appliances via customer_code:', kimApps?.length);
  console.log('Kim appliances via customer_id UUID:', kimAppsUUID?.length);
  if (kimApps?.length > 0) console.log('Kim appliance customer_id value:', kimApps[0].customer_id);
}

fix().catch(console.error);

