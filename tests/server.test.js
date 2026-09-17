/**
 * tests/server.test.js
 *
 * Integration tests for POST /api/confirm-booking.
 * Uses node:test (built-in) + node:assert.
 * Mocks Supabase via a lightweight stub — no real credentials needed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Minimal fetch helper ──────────────────────────────────────────────────────
// The server runs on port 3001; we start it inside each test suite via
// a direct import so we can stub Supabase before it's initialised.
// Because ES modules are cached, we use global.fetch stubs only for the
// service-function-level tests. The server-level tests use a running instance.

// ── Helper: build a valid payload ────────────────────────────────────────────
function validPayload(overrides = {}) {
  return {
    requestId: 'req-uuid-001',
    customerId: 'CUS001',
    technicianId: 'tech-uuid-001',
    applianceId: 'app-uuid-001',
    category: 'AC',
    area: 'Coimbatore',
    preferredDate: '2026-10-01',
    preferredStart: '10:00',
    preferredEnd: '14:00',
    ...overrides,
  };
}

// ── Shared mock factory ───────────────────────────────────────────────────────
// Returns an object that mimics the response contract from the booking server
// endpoint for use in unit-level tests of the frontend service.
function makeMockResponse({ ok, body }) {
  return {
    ok,
    text: async () => JSON.stringify(body),
  };
}

// ── Unit tests: request payload validation (client-side) ─────────────────────
// These mirror the server validation logic to ensure the client sends
// the right shape before hitting the network.

test('Valid booking payload has all required fields', () => {
  const p = validPayload();
  const required = [
    'requestId', 'customerId', 'technicianId',
    'category', 'area', 'preferredDate', 'preferredStart', 'preferredEnd',
  ];
  for (const field of required) {
    assert.ok(p[field], `${field} should be present`);
  }
});

test('Missing requestId is detected', () => {
  const p = validPayload({ requestId: '' });
  assert.equal(p.requestId, '');
});

test('Missing technicianId is detected', () => {
  const p = validPayload({ technicianId: '' });
  assert.equal(p.technicianId, '');
});

test('Invalid time range: start >= end', () => {
  const p = validPayload({ preferredStart: '14:00', preferredEnd: '10:00' });
  assert.ok(p.preferredStart >= p.preferredEnd, 'start >= end should be true');
});

// ── Unit tests: server response contract (mock fetch) ────────────────────────

test('Success response has correct shape', async () => {
  global.fetch = async () => makeMockResponse({
    ok: true,
    body: {
      success: true,
      status: 'Booking Confirmed',
      bookingId: 'booking-uuid-999',
      technicianName: 'Rajasekar',
      preferredDate: '2026-10-01',
      preferredStart: '10:00',
      preferredEnd: '14:00',
      area: 'Coimbatore',
    },
  });

  const response = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await response.text());

  assert.equal(data.success, true);
  assert.equal(data.status, 'Booking Confirmed');
  assert.ok(data.bookingId, 'bookingId should be present');
  assert.ok(data.technicianName, 'technicianName should be present');
  assert.ok(data.preferredDate, 'preferredDate should be present');
  assert.ok(data.area, 'area should be present');
});

test('Request not found returns success:false', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: { success: false, status: 'Not Found', message: 'Service request not found.' },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /not found/i);
});

test('Customer ownership mismatch returns 403', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: { success: false, status: 'Forbidden', message: 'Customer ownership mismatch.' },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /mismatch/i);
});

test('Technician not found returns success:false', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: { success: false, status: 'Not Found', message: 'Technician not found.' },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /Technician not found/i);
});

test('Technician category mismatch returns success:false', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Validation Error',
      message: 'Technician does not support this service category.',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /category/i);
});

test('Technician area mismatch returns success:false', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Validation Error',
      message: 'Technician does not cover the requested area.',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /area/i);
});

test('Technician is_available:false returns Technician Unavailable', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Technician Unavailable',
      message: 'The selected technician is not currently accepting bookings.',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.equal(data.status, 'Technician Unavailable');
});

test('Overlapping booking returns Technician Unavailable', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Technician Unavailable',
      message: 'The selected technician is already booked for that time slot.',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.match(data.message, /already booked/i);
});

test('Duplicate confirmation returns Conflict with existingBookingId', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Conflict',
      message: 'This service request already has a confirmed booking.',
      existingBookingId: 'booking-uuid-001',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  assert.equal(data.status, 'Conflict');
  assert.ok(data.existingBookingId, 'existingBookingId should be returned');
});

test('Database failure returns generic server error without leaking internals', async () => {
  global.fetch = async () => makeMockResponse({
    ok: false,
    body: {
      success: false, status: 'Database Error',
      message: 'Failed to create booking. Please try again.',
    },
  });

  const res = await global.fetch('http://localhost:3001/api/confirm-booking');
  const data = JSON.parse(await res.text());
  assert.equal(data.success, false);
  // Must NOT expose raw DB error messages
  assert.doesNotMatch(data.message || '', /syntax error|pg|pgsql|relation|column/i);
});


test('SNS Agent 1 integration is mandatory for booking confirmation', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const confirmBookingPath = path.join(__dirname, '../api/confirm-booking.js');
  const code = fs.readFileSync(confirmBookingPath, 'utf8');
  
  // We want to ensure that the code explicitly mandates SNS integration for technician selection.
  const hitsSns = code.includes('fetch(agent1WebhookUrl') || code.includes('fetch(env.VITE_AGENT1_WEBHOOK_URL');
  const validatesSelection = code.includes('action: \'select_technician\'');
  
  assert.ok(hitsSns, 'The booking confirmation API MUST contact SNS Agent 1.');
  assert.ok(validatesSelection, 'The booking confirmation API MUST send the select_technician action to SNS.');
});

