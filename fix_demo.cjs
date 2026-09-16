const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixDemo() {
  console.log('=== Fixing demo data ===\n');

  // ── 1. Get Prajith's IDs ──────────────────────────────────────────
  const { data: pProfile } = await db.from('profiles').select('*').eq('email', 'demo_cust1@example.com').single();
  const { data: pCustomer } = await db.from('customers').select('*').eq('profile_id', pProfile.id).single();
  console.log('Prajith customer_code:', pCustomer.customer_code);
  console.log('Prajith customer UUID:', pCustomer.customer_id);

  // ── 2. Get Ananya's IDs ──────────────────────────────────────────
  const { data: aProfile } = await db.from('profiles').select('*').eq('email', 'demo_cust2@example.com').single();
  const { data: aCustomer } = await db.from('customers').select('*').eq('profile_id', aProfile.id).single();
  console.log('Ananya customer_code:', aCustomer.customer_code);
  console.log('Ananya customer UUID:', aCustomer.customer_id);

  // ── 3. Delete wrongly-seeded appliances (stored with customer_code) ─
  await db.from('appliances').delete().eq('customer_id', pCustomer.customer_code);
  await db.from('appliances').delete().eq('customer_id', aCustomer.customer_code);
  console.log('\nDeleted incorrectly seeded appliances');

  // ── 4. Get Rajasekar technician ID ───────────────────────────────
  const { data: rajTech } = await db.from('technicians')
    .select('*').eq('technician_id', '46028cf0-da2a-4189-8e86-8a05f481fc40').single();
  if (!rajTech) {
    console.log('Rajasekar not found by fixed ID, looking up by name...');
  }
  const rajTechId = rajTech?.technician_id || '46028cf0-da2a-4189-8e86-8a05f481fc40';

  // ── 5. Re-insert appliances with customer UUID ───────────────────
  const today = new Date();
  const twoYearsAgo = new Date(today); twoYearsAgo.setFullYear(today.getFullYear() - 2);
  const eightMonthsAgo = new Date(today); eightMonthsAgo.setMonth(today.getMonth() - 8);
  const oneYearAgo = new Date(today); oneYearAgo.setFullYear(today.getFullYear() - 1);
  const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(today.getMonth() - 1);
  const threeYearsAgo = new Date(today); threeYearsAgo.setFullYear(today.getFullYear() - 3);
  const twelveMonthsAgo = new Date(today); twelveMonthsAgo.setMonth(today.getMonth() - 12);

  const fmt = (d) => d.toISOString().split('T')[0];

  // LG AC: 2 years old, 8 months since service → DUE_SOON
  const { data: lgAC, error: lgErr } = await db.from('appliances').insert({
    customer_id: pCustomer.customer_id,   // ← UUID, not customer_code
    appliance_type: 'AC',
    brand: 'LG',
    model: 'Split AC (PS-Q18YNZE)',
    installation_date: fmt(twoYearsAgo),
    last_service_date: fmt(eightMonthsAgo),
    health_score: 62,
    health_status: 'DUE_SOON',
    technician_notes: 'AC cleaned, filter replaced. Minor cooling issue observed.'
  }).select().single();
  if (lgErr) console.error('LG AC error:', lgErr.message);
  else console.log('✓ LG AC created:', lgAC.appliance_id);

  // Samsung Refrigerator: 1 year old, 1 month since service → GOOD
  const { data: samsungRef, error: sErr } = await db.from('appliances').insert({
    customer_id: pCustomer.customer_id,
    appliance_type: 'Refrigerator',
    brand: 'Samsung',
    model: 'Double Door RT42T',
    installation_date: fmt(oneYearAgo),
    last_service_date: fmt(oneMonthAgo),
    health_score: 92,
    health_status: 'GOOD',
    technician_notes: 'Refrigerator functioning normally. No issues found.'
  }).select().single();
  if (sErr) console.error('Samsung Ref error:', sErr.message);
  else console.log('✓ Samsung Refrigerator created:', samsungRef.appliance_id);

  // Whirlpool Washing Machine for Ananya: 3 years old, 12 months since service → OVERDUE
  const { data: whirlpool, error: wErr } = await db.from('appliances').insert({
    customer_id: aCustomer.customer_id,
    appliance_type: 'Washing Machine',
    brand: 'Whirlpool',
    model: 'Front Load 7.5kg',
    installation_date: fmt(threeYearsAgo),
    last_service_date: fmt(twelveMonthsAgo),
    health_score: 31,
    health_status: 'OVERDUE',
    technician_notes: 'Washing machine vibration observed. Recommended maintenance.'
  }).select().single();
  if (wErr) console.error('Whirlpool error:', wErr.message);
  else console.log('✓ Whirlpool Washing Machine created:', whirlpool.appliance_id);

  // ── 6. Clean old opportunities and create fresh ones ─────────────
  await db.from('opportunities').delete().eq('customer_id', pCustomer.customer_code);
  await db.from('opportunities').delete().eq('customer_id', aCustomer.customer_code);

  if (lgAC) {
    const { error: oppErr } = await db.from('opportunities').insert({
      appliance_id: lgAC.appliance_id,
      customer_id: pCustomer.customer_code,  // opportunities use customer_code per schema
      opportunity_type: 'CHECKUP',
      title: 'LG Split AC Due for Checkup',
      description: 'Health score is 62. Last serviced 8 months ago. Minor cooling issue noted.',
      priority: 'Medium',
      status: 'Open',
      suggested_action: 'Schedule AMC / Checkup',
      estimated_revenue: 500
    });
    if (oppErr) console.error('LG AC opportunity error:', oppErr.message);
    else console.log('✓ LG AC opportunity created');
  }

  if (whirlpool) {
    const { error: oppErr2 } = await db.from('opportunities').insert({
      appliance_id: whirlpool.appliance_id,
      customer_id: aCustomer.customer_code,
      opportunity_type: 'MAINTENANCE',
      title: 'Whirlpool Washing Machine Requires Urgent Maintenance',
      description: 'Health score is 31. Last serviced 12 months ago. Vibration issues noted.',
      priority: 'High',
      status: 'Open',
      suggested_action: 'Book Maintenance Now',
      estimated_revenue: 800
    });
    if (oppErr2) console.error('Whirlpool opportunity error:', oppErr2.message);
    else console.log('✓ Whirlpool opportunity created');
  }

  // ── 7. Service history ────────────────────────────────────────────
  if (lgAC) {
    await db.from('service_history').insert({
      appliance_id: lgAC.appliance_id,
      customer_id: pCustomer.customer_code,
      technician_id: rajTechId,
      service_date: fmt(eightMonthsAgo),
      service_category: 'AC',
      technician_notes: 'AC cleaned, filter replaced. Minor cooling issue observed.',
      issues_found: 'Minor cooling issue',
      amount: 450
    });
    console.log('✓ LG AC service history created');
  }

  if (samsungRef) {
    await db.from('service_history').insert({
      appliance_id: samsungRef.appliance_id,
      customer_id: pCustomer.customer_code,
      technician_id: rajTechId,
      service_date: fmt(oneMonthAgo),
      service_category: 'Refrigerator',
      technician_notes: 'Refrigerator functioning normally. No issues found.',
      issues_found: 'None',
      amount: 300
    });
    console.log('✓ Samsung Ref service history created');
  }

  // ── 8. Demo booking for Prajith (upcoming) ────────────────────────
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 2);
  const { data: sr } = await db.from('service_requests').insert({
    customer_id: pCustomer.customer_code,
    customer_name: 'Prajith',
    phone: pProfile.phone || '9999999999',
    email: pProfile.email,
    category: 'AC',
    appliance_id: lgAC?.appliance_id || null,
    address: '12 Main Street, RS Puram',
    area: 'Coimbatore',
    preferred_date: fmt(tomorrow),
    preferred_start: '10:00:00',
    preferred_end: '12:00:00',
    status: 'Confirmed',
    technician_id: rajTechId
  }).select('request_id').single();

  if (sr) {
    const { data: booking, error: bErr } = await db.from('bookings').insert({
      request_id: sr.request_id,
      customer_id: pCustomer.customer_code,
      customer_name: 'Prajith',
      technician_id: rajTechId,
      appliance_id: lgAC?.appliance_id || null,
      service_category: 'AC',
      service_date: fmt(tomorrow),
      start_time: '10:00:00',
      end_time: '12:00:00',
      status: 'Booked',
      address: '12 Main Street, RS Puram',
      area: 'Coimbatore'
    }).select().single();
    if (bErr) console.error('Booking error:', bErr.message);
    else {
      console.log('✓ Demo upcoming booking created:', booking.booking_id);

      // ── 9. Agent 3 reminders ──────────────────────────────────────
      await db.from('notifications').insert([
        {
          user_id: pProfile.id,
          type: 'CUSTOMER_BOOKING_REMINDER',
          title: 'Booking Confirmed',
          message: `Reminder: Your AC service with Rajasekar is scheduled for ${fmt(tomorrow)} at 10:00. Address: 12 Main Street, RS Puram, Coimbatore.`,
          related_booking_id: booking.booking_id,
          read: false
        },
        {
          user_id: rajTech?.profile_id || null,
          type: 'TECHNICIAN_JOB_REMINDER',
          title: 'New Job Assigned',
          message: `Job: Prajith — AC Repair — Coimbatore — ${fmt(tomorrow)} — 10:00-12:00. Address: 12 Main Street, RS Puram.`,
          related_booking_id: booking.booking_id,
          read: false
        }
      ].filter(n => n.user_id));
      console.log('✓ Agent 3 notifications created');
    }
  }

  console.log('\n=== Demo data fix complete! ===');
  console.log('\nLogin Credentials:');
  console.log('Customer (Prajith): demo_cust1@example.com / password123');
  console.log('Customer (Ananya):  demo_cust2@example.com / password123');
  console.log('Technician (Rajasekar): prajiprajith688@gmail.com / password123');
}

fixDemo().catch(console.error);

