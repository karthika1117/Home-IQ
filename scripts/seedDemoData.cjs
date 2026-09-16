const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const demoCustomers = [
  { name: 'Arun', email: 'demo.customer01@homeiq.test', pass: 'HomeIQ@Demo01', phone: '9876543201' },
  { name: 'Priya', email: 'demo.customer02@homeiq.test', pass: 'HomeIQ@Demo02', phone: '9876543202' },
  { name: 'Karthik', email: 'demo.customer03@homeiq.test', pass: 'HomeIQ@Demo03', phone: '9876543203' },
  { name: 'Ananya', email: 'demo.customer04@homeiq.test', pass: 'HomeIQ@Demo04', phone: '9876543204' },
  { name: 'Sanjay', email: 'demo.customer05@homeiq.test', pass: 'HomeIQ@Demo05', phone: '9876543205' },
  { name: 'Divya', email: 'demo.customer06@homeiq.test', pass: 'HomeIQ@Demo06', phone: '9876543206' },
  { name: 'Naveen', email: 'demo.customer07@homeiq.test', pass: 'HomeIQ@Demo07', phone: '9876543207' },
  { name: 'Harini', email: 'demo.customer08@homeiq.test', pass: 'HomeIQ@Demo08', phone: '9876543208' },
  { name: 'Rahul', email: 'demo.customer09@homeiq.test', pass: 'HomeIQ@Demo09', phone: '9876543209' },
  { name: 'Meena', email: 'demo.customer10@homeiq.test', pass: 'HomeIQ@Demo10', phone: '9876543210' }
];

