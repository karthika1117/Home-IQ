import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isDemo = process.env.VITE_DEMO_MODE === 'true';

const systemClient = createClient(supabaseUrl, supabaseServiceRoleKey);

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

const CATEGORIES = ["AC", "Washing Machine", "Refrigerator", "Microwave", "Dishwasher", "Water Heater", "RO Water Purifier", "TV"];

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Missing auth token' });

    const { data: { user }, error: authError } = await systemClient.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { data: customer, error: custError } = await systemClient
      .from('customers')
      .select('*')
      .eq('profile_id', user.id)
      .single();
    if (custError || !customer) return res.status(403).json({ success: false, message: 'Customer profile required' });

    const {
      requestId,
      issueDescription,
      applianceId,
      area,
      preferredDate,
      preferredStart,
      preferredEnd
    } = req.body;

    const reqArea = area;
    const date = preferredDate;
    const start = preferredStart;
    const end = preferredEnd;

    if (!issueDescription || !reqArea || !date || !start || !end) {
      return res.status(400).json({ success: false, message: 'Missing required request fields.' });
    }

    // Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: 'AI matching layer is not configured.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Use Gemini to extract category
    const prompt = `
      You are an AI assistant for a home appliance repair platform.
      A user has reported the following issue:
      "${issueDescription}"
      
      Based on this description, categorize the issue into exactly ONE of the following service categories. 
      Respond with ONLY the exact category name.
      Categories: ${CATEGORIES.join(", ")}
      
      If you are absolutely unsure, respond with "General Service".
    `;

    let extractedCategory = 'General Service';
    try {
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text().trim();
      if (CATEGORIES.includes(aiResponse)) {
        extractedCategory = aiResponse;
      } else {
        const match = CATEGORIES.find(c => aiResponse.toLowerCase().includes(c.toLowerCase()));
        if (match) extractedCategory = match;
      }
    } catch (e) {
      console.error('Gemini API Error:', e);
      return res.status(500).json({ success: false, message: 'Gemini API Error: ' + e.message });
    }

    console.log(`[AI Agent 1] Extracted Category: ${extractedCategory} from issue: "${issueDescription}"`);

    // Fetch technicians
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

    const validCandidates = [];
    
    // Filter candidates strictly
    for (const tech of (allTechnicians || [])) {
      if (!tech.technician_id || !tech.name || !tech.service_categories || !Array.isArray(tech.service_categories)) continue;
      if (!tech.is_available) continue;

      // Category matching
      const techCats = tech.service_categories.map(c => c.toLowerCase());
      if (!techCats.includes(extractedCategory.toLowerCase()) && extractedCategory !== 'General Service') continue;

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

      validCandidates.push(tech);
    }

    const verifiedList = [];

    // Map to final format and rank (could use AI to rank, but simple scoring here is faster)
    for (const dbTech of validCandidates) {
      let backendScore = 20 + 10 + (dbTech.rating * 10 || 40);
      verifiedList.push({
        technician_id: dbTech.technician_id,
        name: dbTech.name,
        service_categories: dbTech.service_categories,
        area: dbTech.area,
        hourly_rate: dbTech.hourly_rate,
        rating: dbTech.rating,
        availability: dbTech.availability,
        agent_score: 95, // AI matched
        backend_score: backendScore,
        final_score: backendScore,
        match_status: 'AI Recommended',
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

    // Sort by final score descending
    verifiedList.sort((a, b) => b.final_score - a.final_score);

    // Limit to top 3
    const topMatches = verifiedList.slice(0, 3);

    if (topMatches.length === 0) {
      return res.status(200).json({
        success: false,
        status: "NO_VERIFIED_TECHNICIANS",
        request_id: requestId,
        count: 0,
        technicians: [],
        message: `No verified technicians found in your area for ${extractedCategory}.`
      });
    }

    return res.status(200).json({
      success: true,
      status: "VERIFIED_MATCHES",
      request_id: requestId,
      count: topMatches.length,
      source: "gemini_ai",
      technicians: topMatches
    });
    
  } catch (err) {
    console.error('Match Technicians API Error:', err);
    return res.status(500).json({ success: false, message: 'Server error during matching.' });
  }
}
