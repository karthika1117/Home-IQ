import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTechnicianCategory, buildAgent1Payload } from '../src/services/agent1Service.js';

test('normalizeTechnicianCategory maps split AC appliance to AC', () => {
  assert.equal(normalizeTechnicianCategory('LG Split AC'), 'AC');
  assert.equal(normalizeTechnicianCategory('Samsung Refrigerator'), 'Refrigerator');
  assert.equal(normalizeTechnicianCategory('Front Load Washing Machine'), 'Washing Machine');
});

test('buildAgent1Payload keeps serviceType separate from technician category', () => {
  const payload = buildAgent1Payload({
    customerId: 'CUS002',
    serviceType: 'Damage',
    category: 'AC',
    area: 'Coimbatore',
    preferredDate: '2026-09-29',
    preferredStart: '10:00',
    preferredEnd: '14:00',
  });

  assert.deepEqual(payload, {
    customerId: 'CUS002',
    serviceType: 'Damage',
    category: 'AC',
    area: 'Coimbatore',
    preferredDate: '2026-09-29',
    preferredStart: '10:00',
    preferredEnd: '14:00',
  });
});