const demoTechnicians = [
  { name: 'Rajasekar', email: 'demo.technician01@homeiq.test', pass: 'HomeIQ@Tech01', cat: ['AC'], area: 'Coimbatore', rate: 450, rating: 4.8 },
  { name: 'Arun Kumar', email: 'demo.technician02@homeiq.test', pass: 'HomeIQ@Tech02', cat: ['Washing Machine', 'Refrigerator'], area: 'Gandhipuram', rate: 500, rating: 4.5 },
  { name: 'Prakash', email: 'demo.technician03@homeiq.test', pass: 'HomeIQ@Tech03', cat: ['AC', 'Refrigerator'], area: 'Saibaba Colony', rate: 600, rating: 4.9 },
  { name: 'Suresh', email: 'demo.technician04@homeiq.test', pass: 'HomeIQ@Tech04', cat: ['Washing Machine'], area: 'RS Puram', rate: 400, rating: 4.2 },
  { name: 'Vignesh', email: 'demo.technician05@homeiq.test', pass: 'HomeIQ@Tech05', cat: ['AC', 'Washing Machine', 'Refrigerator'], area: 'Peelamedu', rate: 700, rating: 5.0 },
  { name: 'Dinesh', email: 'demo.technician06@homeiq.test', pass: 'HomeIQ@Tech06', cat: ['AC'], area: 'Singanallur', rate: 450, rating: 4.6 },
  { name: 'Manoj', email: 'demo.technician07@homeiq.test', pass: 'HomeIQ@Tech07', cat: ['Refrigerator'], area: 'Ganapathy', rate: 480, rating: 4.4 },
  { name: 'Bala', email: 'demo.technician08@homeiq.test', pass: 'HomeIQ@Tech08', cat: ['Washing Machine'], area: 'Saravanampatti', rate: 520, rating: 4.7 },
  { name: 'Ashwin', email: 'demo.technician09@homeiq.test', pass: 'HomeIQ@Tech09', cat: ['AC', 'Refrigerator'], area: 'Vadavalli', rate: 550, rating: 4.8 },
  { name: 'Santhosh', email: 'demo.technician10@homeiq.test', pass: 'HomeIQ@Tech10', cat: ['Washing Machine'], area: 'Kuniyamuthur', rate: 450, rating: 4.3 }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSeed() {
  console.log('--- Starting Demo Data Seed ---');
  let orphanCount = 0, errCount = 0;
  
  // 1. Cleanup Old Demo Users
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (!listErr && users) {
    for (let u of users) {
      if (u.email && u.email.endsWith('@homeiq.test')) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
    console.log('Cleaned up previous @homeiq.test demo users.');
  }

  // 2. Create Customers
  let custMap = {};
  for (let c of demoCustomers) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: c.email,
      password: c.pass,
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: c.name }
    });
    
    if (authErr) { console.error('Cust Auth Err:', authErr.message); errCount++; continue; }
    
    await sleep(500); // let profile trigger run
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.user.id).single();
    if (profile) {
      // Check customer record
      let { data: custRec } = await supabase.from('customers').select('*').eq('profile_id', profile.id).single();
      if (!custRec) {
        const code = 'CUS' + Date.now().toString(16).toUpperCase().slice(-8);
        const { data: newCust } = await supabase.from('customers').insert({
          profile_id: profile.id, customer_code: code, address: `123 ${c.name} St`, city: 'Coimbatore'
        }).select().single();
        custRec = newCust;
      }
      custMap[c.email] = { profile, customer: custRec };
      console.log(`✓ Created Customer: ${c.name}`);
    } else { orphanCount++; }
  }

  // 3. Create Technicians
  let techMap = {};
  for (let t of demoTechnicians) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: t.email,
      password: t.pass,
      email_confirm: true,
      user_metadata: { role: 'technician', full_name: t.name }
    });
    
    if (authErr) { console.error('Tech Auth Err:', authErr.message); errCount++; continue; }
    
    await sleep(500);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.user.id).single();
    if (profile) {
      let { data: techRec } = await supabase.from('technicians').select('*').eq('profile_id', profile.id).single();
      if (!techRec) {
         console.log(`Trigger missed tech for ${t.name}, creating manually.`);
         const { data: newTech } = await supabase.from('technicians').insert({
           profile_id: profile.id, name: t.name, is_available: true
         }).select().single();
         techRec = newTech;
      }
      // Update with details
      const { data: updatedTech } = await supabase.from('technicians').update({
        service_categories: t.cat, area: t.area, hourly_rate: t.rate, rating: t.rating, is_available: true
      }).eq('technician_id', techRec.technician_id).select().single();
      
      techMap[t.email] = { profile, technician: updatedTech };
      console.log(`✓ Created Technician: ${t.name}`);
    } else { orphanCount++; }
  }

  // 4. Create Appliances
  console.log('--- Seeding Appliances ---');
  let applianceList = [];
  const appsData = [
    { type: 'AC', brand: 'LG', model: 'Split AC', score: 85, status: 'GOOD', age: 1, srvMs: 6 },
    { type: 'Refrigerator', brand: 'Samsung', model: 'Side-by-Side', score: 45, status: 'DUE_SOON', age: 3, srvMs: 14, note: 'Minor cooling issues.' },
    { type: 'Washing Machine', brand: 'Whirlpool', model: 'Front Load', score: 25, status: 'OVERDUE', age: 5, srvMs: 24, note: 'Heavy vibration detected.' }
  ];

  let appCounter = 0;
  for (let i = 0; i < demoCustomers.length; i++) {
    const c = custMap[demoCustomers[i].email];
    if (!c) continue;
    
    // Each gets 2 or 3 apps
    const numApps = (i % 2 === 0) ? 2 : 3;
    for (let j = 0; j < numApps; j++) {
      const template = appsData[(i + j) % appsData.length];
      const today = new Date();
      const inst = new Date(today); inst.setFullYear(today.getFullYear() - template.age);
      const srv = new Date(today); srv.setMonth(today.getMonth() - template.srvMs);
      
      const { data: app } = await supabase.from('appliances').insert({
        customer_id: c.customer.customer_id, // UUID
        appliance_type: template.type,
        brand: template.brand,
        model: template.model,
        health_score: template.score,
        health_status: template.status,
        installation_date: inst.toISOString().split('T')[0],
        last_service_date: srv.toISOString().split('T')[0],
        technician_notes: template.note || 'Working normally.'
      }).select().single();
      
      if (app) {
        applianceList.push({ app, customer: c });
        appCounter++;
      }
    }
  }
  console.log(`✓ Created ${appCounter} Appliances.`);

  // 5. Create Requests & Bookings & History
  console.log('--- Seeding Requests & Bookings ---');
  let reqCount = 0, bookCount = 0, histCount = 0;
  
  for (let i = 0; i < applianceList.length; i++) {
     if (i > 15) break; // Limit to 15 full flows
     
     const item = applianceList[i];
     const app = item.app;
     const cust = item.customer;
     const techObj = Object.values(techMap).find(t => t.technician.service_categories.includes(app.appliance_type));
     if (!techObj) continue;
     const tech = techObj.technician;

     const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
     const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

     const isCompleted = i % 3 === 0;
     const isSearching = i % 3 === 1;
     const isConfirmed = i % 3 === 2;
     
     const targetDate = isCompleted ? yesterday : tomorrow;
     const reqStatus = isCompleted ? 'Completed' : (isSearching ? 'Searching' : 'Confirmed');

     const { data: sr, error: srErr } = await supabase.from('service_requests').insert({
       customer_id: cust.customer.customer_code,
       customer_name: cust.profile.full_name,
       category: app.appliance_type,
       appliance_id: app.appliance_id,
       address: cust.customer.address || 'Local Street',
       area: tech.area, // match tech area
       preferred_date: targetDate.toISOString().split('T')[0],
       preferred_start: '10:00:00',
       preferred_end: '12:00:00',
       status: reqStatus,
       technician_id: isSearching ? null : tech.technician_id
     }).select().single();

     if (srErr) { console.error('SR Error:', srErr.message); continue; }
     reqCount++;

     if (isConfirmed || isCompleted) {
       const { data: booking, error: bkErr } = await supabase.from('bookings').insert({
         request_id: sr.request_id,
         customer_id: cust.customer.customer_code,
         customer_name: cust.profile.full_name,
         technician_id: tech.technician_id,
         appliance_id: app.appliance_id,
         service_category: app.appliance_type,
         service_date: targetDate.toISOString().split('T')[0],
         start_time: '10:00:00',
         end_time: '12:00:00',
         status: isCompleted ? 'Completed' : 'Booked',
         address: sr.address,
         area: sr.area
       }).select().single();

       if (!bkErr && booking) {
         bookCount++;
         if (isCompleted) {
            await supabase.from('service_history').insert({
              appliance_id: app.appliance_id,
              customer_id: cust.customer.customer_code,
              technician_id: tech.technician_id,
              service_date: targetDate.toISOString().split('T')[0],
              service_category: app.appliance_type,
              technician_notes: 'Completed the job as requested.',
              issues_found: 'General wear',
              amount: 500
            });
            histCount++;
         }
       }
     }
  }
  console.log(`✓ Created ${reqCount} Requests, ${bookCount} Bookings, ${histCount} History Records.`);

  // 6. Create Opportunities
  let oppCount = 0;
  for (const item of applianceList) {
    if (item.app.health_status === 'OVERDUE') {
      await supabase.from('opportunities').insert({
        appliance_id: item.app.appliance_id,
        customer_id: item.customer.customer.customer_code,
        opportunity_type: 'MAINTENANCE',
        title: `${item.app.brand} Maintenance Alert`,
        description: `Appliance is overdue for service. Score: ${item.app.health_score}`,
        priority: 'High',
        status: 'Open',
        suggested_action: 'Book Service',
        estimated_revenue: 1200
      });
      oppCount++;
    } else if (item.app.health_status === 'DUE_SOON') {
      await supabase.from('opportunities').insert({
        appliance_id: item.app.appliance_id,
        customer_id: item.customer.customer.customer_code,
        opportunity_type: 'CHECKUP',
        title: `${item.app.brand} Checkup Due`,
        description: `Appliance checkup recommended. Score: ${item.app.health_score}`,
        priority: 'Medium',
        status: 'Open',
        suggested_action: 'Schedule Checkup',
        estimated_revenue: 400
      });
      oppCount++;
    }
  }
  console.log(`✓ Created ${oppCount} Opportunities.`);

  // 7. Create Notifications
  let notifCount = 0;
  for (let c of Object.values(custMap)) {
    await supabase.from('notifications').insert({
      user_id: c.profile.id, type: 'CUSTOMER_BOOKING_REMINDER', title: 'Welcome to HomeIQ!', message: 'Thanks for joining.', read: false
    });
    notifCount++;
  }
  for (let t of Object.values(techMap)) {
    await supabase.from('notifications').insert({
      user_id: t.profile.id, type: 'TECHNICIAN_JOB_REMINDER', title: 'Welcome Technician!', message: 'You are ready to accept jobs.', read: false
    });
    notifCount++;
  }
  console.log(`✓ Created ${notifCount} Notifications.`);

  // Output Credentials
  let md = `# HomeIQ Demo Accounts\n\n_DEMO / TEST ACCOUNTS ONLY_\n\n## Customers\n\n| Name | Email | Password |\n|---|---|---|\n`;
  for (let c of demoCustomers) md += `| ${c.name} | ${c.email} | ${c.pass} |\n`;
  md += `\n## Technicians\n\n| Name | Email | Password |\n|---|---|---|\n`;
  for (let t of demoTechnicians) md += `| ${t.name} | ${t.email} | ${t.pass} |\n`;

  fs.writeFileSync(path.join(__dirname, '../DEMO_CREDENTIALS.md'), md);
  console.log('✓ Wrote DEMO_CREDENTIALS.md');

  console.log('\n--- FINAL REPORT ---');
  console.log(`Customers: ${Object.keys(custMap).length}`);
  console.log(`Technicians: ${Object.keys(techMap).length}`);
  console.log(`Appliances: ${appCounter}`);
  console.log(`Requests: ${reqCount}`);
  console.log(`Bookings: ${bookCount}`);
  console.log(`Service History: ${histCount}`);
  console.log(`Opportunities: ${oppCount}`);
  console.log(`Notifications: ${notifCount}`);
  console.log(`Orphans: ${orphanCount}`);
  console.log(`Errors: ${errCount}`);
}

runSeed().catch(e => console.error(e));
