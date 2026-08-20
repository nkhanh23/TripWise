import assert from 'node:assert/strict';

import { buildTripPrompt, tripPlannerSystemInstruction } from './prompt.ts';

Deno.test('prompt preserves validated input as JSON data', () => {
  const prompt = buildTripPrompt({
    destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02',
    preferences: ['biển', 'ẩm thực'], notes: 'Không đi quá dày',
  });
  assert.match(prompt, /"destination":"Nha Trang"/);
  assert.match(prompt, /"preferences":\["biển","ẩm thực"\]/);
});

Deno.test('system instruction carries the useful legacy safety and pacing rules', () => {
  assert.match(tripPlannerSystemInstruction, /Không xếp lịch quá dày/);
  assert.match(tripPlannerSystemInstruction, /Không bịa tọa độ/);
  assert.match(tripPlannerSystemInstruction, /estimatedCost chỉ là ước tính/);
  assert.match(tripPlannerSystemInstruction, /Google Places xác minh ở phase sau/);
});
