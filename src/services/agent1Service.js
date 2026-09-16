import { supabase } from '../lib/supabaseClient.js';

function toMinutes(value) {
  if (!value || typeof value !== 'string') return null;

  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function normalizeTechnicianCategory(value) {
  const source = String(value ?? '').trim();
  if (!source) return null;

  const normalized = source.toLowerCase();
  const knownCategories = ['ac', 'washing machine', 'refrigerator'];

  if (knownCategories.includes(normalized)) {
    return normalized === 'ac' ? 'AC' : normalized === 'washing machine' ? 'Washing Machine' : 'Refrigerator';
  }

  if (normalized.includes('washing machine') || normalized.includes('washer') || normalized.includes('laundry machine')) {
    return 'Washing Machine';
  }

  if (normalized.includes('refrigerator') || normalized.includes('fridge') || normalized.includes('freezer')) {
    return 'Refrigerator';
  }

  if (normalized.includes('split ac') || normalized.includes('air conditioner') || normalized.includes('air-conditioner') || normalized.includes('inverter ac') || /\bac\b/.test(normalized)) {
    return 'AC';
  }

  return null;
}

export function resolveTechnicianCategory(applianceLike, fallbackCategory = '') {
  const sourceParts = [
    applianceLike?.brand,
    applianceLike?.appliance_type,
    applianceLike?.model,
    applianceLike?.name,
    fallbackCategory,
  ].filter(Boolean);

  for (const candidate of sourceParts) {
    const category = normalizeTechnicianCategory(candidate);
    if (category) return category;
  }

  return normalizeTechnicianCategory(fallbackCategory) || 'AC';
}

export function buildAgent1Payload(request) {
  const customerId = String(request?.customerId ?? '').trim();
  const serviceType = String(request?.serviceType ?? '').trim();
  const customerName = String(request?.customerName ?? '').trim();
  const phone = String(request?.phone ?? '').trim();
  const email = String(request?.email ?? '').trim();
  const category = String(request?.category ?? '').trim();
  const applianceId = request?.applianceId ?? null;
  const address = String(request?.address ?? '').trim();
  const area = String(request?.area ?? '').trim();
  const preferredDate = String(request?.preferredDate ?? '').trim();
  const preferredStart = String(request?.preferredStart ?? '').trim();
  const preferredEnd = String(request?.preferredEnd ?? '').trim();

  const payload = {
    customerId,
    serviceType,
    category,
    area,
    preferredDate,
    preferredStart,
    preferredEnd,
  };

  if (customerName) payload.customerName = customerName;
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (applianceId !== null) payload.applianceId = applianceId;
  if (address) payload.address = address;

  return payload;
}

export function buildBookingConfirmationPayload(request) {
  return {
    requestId: String(request?.requestId ?? '').trim(),
    customerId: String(request?.customerId ?? '').trim(),
    technicianId: String(request?.technicianId ?? '').trim(),
    applianceId: request?.applianceId ?? null,
    category: String(request?.category ?? '').trim(),
    area: String(request?.area ?? '').trim(),
    preferredDate: String(request?.preferredDate ?? '').trim(),
    preferredStart: String(request?.preferredStart ?? '').trim(),
    preferredEnd: String(request?.preferredEnd ?? '').trim(),
  };
}

export function validateAgent1Request(request) {
  const customerId = request?.customerId?.trim();
  const customerName = request?.customerName?.trim();
  const category = request?.category?.trim();
  const area = request?.area?.trim();
  const preferredDate = request?.preferredDate?.trim();
  const preferredStart = request?.preferredStart?.trim();
  const preferredEnd = request?.preferredEnd?.trim();

  if (!customerId) return 'Your customer account could not be loaded. Please complete your account setup.';
  if (!customerName) return 'Customer name is required.';
  if (!category) return 'Service category is required.';
  if (!area) return 'Area is required.';
  if (!preferredDate) return 'Preferred date is required.';
  if (!preferredStart) return 'Preferred start time is required.';
  if (!preferredEnd) return 'Preferred end time is required.';

  const startMinutes = toMinutes(preferredStart);
  const endMinutes = toMinutes(preferredEnd);

  if (startMinutes == null || endMinutes == null) {
    return 'Please enter valid preferred times.';
  }

  if (startMinutes >= endMinutes) {
    return 'Preferred start time must be earlier than the preferred end time.';
  }

  return null;
}

export async function sendServiceRequestToAgent1(request) {
  const webhookUrl = import.meta.env.VITE_AGENT1_WEBHOOK_URL;
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  if (!webhookUrl && !isDemo) {
    throw new Error('Service matching is unavailable right now. Please try again later.');
  }

  const validationMessage = validateAgent1Request(request);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const payload = buildAgent1Payload(request);

  if (isDemo && !webhookUrl) {
    // Dynamically fetch a real technician for the mock to ensure DB relationships hold
    const { data: realTechs } = await supabase.from('technicians').select('*').limit(1);
    const mockTech = realTechs?.[0] || { technician_id: "fallback" };
    
    // Mock response for Agent 1
    return {
      success: true,
      status: "Technicians Found",
      count: 1,
      message: "Technicians successfully matched.",
      technicians: [{
        technician_id: mockTech.technician_id,
        name: mockTech.name || "Demo Technician",
        service_categories: [request.category || "AC"],
        area: request.area || "Demo Area",
        hourly_rate: 400,
        rating: 4.8,
        availability: {
          "Monday-Friday": ["09:00-18:00"]
        },
        match_score: 95,
        match_status: "Recommended"
      }]
    };
  }

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to contact the service matching system. Please try again.');
  }

  if (!response.ok) {
    throw new Error('Unable to contact the service matching system. Please try again.');
  }

  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    return {
      success: false,
      message: 'Unable to contact the service matching system. Please try again.',
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      message: 'Unable to contact the service matching system. Please try again.',
    };
  }

  return data;
}

export function validateBookingConfirmationRequest(request) {
  const required = [
    'requestId',
    'customerId',
    'technicianId',
    'category',
    'area',
    'preferredDate',
    'preferredStart',
    'preferredEnd',
  ];

  for (const field of required) {
    const value = String(request?.[field] ?? '').trim();
    if (!value) return `Missing required field: ${field}`;
  }

  return null;
}



export async function sendBookingConfirmationToAgent1(request) {
  const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta && import.meta.env ? import.meta.env : {});
  const webhookUrl = env.VITE_BOOKING_CONFIRM_WEBHOOK_URL || (import.meta?.env?.VITE_BOOKING_CONFIRM_WEBHOOK_URL);
  const isDemo = import.meta?.env?.VITE_DEMO_MODE === 'true';
  
  if (!webhookUrl && !isDemo) {
    throw new Error('Booking confirmation is unavailable right now. Please try again later.');
  }

  const validationMessage = validateBookingConfirmationRequest(request);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const payload = buildBookingConfirmationPayload(request);
  
  if (isDemo && !webhookUrl) {
    // Mock response for Booking Confirmation
    return {
      success: true,
      status: 'Booking Confirmed',
      bookingId: 'demo-booking-' + Date.now(),
      technicianName: 'Demo Technician',
      preferredDate: request.preferredDate,
      preferredStart: request.preferredStart,
      preferredEnd: request.preferredEnd,
      area: request.area
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to contact the booking system. Please try again.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const parsed = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
    const message = parsed?.error || parsed?.message || 'Unable to contact the booking system. Please try again.';
    return {
      success: false,
      message,
    };
  }

  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    return {
      success: false,
      message: 'Unable to contact the booking system. Please try again.',
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      message: 'Unable to contact the booking system. Please try again.',
    };
  }

  return data;
}
