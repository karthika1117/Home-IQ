import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const AREAS = [
  'Saravanampatti', 'Gandhipuram', 'Peelamedu', 'RS Puram', 
  'Saibaba Colony', 'Ganapathy', 'Singanallur', 'Vadavalli', 
  'Kuniyamuthur', 'Ukkadam', 'Ramanathapuram', 'Kalapatti', 
  'Sundarapuram', 'Podanur', 'Race Course'
];

const CATEGORIES = [
  'AC', 'Washing Machine', 'Refrigerator', 'Microwave', 
  'TV', 'Water Heater', 'RO Water Purifier', 'Dishwasher'
];

const BRANDS = ['LG', 'Samsung', 'Whirlpool', 'IFB', 'Haier', 'Voltas', 'Daikin', 'Blue Star', 'Panasonic', 'Bosch', 'O General'];

const INDIAN_NAMES_MALE = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Ansh', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Rudra', 'Aaryan', 'Dhruv', 'Rishi', 'Karthik', 'Manoj', 'Rajasekar', 'Suresh', 'Dinesh'];
const INDIAN_NAMES_FEMALE = ['Saanvi', 'Aadya', 'Kiara', 'Diya', 'Priya', 'Riya', 'Ananya', 'Isha', 'Meera', 'Sneha', 'Neha', 'Pooja', 'Kavya', 'Swati', 'Aditi', 'Divya', 'Anushka', 'Shruti', 'Nandini', 'Tanya', 'Tanvi', 'Anjali', 'Simran', 'Roshni', 'Aarti'];

