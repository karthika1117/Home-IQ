import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the Service Role Key to bypass RLS for complex mutations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const systemClient = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { bookingId, notes, amount, applianceId } = req.body;
    
    // Auth Check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing authorization header.' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await systemClient.auth.getUser(token);
    
    if (authErr || !user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
    }

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    // 1. Fetch Job and verify technician ownership
    const { data: tech } = await systemClient.from('technicians').select('technician_id').eq('profile_id', user.id).single();
    if (!tech) {
      return res.status(403).json({ success: false, message: 'Forbidden: User is not a technician.' });
    }

    const { data: job, error: jobErr } = await systemClient.from('bookings').select('*').eq('booking_id', bookingId).single();
    if (jobErr || !job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (job.technician_id !== tech.technician_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not your assigned job.' });
    }

    if (job.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Job is already completed.' });
    }

    // 2. Mark Booking as Completed
    const { error: updateErr } = await systemClient.from('bookings').update({ status: 'Completed' }).eq('booking_id', bookingId);
    if (updateErr) throw updateErr;

    // 3. Mark Service Request as Completed (if applicable)
    if (job.request_id) {
      await systemClient.from('service_requests').update({ status: 'Completed' }).eq('request_id', job.request_id);
    }

    // 4. Create Service History (Idempotent check)
    let historyCreated = false;
    if (applianceId) {
      const { data: existingHist } = await systemClient
        .from('service_history')
        .select('history_id')
        .eq('appliance_id', applianceId)
        .eq('technician_id', tech.technician_id)
        .eq('service_date', job.service_date)
        .limit(1)
        .maybeSingle();

      if (!existingHist) {
        await systemClient.from('service_history').insert({
          appliance_id: applianceId,
          customer_id: job.customer_id,
          technician_id: tech.technician_id,
          service_date: job.service_date,
          service_category: job.service_category,
          technician_notes: notes,
          issues_found: notes,
          amount: amount ? parseFloat(amount) : null
        });
        historyCreated = true;
      }
    }

    return res.status(200).json({ success: true, message: 'Job completed successfully.', historyCreated });

  } catch (err) {
    console.error('Error completing job:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

