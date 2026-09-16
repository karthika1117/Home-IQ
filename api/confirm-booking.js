import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use publishable key if available, fallback to anon key for backward compatibility
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS Headers - Allow requests from the frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment.');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  try {
    // ── 1. Auth: verify the caller's JWT ──────────────────────────────────────
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false, status: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    // Use the anon key + user JWT to verify identity (RLS enforced on read ops)
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({
        success: false, status: 'Unauthorized',
        message: 'Invalid or expired session.',
      });
    }

    // Service-role client used for ALL cross-ownership reads (technicians, bookings
    // by other customers, etc.) and for write operations. Never returned to the browser.
    const systemClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : anonClient;

    // ── 2. Extract and validate payload ───────────────────────────────────────
    const {
      requestId,
      customerId,
      technicianId,
      applianceId,
      category,
      area,
      preferredDate,
      preferredStart,
      preferredEnd,
    } = req.body || {};

    const missing = [];
    if (!requestId) missing.push('requestId');
    if (!customerId) missing.push('customerId');
    if (!technicianId) missing.push('technicianId');
    if (!category) missing.push('category');
    if (!area) missing.push('area');
    if (!preferredDate) missing.push('preferredDate');
    if (!preferredStart) missing.push('preferredStart');
    if (!preferredEnd) missing.push('preferredEnd');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false, status: 'Validation Error',
        message: `Missing required fields: ${missing.join(', ')}.`,
      });
    }

    if (preferredStart >= preferredEnd) {
      return res.status(400).json({
        success: false, status: 'Validation Error',
        message: 'Preferred start time must be before end time.',
      });
    }

    // ── 3. Verify customer ownership against the authenticated user ───────────
    const { data: customerRecord, error: customerErr } = await anonClient
      .from('customers')
      .select('customer_code, profile_id, address, city')
      .eq('customer_code', customerId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (customerErr) {
      console.error('Customer lookup error:', customerErr.message);
      return res.status(500).json({
        success: false, status: 'Database Error',
        message: 'Could not verify customer identity.',
      });
    }
    if (!customerRecord) {
      return res.status(403).json({
        success: false, status: 'Forbidden',
        message: 'Customer ownership mismatch.',
      });
    }

    // ── 4. Get customer name from profile ─────────────────────────────────────
    const { data: profileRecord } = await anonClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const customerName = profileRecord?.full_name || 'Customer';

    // ── 5. Validate service request ───────────────────────────────────────────
    const { data: requestRecord, error: requestErr } = await anonClient
      .from('service_requests')
      .select('request_id, customer_id, status, technician_id, address, category')
      .eq('request_id', requestId)
      .maybeSingle();

    if (requestErr) {
      console.error('Request lookup error:', requestErr.message);
      return res.status(500).json({
        success: false, status: 'Database Error',
        message: 'Could not verify service request.',
      });
    }
    if (!requestRecord) {
      return res.status(404).json({
        success: false, status: 'Not Found',
        message: 'Service request not found.',
      });
    }
    if (requestRecord.customer_id !== customerId) {
      return res.status(403).json({
        success: false, status: 'Forbidden',
        message: 'Service request belongs to a different customer.',
      });
    }

    // ── 6. Duplicate protection ───────────────────────────────────────────────
    if (requestRecord.status === 'Confirmed' || requestRecord.technician_id) {
      const { data: existingBooking } = await systemClient
        .from('bookings')
        .select('booking_id, technician_id')
        .eq('request_id', requestId)
        .maybeSingle();

      return res.status(409).json({
        success: false, status: 'Conflict',
        message: 'This service request already has a confirmed booking.',
        existingBookingId: existingBooking?.booking_id || null,
      });
    }

    // ── 7. Validate technician ────────────────────────────────────────────────
    const { data: technicianRecord, error: techErr } = await systemClient
      .from('technicians')
      .select('technician_id, name, service_categories, area, is_available, profile_id')
      .eq('technician_id', technicianId)
      .maybeSingle();

    if (techErr) {
      console.error('Technician lookup error:', techErr.message);
      return res.status(500).json({
        success: false, status: 'Database Error',
        message: 'Could not verify technician.',
      });
    }
    if (!technicianRecord) {
      return res.status(404).json({
        success: false, status: 'Not Found',
        message: 'Technician not found.',
      });
    }

    // ── 8. Category compatibility ─────────────────────────────────────────────
    const categories = Array.isArray(technicianRecord.service_categories)
      ? technicianRecord.service_categories.map((c) => c.toLowerCase())
      : [];
    if (!categories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false, status: 'Validation Error',
        message: 'Technician does not support this service category.',
      });
    }

    // ── 9. Area compatibility ─────────────────────────────────────────────────
    if (
      technicianRecord.area &&
      technicianRecord.area.toLowerCase() !== area.toLowerCase()
    ) {
      return res.status(400).json({
        success: false, status: 'Validation Error',
        message: 'Technician does not cover the requested area.',
      });
    }

    // ── 10. Availability flag (soft check) ────────────────────────────────────
    if (technicianRecord.is_available === false) {
      return res.status(409).json({
        success: false, status: 'Technician Unavailable',
        message: 'The selected technician is not currently accepting bookings.',
      });
    }

    // ── 11. Overlap / conflict check ──────────────────────────────────────────
    const { data: conflicts, error: conflictErr } = await systemClient
      .from('bookings')
      .select('booking_id')
      .eq('technician_id', technicianId)
      .eq('service_date', preferredDate)
      .filter('status', 'neq', 'Cancelled')
      .lt('start_time', preferredEnd)
      .gt('end_time', preferredStart);

    if (conflictErr) {
      console.error('Conflict check error:', conflictErr.message);
      return res.status(500).json({
        success: false, status: 'Database Error',
        message: 'Could not verify technician availability.',
      });
    }
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({
        success: false, status: 'Technician Unavailable',
        message: 'The selected technician is already booked for that time slot.',
      });
    }

    // ── 12. Create booking ────────────────────────────────────────────────────
    const { data: newBooking, error: bookingErr } = await systemClient
      .from('bookings')
      .insert({
        request_id: requestId,
        customer_id: customerId,
        customer_name: customerName,
        technician_id: technicianId,
        appliance_id: applianceId || null,
        service_category: category,
        service_date: preferredDate,
        start_time: preferredStart,
        end_time: preferredEnd,
        status: 'Booked',
        address: requestRecord.address || customerRecord.address || null,
        area: area,
      })
      .select()
      .single();

    if (bookingErr) {
      console.error('Booking insert error:', bookingErr.message);
      return res.status(500).json({
        success: false, status: 'Database Error',
        message: 'Failed to create booking. Please try again.',
      });
    }

    // ── 13. Update service request ────────────────────────────────────────────
    const { error: updateErr } = await systemClient
      .from('service_requests')
      .update({
        technician_id: technicianId,
        status: 'Confirmed',
      })
      .eq('request_id', requestId);

    if (updateErr) {
      console.error('Service request update error:', updateErr.message);
    }

    // ── 13b. AGENT 3 - Create Reminders / Notifications ───────────────────────
    try {
      const customerNotification = {
        user_id: customerRecord.profile_id,
        type: 'CUSTOMER_BOOKING_REMINDER',
        title: 'Booking Confirmed',
        message: `Reminder: Your ${category} service with ${technicianRecord.name} is scheduled for ${preferredDate} at ${preferredStart}.`,
        related_booking_id: newBooking.booking_id,
        read: false
      };

      const techNotification = {
        user_id: technicianRecord.profile_id,
        type: 'TECHNICIAN_JOB_REMINDER',
        title: 'New Job Assigned',
        message: `Today's job: ${customerName} — ${category} — ${area} — ${preferredStart}-${preferredEnd}.`,
        related_booking_id: newBooking.booking_id,
        read: false
      };

      await systemClient.from('notifications').insert([customerNotification, techNotification]);
    } catch (notifErr) {
      console.error('Agent 3 notification error:', notifErr.message);
    }

    // ── 14. Return confirmation ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      status: 'Booking Confirmed',
      bookingId: newBooking.booking_id,
      technicianName: technicianRecord.name,
      preferredDate,
      preferredStart,
      preferredEnd,
      area,
    });

  } catch (err) {
    console.error('Unexpected error in /api/confirm-booking:', err);
    return res.status(500).json({
      success: false, status: 'Server Error',
      message: 'An unexpected error occurred.',
    });
  }
}
