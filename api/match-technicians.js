import { createClient } from '@supabase/supabase-js';

// Convert HH:MM string to minutes since midnight
function toMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const agent1WebhookUrl = process.env.VITE_AGENT1_WEBHOOK_URL;
  const isDemo = process.env.VITE_DEMO_MODE === 'true';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  const systemClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Authenticate Customer
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing or invalid authorization header.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await systemClient.auth.getUser(token);

    if (authErr || !user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { data: profile } = await systemClient.from('profiles').select('id, role, full_name, phone, email').eq('id', user.id).single();
    if (profile?.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can request matches.' });
    }

    const { data: customerRecord, error: custErr } = await systemClient.from('customers').select('customer_code, customer_id, address').eq('profile_id', user.id).single();
    if (custErr || !customerRecord) {
      console.error('Customer fetch error:', custErr);
      return res.status(403).json({ success: false, message: 'Customer record not found.' });
    }
    
    // Combine into a single trusted object
    const customer = {
      customer_code: customerRecord.customer_code || customerRecord.customer_id,
      full_name: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      address: customerRecord.address
    };

    const {
      requestId,
      categoryId,
      category: bodyCategory,
      applianceId,
      area,
      preferredDate,
      preferredStart,
      preferredEnd
    } = req.body;

    // 2. Load Service Request
    let requestRecord = null;
    if (requestId) {
      const { data, error } = await systemClient.from('service_requests').select('*').eq('request_id', requestId).single();
      if (error || !data) return res.status(404).json({ success: false, message: 'Service request not found.' });
      if (data.customer_id !== customer.customer_code) return res.status(403).json({ success: false, message: 'Not authorized for this request.' });
      
      requestRecord = data;
    }

    const category = categoryId || bodyCategory || requestRecord?.category;
    const reqArea = area || requestRecord?.area;
    const date = preferredDate || requestRecord?.preferred_date;
    const start = preferredStart || requestRecord?.preferred_start;
    const end = preferredEnd || requestRecord?.preferred_end;

    if (!category || !reqArea || !date || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required request fields.' });
    }

    // 3. Independent Backend Agent-1 Logic
    const { data: allTechnicians, error: techErr } = await systemClient.from('technicians').select('*');
    if (techErr) throw techErr;

    // Fetch existing bookings to check for overlaps
    const { data: bookingsOnDate } = await systemClient
      .from('bookings')
      .select('technician_id, start_time, end_time, status')
      .eq('service_date', date)
      .neq('status', 'Cancelled');

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    const validBackendCandidates = [];
    
    // Filter candidates strictly
    for (const tech of (allTechnicians || [])) {
      if (!tech.technician_id || !tech.name || !tech.service_categories || !Array.isArray(tech.service_categories)) continue;
      if (!tech.is_available) continue;

      // Category matching
      const techCats = tech.service_categories.map(c => c.toLowerCase());
      if (!techCats.includes(category.toLowerCase())) continue;

      // Area matching
      if (tech.area && tech.area.toLowerCase() !== reqArea.toLowerCase()) continue;

      // Booking Overlap matching
      const techBookings = (bookingsOnDate || []).filter(b => b.technician_id === tech.technician_id);
      let hasConflict = false;
      for (const b of techBookings) {
        const bStart = toMinutes(b.start_time);
        const bEnd = toMinutes(b.end_time);
        if (bStart !== null && bEnd !== null && startMin !== null && endMin !== null) {
          if (startMin < bEnd && endMin > bStart) {
            hasConflict = true;
            break;
          }
        }
      }
      if (hasConflict) continue;

      validBackendCandidates.push(tech);
    }

    // Call SNS Agent 1
    let agentResponse = null;
    if (agent1WebhookUrl && !isDemo) {
      try {
        const payload = {
          customerId: customer.customer_code,
          customerName: customer.full_name,
          phone: customer.phone,
          email: customer.email,
          category,
          area: reqArea,
          preferredDate: date,
          preferredStart: start,
          preferredEnd: end,
          applianceId
        };
        const snsRes = await fetch(agent1WebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (snsRes.ok) {
          agentResponse = await snsRes.json();
        }
      } catch (e) {
        console.warn('SNS Agent 1 failed, falling back to backend matching', e);
      }
    }

    // Extract Agent 1 recommended technicians safely
    let snsCandidates = [];
    if (agentResponse?.technicians && Array.isArray(agentResponse.technicians)) {
      snsCandidates = agentResponse.technicians;
    } else if (agentResponse?.items?.[0]?.json?._responseData?.technicians) {
      snsCandidates = agentResponse.items[0].json._responseData.technicians;
    } else if (agentResponse?.items?.[0]?.json?.technicians) {
      snsCandidates = agentResponse.items[0].json.technicians;
    }

    const verifiedList = [];
    let rejectedCount = 0;
    const rejectionReasons = [];

    // Score and Verify
    if (snsCandidates.length > 0) {
      for (const snsTech of snsCandidates) {
        // Find matching tech in our validated backend candidates
        const dbTech = validBackendCandidates.find(t => t.technician_id === snsTech.technician_id);
        
        if (!dbTech) {
          rejectedCount++;
          rejectionReasons.push(`SNS tech ${snsTech.technician_id} failed factual backend validation (availability/area/category/conflict).`);
          continue;
        }

        // Calculate deterministic backend score
        const agentScore = snsTech.match_score || 0;
        let backendScore = 20 + 10 + (dbTech.rating * 10 || 40); // Category(20) + Area(10) + Rating(*10)
        
        verifiedList.push({
          technician_id: dbTech.technician_id,
          name: dbTech.name,
          service_categories: dbTech.service_categories,
          area: dbTech.area,
          hourly_rate: dbTech.hourly_rate,
          rating: dbTech.rating,
          availability: dbTech.availability,
          agent_score: agentScore,
          backend_score: backendScore,
          final_score: Math.max(agentScore, backendScore), // Or average, or strictly backend
          match_status: snsTech.match_status || 'Recommended',
          verification: {
            technician_exists: true,
            category_verified: true,
            area_verified: true,
            availability_verified: true,
            booking_conflict: false,
            agent_match: true
          }
        });
      }
    }

    // Fallback: If Agent 1 failed or all were rejected, use our deterministic list
    if (verifiedList.length === 0 && validBackendCandidates.length > 0) {
      for (const dbTech of validBackendCandidates.slice(0, 3)) { // Return top 3
        let backendScore = 20 + 10 + (dbTech.rating * 10 || 40);
        verifiedList.push({
          technician_id: dbTech.technician_id,
          name: dbTech.name,
          service_categories: dbTech.service_categories,
          area: dbTech.area,
          hourly_rate: dbTech.hourly_rate,
          rating: dbTech.rating,
          availability: dbTech.availability,
          agent_score: 0,
          backend_score: backendScore,
          final_score: backendScore,
          match_status: 'Recommended',
          verification: {
            technician_exists: true,
            category_verified: true,
            area_verified: true,
            availability_verified: true,
            booking_conflict: false,
            agent_match: false
          }
        });
      }
    }

    // Sort by final score descending
    verifiedList.sort((a, b) => b.final_score - a.final_score);

    console.log({
      agent_count: snsCandidates.length,
      backend_candidate_count: validBackendCandidates.length,
      verified_count: verifiedList.length,
      rejected_count: rejectedCount,
      rejection_reasons: rejectionReasons
    });

    if (verifiedList.length === 0) {
      return res.status(200).json({
        success: false,
        status: "NO_VERIFIED_TECHNICIANS",
        request_id: requestId,
        count: 0,
        technicians: [],
        message: "No verified technician is currently available for this service request."
      });
    }

    return res.status(200).json({
      success: true,
      status: "VERIFIED_MATCHES",
      request_id: requestId,
      count: verifiedList.length,
      source: agentResponse ? "backend_verified" : "backend_fallback",
      technicians: verifiedList
    });
    
  } catch (err) {
    console.error('Match Technicians API Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during matching.' });
  }
}
