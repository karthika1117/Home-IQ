const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting demo data seeding...");

  // 1. Create demo users via admin API
  const demoUsers = [
    { email: 'demo_cust1@example.com', password: 'password123', role: 'customer', name: 'Prajith' },
    { email: 'demo_cust2@example.com', password: 'password123', role: 'customer', name: 'Ananya' },
    { email: 'demo_tech1@example.com', password: 'password123', role: 'technician', name: 'Rajasekar' },
    { email: 'demo_tech2@example.com', password: 'password123', role: 'technician', name: 'Arun Kumar' },
    { email: 'demo_tech3@example.com', password: 'password123', role: 'technician', name: 'Prakash' }
  ];

  const profiles = {};

  for (const u of demoUsers) {
    let { data: user, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.name }
    });
    
    if (error) {
      if (error.message.includes('already exists') || error.message.includes('already been registered')) {
        console.log(`User ${u.email} already exists.`);
        const { data: existingUser } = await supabase.from('profiles').select('*').eq('email', u.email).single();
        profiles[u.name] = existingUser;
      } else {
        console.error(`Error creating ${u.email}:`, error.message);
      }
    } else {
      console.log(`Created user ${u.email}`);
      // The trigger should have created the profile
      // Wait a moment for trigger
      await new Promise(r => setTimeout(r, 1000));
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.user.id).single();
      profiles[u.name] = profile;
    }
  }

  // Retrieve customer codes and technician IDs
  const customers = {};
  const technicians = {};

  for (const name of ['Prajith', 'Ananya']) {
    if (!profiles[name]) continue;
    const { data: cust } = await supabase.from('customers').select('*').eq('profile_id', profiles[name].id).single();
    if (cust) customers[name] = cust;
  }

  for (const name of ['Rajasekar', 'Arun Kumar', 'Prakash']) {
    if (!profiles[name]) continue;
    const { data: tech } = await supabase.from('technicians').select('*').eq('profile_id', profiles[name].id).single();
    if (tech) technicians[name] = tech;
  }

  // Update Technician profiles with requested data
  if (technicians['Rajasekar']) {
    await supabase.from('technicians').update({
      service_categories: ['AC', 'Washing Machine'],
      area: 'Coimbatore',
      hourly_rate: 450,
      rating: 4.5,
      availability: { 'Monday-Friday': ['10:00-18:00'] },
      is_available: true
    }).eq('technician_id', technicians['Rajasekar'].technician_id);
  }

  if (technicians['Arun Kumar']) {
    await supabase.from('technicians').update({
      service_categories: ['AC', 'Refrigerator'],
      area: 'Coimbatore',
      hourly_rate: 500,
      rating: 4.7,
      availability: { 'Monday-Friday': ['09:00-17:00'] },
      is_available: true
    }).eq('technician_id', technicians['Arun Kumar'].technician_id);
  }

  if (technicians['Prakash']) {
    await supabase.from('technicians').update({
      service_categories: ['AC', 'Washing Machine'],
      area: 'Coimbatore',
      hourly_rate: 450,
      rating: 4.5,
      is_available: true
    }).eq('technician_id', technicians['Prakash'].technician_id);
  }

  // Appliances
  console.log("Creating appliances...");
  const apps = [
    { customer: 'Prajith', type: 'AC', brand: 'LG', model: 'Split', ageYears: 2, lastServiceMonths: 8 },
    { customer: 'Prajith', type: 'Refrigerator', brand: 'Samsung', model: 'Double Door', ageYears: 1, lastServiceMonths: 1 },
    { customer: 'Ananya', type: 'Washing Machine', brand: 'Whirlpool', model: 'Front Load', ageYears: 3, lastServiceMonths: 12 }
  ];
  
  for (const a of apps) {
    if (!customers[a.customer]) continue;
    const c = customers[a.customer];
    const installDate = new Date();
    installDate.setFullYear(installDate.getFullYear() - a.ageYears);
    const lastServiceDate = new Date();
    lastServiceDate.setMonth(lastServiceDate.getMonth() - a.lastServiceMonths);

    // Calculate score
    let score = 100;
    score -= Math.max(0, a.ageYears * 5);
    const daysSinceService = a.lastServiceMonths * 30;
    if (daysSinceService > 180) {
      score -= Math.floor((daysSinceService - 180) / 10);
    }
    let status = 'GOOD';
    if (score < 40) status = 'OVERDUE';
    else if (score < 70) status = 'DUE_SOON';

    const { data: existingApp } = await supabase.from('appliances')
      .select('*').eq('customer_id', c.customer_code).eq('brand', a.brand).single();

    let applianceId;
    if (!existingApp) {
      const { data: insertedApp } = await supabase.from('appliances').insert({
        customer_id: c.customer_code,
        appliance_type: a.type,
        brand: a.brand,
        model: a.model,
        installation_date: installDate.toISOString().split('T')[0],
        last_service_date: lastServiceDate.toISOString().split('T')[0],
        health_score: score,
        health_status: status
      }).select('appliance_id').single();
      applianceId = insertedApp?.appliance_id;
    } else {
      applianceId = existingApp.appliance_id;
    }

    // Agent 2 Opportunities
    if (applianceId && status !== 'GOOD') {
      const oppType = status === 'OVERDUE' ? 'MAINTENANCE' : 'CHECKUP';
      const { data: existOpp } = await supabase.from('opportunities')
        .select('*').eq('appliance_id', applianceId).eq('status', 'Open').single();
      if (!existOpp) {
        await supabase.from('opportunities').insert({
          appliance_id: applianceId,
          customer_id: c.customer_code,
          opportunity_type: oppType,
          title: `${a.brand} ${a.type} ${oppType === 'MAINTENANCE' ? 'Maintenance Required' : 'Due for Checkup'}`,
          description: `Health score is ${score}. Last serviced ${a.lastServiceMonths} months ago.`,
          priority: status === 'OVERDUE' ? 'High' : 'Medium',
          status: 'Open',
          suggested_action: 'Book Service'
        });
      }
    }
    
    // Service History
    if (applianceId && technicians['Rajasekar']) {
       const { data: existHist } = await supabase.from('service_history')
         .select('*').eq('appliance_id', applianceId).single();
       if (!existHist) {
         await supabase.from('service_history').insert({
           appliance_id: applianceId,
           customer_id: c.customer_code,
           technician_id: technicians['Rajasekar'].technician_id,
           service_date: lastServiceDate.toISOString().split('T')[0],
           service_category: a.type,
           technician_notes: 'Standard checkup completed. Found some wear.',
           issues_found: 'Minor wear',
           amount: 300
         });
       }
    }
  }

  // Bookings
  console.log("Creating bookings...");
  if (customers['Prajith'] && technicians['Arun Kumar']) {
    const { data: existBooking } = await supabase.from('bookings')
      .select('*').eq('customer_id', customers['Prajith'].customer_code).eq('technician_id', technicians['Arun Kumar'].technician_id).single();
      
    if (!existBooking) {
      const { data: sr } = await supabase.from('service_requests').insert({
        customer_id: customers['Prajith'].customer_code,
        customer_name: 'Prajith',
        category: 'AC',
        preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
        preferred_start: '10:00:00',
        preferred_end: '12:00:00',
        status: 'Confirmed',
        technician_id: technicians['Arun Kumar'].technician_id
      }).select('request_id').single();

      if (sr) {
        await supabase.from('bookings').insert({
          request_id: sr.request_id,
          customer_id: customers['Prajith'].customer_code,
          customer_name: 'Prajith',
          technician_id: technicians['Arun Kumar'].technician_id,
          service_category: 'AC',
          service_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          start_time: '10:00:00',
          end_time: '12:00:00',
          status: 'Booked',
          area: 'Coimbatore'
        });
      }
    }
  }

  console.log("Demo seeding completed successfully.");
}

seed().catch(console.error);