function getRandomName(isMale) {
  const list = isMale ? INDIAN_NAMES_MALE : INDIAN_NAMES_FEMALE;
  return list[Math.floor(Math.random() * list.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '.';
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDates(healthStatus) {
  const now = new Date();
  let installDate = new Date();
  let lastService = new Date();

  if (healthStatus === 'Good') {
    installDate.setMonth(now.getMonth() - randomInt(1, 12));
    lastService.setMonth(now.getMonth() - randomInt(1, 3));
  } else if (healthStatus === 'Due Soon') {
    installDate.setFullYear(now.getFullYear() - randomInt(1, 3));
    lastService.setMonth(now.getMonth() - randomInt(6, 11));
  } else {
    installDate.setFullYear(now.getFullYear() - randomInt(2, 5));
    lastService.setMonth(now.getMonth() - randomInt(12, 24));
  }
  return {
    install: installDate.toISOString().split('T')[0],
    last: lastService.toISOString().split('T')[0]
  };
}

async function run() {
  console.log('--- STARTING DEMO DATA RESET ---');

  // 1. Fetch ALL auth users
  console.log('Fetching auth users...');
  let hasMore = true;
  let page = 1;
  const usersToDelete = [];
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error('Error fetching users:', error);
      break;
    }
    if (users.length === 0) hasMore = false;
    for (const u of users) {
      if (u.email && u.email.endsWith('@homeiq.demo')) {
        usersToDelete.push(u.id);
      }
    }
    page++;
  }

  console.log(`Found ${usersToDelete.length} demo users to delete.`);
  
  // 2. Clear tables explicitly to be safe (bypassing RLS with service key)
  console.log('Clearing old demo data from tables...');
  const tablesToClear = ['notifications', 'opportunities', 'service_history', 'bookings', 'service_requests', 'appliances', 'technicians', 'customers'];
  
  for (const table of tablesToClear) {
    // We assume there might be a lot, but we just delete where email matches or we just truncate.
    // Since we can't easily truncate safely without wiping admin, we delete rows associated with these users.
    // Wait, appliances don't have profile_id directly. We will delete all records where customer_id/technician_id points to deleted profiles.
    // The easiest way is to delete from auth.users, and if the DB has ON DELETE CASCADE it works. Let's delete users first.
  }

  console.log('Deleting auth users (this should cascade if FKs are set up, otherwise we delete manually)...');
  for (const id of usersToDelete) {
    await supabase.auth.admin.deleteUser(id);
  }
  
  // Safely delete all rows since it's a test DB. 
  // We can just use .not('column', 'is', null) which works universally
  console.log('Clearing old demo data from tables...');
  await supabase.from('opportunities').delete().not('opportunity_id', 'is', null);
  await supabase.from('service_history').delete().not('history_id', 'is', null);
  await supabase.from('notifications').delete().not('id', 'is', null);
  await supabase.from('bookings').delete().not('booking_id', 'is', null);
  await supabase.from('service_requests').delete().not('request_id', 'is', null);
  await supabase.from('appliances').delete().not('appliance_id', 'is', null);
  await supabase.from('technicians').delete().not('technician_id', 'is', null);
  await supabase.from('customers').delete().not('customer_id', 'is', null);
  
  // also delete leftover profiles just in case
  await supabase.from('profiles').delete().like('email', '%@homeiq.demo');

  console.log('Deleting auth users (this should cascade if FKs are set up, otherwise we delete manually)...');
  for (const id of usersToDelete) {
    await supabase.auth.admin.deleteUser(id);
  }
  
  console.log('--- CREATING 50 CUSTOMERS ---');
  let credentials = "# HomeIQ Demo Credentials\n\n## Customers\n\n";
  const createdCustomers = [];
  
  for (let i = 1; i <= 50; i++) {
    const numStr = i.toString().padStart(2, '0');
    const email = `customer${numStr}@homeiq.demo`;
    const password = `HomeIQ@Cust${numStr}`;
    const name = getRandomName(i % 2 === 0);
    const area = getRandom(AREAS);

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: name, address: `123 Demo St, ${area}`, city: 'Coimbatore', phone: `+919876543${numStr}` }
    });

    if (authErr) {
      console.error(`Error creating customer ${numStr}:`, authErr);
      continue;
    }

    await supabase.from('profiles').upsert({
      id: authData.user.id,
      role: 'customer',
      full_name: name,
      email: email,
      phone: `+919876543${numStr}`
    });

    const customerCode = `CUS${numStr}${Date.now().toString().slice(-4)}`;
    const { data: custData } = await supabase.from('customers').insert({
      profile_id: authData.user.id,
      customer_code: customerCode,
      address: `123 Demo St, ${area}`,
      city: 'Coimbatore'
    }).select().single();

    createdCustomers.push({ ...custData, name, email, area });
    credentials += `Customer ${numStr}\nName: ${name}\nEmail: ${email}\nPassword: ${password}\nCustomer ID: ${customerCode}\n\n`;
  }

  console.log('--- CREATING 50 TECHNICIANS ---');
  credentials += "\n## Technicians\n\n";
  const createdTechnicians = [];

  for (let i = 1; i <= 50; i++) {
    const numStr = i.toString().padStart(2, '0');
    const email = `technician${numStr}@homeiq.demo`;
    const password = `HomeIQ@Tech${numStr}`;
    const name = getRandomName(i % 2 !== 0);
    const area = getRandom(AREAS);
    const shuffledCats = [...CATEGORIES].sort(() => 0.5 - Math.random());
    const cats = shuffledCats.slice(0, randomInt(1, 3));

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'technician', full_name: name }
    });

    if (authErr) continue;

    await supabase.from('profiles').upsert({
      id: authData.user.id,
      role: 'technician',
      full_name: name,
      email: email,
      phone: `+919988776${numStr}`
    });

    const { data: techData, error: tErr } = await supabase.from('technicians').insert({
      profile_id: authData.user.id,
      name: name,
      service_categories: cats,
      area: area,
      hourly_rate: randomInt(400, 1500),
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      is_available: true,
      availability: {
        "Monday-Friday": ["09:00-18:00"],
        "Saturday": ["09:00-14:00"]
      }
    }).select().single();

    if (tErr) { console.error('Tech Error:', tErr); continue; }

    createdTechnicians.push({ ...techData, email, cats });
    credentials += `Technician ${numStr}\nName: ${name}\nEmail: ${email}\nPassword: ${password}\nCategories: ${cats.join(', ')}\nArea: ${area}\n\n`;
  }

  console.log('--- CREATING APPLIANCES ---');
  const createdAppliances = [];
  for (const cust of createdCustomers) {
    const numApp = randomInt(2, 4);
    for (let i = 0; i < numApp; i++) {
      const type = getRandom(CATEGORIES);
      const brand = getRandom(BRANDS);
      
      const r = Math.random();
      let healthStatus = 'Good';
      let healthScore = randomInt(80, 100);
      if (r > 0.5 && r <= 0.8) {
        healthStatus = 'Due Soon';
        healthScore = randomInt(50, 79);
      } else if (r > 0.8) {
        healthStatus = 'Overdue';
        healthScore = randomInt(0, 49);
      }

      const dates = generateDates(healthStatus);

      const { data: appData, error: appErr } = await supabase.from('appliances').insert({
        customer_id: cust.customer_code,
        appliance_type: type,
        brand: brand,
        model: `${brand.substring(0,3).toUpperCase()}-${randomInt(1000,9999)}`,
        installation_date: dates.install,
        last_service_date: dates.last,
        health_score: healthScore,
        health_status: healthStatus,
        technician_notes: healthStatus !== 'Good' ? 'Customer reported minor issues.' : 'Working fine.'
      }).select().single();

      if (appErr) { console.error('Appliance Error:', appErr); continue; }
      createdAppliances.push(appData);

      if (healthStatus !== 'Good') {
        const oppType = type.includes('AC') ? 'AC Deep Cleaning' : 'Preventive Maintenance';
        await supabase.from('opportunities').insert({
          appliance_id: appData.appliance_id,
          customer_id: cust.customer_code,
          opportunity_type: oppType,
          title: `${oppType} required`,
          description: `The ${type} is marked as ${healthStatus}.`,
          priority: healthStatus === 'Overdue' ? 'High' : 'Medium',
          status: 'Open',
          suggested_action: 'Schedule a checkup'
        });
      }
    }
  }

  console.log('--- CREATING SERVICE REQUESTS & BOOKINGS ---');
  const createdRequests = [];
  const createdBookings = [];
  const createdHistory = [];
  
  let targetBookings = 70;
  
  for (let i = 0; i < 90; i++) {
    const cust = getRandom(createdCustomers);
    const custApps = createdAppliances.filter(a => a.customer_id === cust.customer_code);
    if (custApps.length === 0) continue;
    const app = getRandom(custApps);
    
    const reqStatus = (i < targetBookings) ? 'Confirmed' : 'Searching';
    const d = new Date();
    d.setDate(d.getDate() - randomInt(-5, 15));
    const dateStr = d.toISOString().split('T')[0];

    const { data: reqData, error: reqErr } = await supabase.from('service_requests').insert({
      customer_id: cust.customer_code,
      customer_name: cust.name,
      appliance_id: app.appliance_id,
      category: app.appliance_type,
      preferred_date: dateStr,
      preferred_start: '10:00',
      preferred_end: '12:00',
      area: cust.area,
      address: cust.address,
      status: reqStatus
    }).select().single();

    if (reqErr) { console.error('Request Error:', reqErr); continue; }

    createdRequests.push(reqData);

    if (reqStatus === 'Confirmed') {
      const techCandidates = createdTechnicians.filter(t => {
        const c = t.cats || t.service_categories || [];
        return c.includes(app.appliance_type);
      });
      
      let tech = techCandidates.find(t => t.area === cust.area) || techCandidates[0];
      if (!tech) continue; // Skip if no tech handles this

      // Determine booking status
      const isPast = new Date(dateStr) < new Date();
      let bStatus = 'Booked';
      if (isPast) {
        const rand = Math.random();
        if (rand < 0.8) bStatus = 'Completed';
        else if (rand < 0.9) bStatus = 'Cancelled';
      } else {
        if (Math.random() < 0.3) bStatus = 'In Progress';
      }

      const { data: bookData } = await supabase.from('bookings').insert({
        request_id: reqData.request_id,
        customer_id: cust.customer_code,
        customer_name: cust.name,
        technician_id: tech.technician_id,
        appliance_id: app.appliance_id,
        service_category: app.appliance_type,
        service_date: dateStr,
        start_time: '10:00',
        end_time: '12:00',
        status: bStatus,
        area: cust.area,
        address: cust.address
      }).select().single();

      createdBookings.push(bookData);

      // Update request with tech
      await supabase.from('service_requests').update({ technician_id: tech.technician_id }).eq('request_id', reqData.request_id);

      if (bStatus === 'Completed') {
        const { data: histData, error: hErr } = await supabase.from('service_history').insert({
          customer_id: cust.customer_code,
          appliance_id: app.appliance_id,
          service_category: reqData.category,
          service_date: dateStr,
          technician_notes: 'Cleaned filters, checked electricals, verified operation.',
          issues_found: 'Minor dust accumulation.',
          amount: getRandom([450, 600, 850, 1200, 1500, 2200])
        }).select().single();
        if (hErr) { console.error('History Error:', hErr); continue; }
        createdHistory.push(histData);
      }
    }
  }

  console.log('--- WRITING FILES ---');
  fs.writeFileSync('DEMO_CREDENTIALS.md', credentials);

  // Get total opportunities
  const { count: oppCount } = await supabase.from('opportunities').select('*', { count: 'exact', head: true });
  const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true });

  const summary = `# HomeIQ Demo Data Summary

- **Customers**: ${createdCustomers.length}
- **Technicians**: ${createdTechnicians.length}
- **Appliances**: ${createdAppliances.length}
- **Service Requests**: ${createdRequests.length}
- **Bookings**: ${createdBookings.length}
- **Completed Jobs**: ${createdHistory.length}
- **Opportunities**: ${oppCount}
- **Notifications**: ${notifCount}

## Distributions
**Appliance Health**: 
- Good: ${createdAppliances.filter(a => a.health_status === 'Good').length}
- Due Soon: ${createdAppliances.filter(a => a.health_status === 'Due Soon').length}
- Overdue: ${createdAppliances.filter(a => a.health_status === 'Overdue').length}

**Booking Status**:
- Completed: ${createdBookings.filter(b => b.status === 'Completed').length}
- Booked: ${createdBookings.filter(b => b.status === 'Booked').length}
- In Progress: ${createdBookings.filter(b => b.status === 'In Progress').length}
- Cancelled: ${createdBookings.filter(b => b.status === 'Cancelled').length}
`;

  fs.writeFileSync('DEMO_DATA_SUMMARY.md', summary);

  console.log('--- SEEDING COMPLETE ---');
}

run().catch(console.error);
