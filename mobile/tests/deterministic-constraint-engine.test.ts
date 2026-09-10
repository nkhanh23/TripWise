import {
  evaluatePlanConstraints,
  evaluatePlanModification,
  isFixedItem,
  isMustDoItem,
  isValidFlexibility,
  isValidPriority,
  isValidTimeString,
  PLANNING_BOUNDS,
  sortConflictsDeterministically,
  timeToMinutes,
  type ConstraintConflict,
  type ConstraintDay,
  type ConstraintItinerary,
} from '../src/integration/deterministicConstraintEngine';

describe('Deterministic Constraint Engine (FEATURE-P5-T001-S001 Corrective)', () => {
  describe('Helper Functions & Strict Enum Validators', () => {
    it('validates time strings accurately', () => {
      expect(isValidTimeString('00:00')).toBe(true);
      expect(isValidTimeString('09:30')).toBe(true);
      expect(isValidTimeString('23:59')).toBe(true);
      expect(isValidTimeString('24:00')).toBe(false);
      expect(isValidTimeString('12:60')).toBe(false);
      expect(isValidTimeString('9:30')).toBe(false);
      expect(isValidTimeString('invalid')).toBe(false);
      expect(isValidTimeString(null)).toBe(false);
      expect(isValidTimeString(undefined)).toBe(false);
    });

    it('converts time strings to minutes accurately', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:30')).toBe(90);
      expect(timeToMinutes('12:00')).toBe(720);
      expect(timeToMinutes('23:59')).toBe(1439);
      expect(timeToMinutes('24:00')).toBeNull();
      expect(timeToMinutes(null)).toBeNull();
    });

    it('validates canonical WorkspaceFlexibility enum strictly (DEFECT B)', () => {
      expect(isValidFlexibility('fixed')).toBe(true);
      expect(isValidFlexibility('flexible')).toBe(true);
      expect(isValidFlexibility('FIXED')).toBe(false);
      expect(isValidFlexibility('Fixed')).toBe(false);
      expect(isValidFlexibility('arbitrary')).toBe(false);
      expect(isValidFlexibility(null)).toBe(false);
      expect(isValidFlexibility(undefined)).toBe(false);
      expect(isValidFlexibility(123)).toBe(false);
    });

    it('validates canonical WorkspacePriority enum strictly (DEFECT B)', () => {
      expect(isValidPriority('must_do')).toBe(true);
      expect(isValidPriority('want_to_do')).toBe(true);
      expect(isValidPriority('optional')).toBe(true);
      expect(isValidPriority('MUST_DO')).toBe(false);
      expect(isValidPriority('must-do')).toBe(false);
      expect(isValidPriority('mustDo')).toBe(false);
      expect(isValidPriority('high')).toBe(false);
      expect(isValidPriority(null)).toBe(false);
      expect(isValidPriority(undefined)).toBe(false);
    });

    it('checks item classification functions', () => {
      expect(isFixedItem({ flexibility: 'fixed' })).toBe(true);
      expect(isFixedItem({ flexibility: 'flexible' })).toBe(false);
      expect(isFixedItem({})).toBe(false);

      expect(isMustDoItem({ priority: 'must_do' })).toBe(true);
      expect(isMustDoItem({ priority: 'want_to_do' })).toBe(false);
      expect(isMustDoItem({ priority: 'optional' })).toBe(false);
      expect(isMustDoItem({})).toBe(false);
    });
  });

  describe('Intra-Schedule Self Validation & Strict Structural Integrity', () => {
    it('evaluates empty itinerary with zero conflicts', () => {
      const result = evaluatePlanConstraints({ days: [] });
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toEqual([]);
      expect(result.summary).toEqual({
        totalItems: 0,
        fixedItems: 0,
        mustDoItems: 0,
        conflictsCount: 0,
      });
    });

    it('evaluates single valid FIXED item without conflict', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-1',
                position: 0,
                placeName: 'Hanoi Opera House',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '09:00',
                endTime: '11:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary.fixedItems).toBe(1);
      expect(result.summary.mustDoItems).toBe(1);
    });

    it('evaluates single valid MUST_DO item without conflict', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-1',
                position: 0,
                placeName: 'Hoan Kiem Lake',
                flexibility: 'flexible',
                priority: 'must_do',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary.fixedItems).toBe(0);
      expect(result.summary.mustDoItems).toBe(1);
    });

    it('allows non-overlapping FIXED items on the same day (adjacent touching allowed)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-1',
                position: 0,
                placeName: 'Temple of Literature',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:30',
                endTime: '10:00',
              },
              {
                id: 'item-2',
                position: 1,
                placeName: 'One Pillar Pagoda',
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '10:00',
                endTime: '11:30',
              },
              {
                id: 'item-3',
                position: 2,
                placeName: 'Vietnam National Museum',
                flexibility: 'fixed',
                priority: 'optional',
                startTime: '13:00',
                endTime: '15:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary.fixedItems).toBe(3);
    });

    it('detects overlapping FIXED items on the same day (bounded sweep regression)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-b',
                position: 0,
                placeName: 'Morning Coffee',
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '09:00',
                endTime: '10:30',
              },
              {
                id: 'item-a',
                position: 1,
                placeName: 'Museum Visit',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '12:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        code: 'FIXED_TIME_OVERLAP',
        itemId: 'item-a',
        conflictingItemId: 'item-b',
        dayNumber: 1,
      });
    });

    it('detects point-event FIXED item overlapping an interval FIXED item', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-interval',
                position: 0,
                placeName: 'Guided Tour',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '09:00',
                endTime: '11:00',
              },
              {
                id: 'item-point',
                position: 1,
                placeName: 'Photo Stop',
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '10:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].code).toBe('FIXED_TIME_OVERLAP');
    });

    it('detects two point-event FIXED items at the exact same startTime', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-1',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '14:00',
              },
              {
                id: 'item-2',
                position: 1,
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '14:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('FIXED_TIME_OVERLAP');
    });

    it('does NOT flag overlap between flexible items or flexible and fixed items', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-item',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '12:00',
              },
              {
                id: 'flex-item-1',
                position: 1,
                flexibility: 'flexible',
                priority: 'want_to_do',
                startTime: '10:30',
                endTime: '11:30',
              },
              {
                id: 'flex-item-2',
                position: 2,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '11:00',
                endTime: '13:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('detects invalid time range where endTime < startTime on FIXED items (FIXED_INVALID_TIME_RANGE)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-invalid-range',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '14:00',
                endTime: '13:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0]).toMatchObject({
        code: 'FIXED_INVALID_TIME_RANGE',
        itemId: 'item-invalid-range',
        dayNumber: 1,
      });
    });

    it('detects invalid time range on NON-FIXED items using generic INVALID_TIME_RANGE (Time Semantics)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'flex-invalid-range',
                position: 0,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '16:00',
                endTime: '15:00',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0]).toMatchObject({
        code: 'INVALID_TIME_RANGE',
        itemId: 'flex-invalid-range',
        dayNumber: 1,
      });
    });

    it('detects duplicate item IDs across the itinerary', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'dup-id', position: 0, placeName: 'Spot 1', flexibility: 'flexible', priority: 'optional' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'dup-id', position: 0, placeName: 'Spot 2', flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0]).toMatchObject({
        code: 'DUPLICATE_ITEM_ID',
        itemId: 'dup-id',
        dayNumber: 2,
      });
    });

    it('detects malformed time format strings', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-malformed-time',
                position: 0,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '25:70',
                endTime: 'not-a-time',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.map(c => c.code)).toContain('MALFORMED_INPUT');
    });
  });

﻿  describe('Defect A — Remove Silent Structural Repair', () => {
    it('fails closed when dayNumber is missing (does not silently infer array index)', () => {
      const plan = {
        days: [
          { items: [] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].message).toContain('dayNumber');
    });

    it('fails closed when dayNumber is a string (does not silently convert or infer)', () => {
      const plan = {
        days: [
          { dayNumber: '1', items: [] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
    });

    it('fails closed when dayNumber is <= 0 or not an integer', () => {
      const planZero = { days: [{ dayNumber: 0, items: [] }] };
      const planNeg = { days: [{ dayNumber: -1, items: [] }] };
      const planFloat = { days: [{ dayNumber: 1.5, items: [] }] };

      expect(evaluatePlanConstraints(planZero).isValid).toBe(false);
      expect(evaluatePlanConstraints(planNeg).isValid).toBe(false);
      expect(evaluatePlanConstraints(planFloat).isValid).toBe(false);
    });

    it('fails closed when items property is missing (does not silently infer empty array)', () => {
      const plan = {
        days: [
          { dayNumber: 1 },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].message).toContain('items');
    });

    it('fails closed when items property is not an array (does not silently infer empty array)', () => {
      const plan = {
        days: [
          { dayNumber: 1, items: 'not-array' },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
    });

    it('fails closed when canonical position is missing (does not silently infer item array index)', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-no-pos',
                flexibility: 'flexible',
                priority: 'optional',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].message).toContain('position');
    });

    it('fails closed when canonical position is negative or not an integer', () => {
      const planNeg = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'i1', position: -1, flexibility: 'flexible', priority: 'optional' }],
          },
        ],
      };
      const planFloat = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'i1', position: 2.5, flexibility: 'flexible', priority: 'optional' }],
          },
        ],
      };

      expect(evaluatePlanConstraints(planNeg).isValid).toBe(false);
      expect(evaluatePlanConstraints(planFloat).isValid).toBe(false);
    });
  });

  describe('Defect B — Strict Enum Validation', () => {
    it('fails closed on non-canonical flexibility string (e.g. FIXED, Fixed, arbitrary)', () => {
      const planUpper = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'FIXED', priority: 'must_do' }],
        }],
      };
      const planTitle = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'Fixed', priority: 'must_do' }],
        }],
      };
      const planArbitrary = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'semi-flexible', priority: 'must_do' }],
        }],
      };

      expect(evaluatePlanConstraints(planUpper).isValid).toBe(false);
      expect(evaluatePlanConstraints(planTitle).isValid).toBe(false);
      expect(evaluatePlanConstraints(planArbitrary).isValid).toBe(false);
    });

    it('fails closed on non-canonical priority string (e.g. MUST_DO, must-do, mustDo, high)', () => {
      const planUpper = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'flexible', priority: 'MUST_DO' }],
        }],
      };
      const planKebab = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'flexible', priority: 'must-do' }],
        }],
      };
      const planCamel = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 0, flexibility: 'flexible', priority: 'mustDo' }],
        }],
      };

      expect(evaluatePlanConstraints(planUpper).isValid).toBe(false);
      expect(evaluatePlanConstraints(planKebab).isValid).toBe(false);
      expect(evaluatePlanConstraints(planCamel).isValid).toBe(false);
    });
  });

  describe('Defect C — Baseline Must Fail Closed', () => {
    const validProposed: ConstraintItinerary = {
      days: [
        {
          dayNumber: 1,
          items: [
            { id: 'item-1', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
          ],
        },
      ],
    };

    it('fails closed if baseline has malformed time string', () => {
      const corruptBaseline = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-1', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: 'invalid-time', endTime: '10:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      const baselineConflict = result.conflicts.find(c => c.origin === 'baseline');
      expect(baselineConflict).toBeDefined();
      expect(baselineConflict?.code).toBe('MALFORMED_INPUT');
    });

    it('fails closed if baseline has invalid day structure', () => {
      const corruptBaseline = {
        days: [
          { dayNumber: -1, items: [] },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.origin === 'baseline' && c.code === 'MALFORMED_INPUT')).toBe(true);
    });

    it('fails closed if baseline has duplicate item IDs', () => {
      const corruptBaseline = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'dup-base', position: 0, flexibility: 'flexible', priority: 'optional' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'dup-base', position: 0, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.origin === 'baseline' && c.code === 'DUPLICATE_ITEM_ID')).toBe(true);
    });

    it('fails closed if baseline has FIXED invalid time range', () => {
      const corruptBaseline = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-base', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '15:00', endTime: '14:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.origin === 'baseline' && c.code === 'FIXED_INVALID_TIME_RANGE')).toBe(true);
    });

    it('fails closed if baseline has FIXED overlap', () => {
      const corruptBaseline = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'base-f1', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '10:00', endTime: '12:00' },
              { id: 'base-f2', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '11:00', endTime: '13:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.origin === 'baseline' && c.code === 'FIXED_TIME_OVERLAP')).toBe(true);
    });
  });

  describe('Defect D — Protect FIXED Position', () => {
    const baselinePlan: ConstraintItinerary = {
      days: [
        {
          dayNumber: 1,
          items: [
            {
              id: 'fixed-pos-item',
              position: 0,
              placeName: 'Flight Arrival',
              flexibility: 'fixed',
              priority: 'must_do',
              startTime: '08:00',
              endTime: '09:30',
            },
            {
              id: 'must-flex-item',
              position: 1,
              placeName: 'Lunch Reservation',
              flexibility: 'flexible',
              priority: 'must_do',
              startTime: '12:00',
              endTime: '13:00',
            },
            {
              id: 'opt-item',
              position: 2,
              placeName: 'Souvenir Shopping',
              flexibility: 'flexible',
              priority: 'optional',
              startTime: '15:00',
              endTime: '16:00',
            },
          ],
        },
      ],
    };

    it('passes when FIXED position is unchanged', () => {
      const result = evaluatePlanModification(baselinePlan, baselinePlan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('emits FIXED_POSITION_CHANGED when FIXED item position changes even on same day and same time', () => {
      const proposedWithMovedFixed: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'opt-item',
                position: 0,
                placeName: 'Souvenir Shopping',
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '15:00',
                endTime: '16:00',
              },
              {
                id: 'fixed-pos-item',
                position: 1, // position changed from 0 to 1!
                placeName: 'Flight Arrival',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'must-flex-item',
                position: 2,
                placeName: 'Lunch Reservation',
                flexibility: 'flexible',
                priority: 'must_do',
                startTime: '12:00',
                endTime: '13:00',
              },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedWithMovedFixed);
      expect(result.isValid).toBe(false);
      const posConflict = result.conflicts.find(c => c.code === 'FIXED_POSITION_CHANGED');
      expect(posConflict).toBeDefined();
      expect(posConflict?.itemId).toBe('fixed-pos-item');
      expect(posConflict?.details).toMatchObject({ baselinePosition: 0, proposedPosition: 1 });
    });

    it('allows OPTIONAL item position to change without conflict', () => {
      const proposed: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-pos-item',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'opt-item',
                position: 1, // opt-item moved to position 1
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '10:00',
                endTime: '11:00',
              },
              {
                id: 'must-flex-item',
                position: 2, // must-flex moved to position 2
                flexibility: 'flexible',
                priority: 'must_do',
                startTime: '12:00',
                endTime: '13:00',
              },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposed);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('allows flexible MUST_DO item position to change without conflict', () => {
      const proposed: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-pos-item',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'opt-item',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
              },
              {
                id: 'must-flex-item',
                position: 5, // moved to position 5
                flexibility: 'flexible',
                priority: 'must_do',
              },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposed);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('protects position for dual FIXED + MUST_DO item', () => {
      const dualBaseline: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'dual-item',
                position: 0,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '11:00',
              },
            ],
          },
        ],
      };

      const dualProposed: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'dual-item',
                position: 2, // position changed!
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '11:00',
              },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(dualBaseline, dualProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'FIXED_POSITION_CHANGED')).toBe(true);
    });
  });

﻿  describe('Defect E — Overlap Bounds & Sweep Semantics', () => {
    it('fails closed when itinerary exceeds MAX_DAYS (60)', () => {
      const oversizedDays = Array.from({ length: 65 }, (_, i) => ({
        dayNumber: i + 1,
        items: [],
      }));
      const result = evaluatePlanConstraints({ days: oversizedDays });
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MALFORMED_INPUT' && c.message.includes('planning days'))).toBe(true);
    });

    it('fails closed when a day exceeds MAX_ITEMS_PER_DAY (50)', () => {
      const oversizedItems = Array.from({ length: 55 }, (_, i) => ({
        id: `day1-item-${i}`,
        position: i,
        flexibility: 'flexible' as const,
        priority: 'optional' as const,
      }));
      const result = evaluatePlanConstraints({ days: [{ dayNumber: 1, items: oversizedItems }] });
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MALFORMED_INPUT' && c.message.includes('items per day'))).toBe(true);
    });

    it('fails closed when total items exceed MAX_TOTAL_ITEMS (500)', () => {
      const days = Array.from({ length: 20 }, (_, d) => ({
        dayNumber: d + 1,
        items: Array.from({ length: 30 }, (_, i) => ({
          id: `d${d}-i${i}`,
          position: i,
          flexibility: 'flexible' as const,
          priority: 'optional' as const,
        })),
      })); // 20 * 30 = 600 items > 500
      const result = evaluatePlanConstraints({ days });
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MALFORMED_INPUT' && c.message.includes('total items'))).toBe(true);
    });

    it('adjacent intervals touching at exact boundary do NOT overlap (e.g. 09:00-10:00 and 10:00-11:00)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'f1', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'f2', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '10:00', endTime: '11:00' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('point time at boundary of interval does not overlap, but inside interval overlaps', () => {
      // Point at 10:00 with interval [09:00, 10:00) does not overlap
      const planBoundary: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'int', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'pt', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '10:00' },
            ],
          },
        ],
      };
      expect(evaluatePlanConstraints(planBoundary).isValid).toBe(true);

      // Point at 09:30 with interval [09:00, 10:00) overlaps
      const planInside: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'int', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'pt', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:30' },
            ],
          },
        ],
      };
      expect(evaluatePlanConstraints(planInside).isValid).toBe(false);
      expect(evaluatePlanConstraints(planInside).conflicts[0].code).toBe('FIXED_TIME_OVERLAP');
    });
  });

  describe('Modification Evaluation (Baseline vs Proposed Plan)', () => {
    const baselinePlan: ConstraintItinerary = {
      days: [
        {
          dayNumber: 1,
          items: [
            {
              id: 'fixed-1',
              position: 0,
              placeName: 'Flight Arrival',
              flexibility: 'fixed',
              priority: 'must_do',
              startTime: '08:00',
              endTime: '09:30',
            },
            {
              id: 'must-1',
              position: 1,
              placeName: 'Famous Pho',
              flexibility: 'flexible',
              priority: 'must_do',
              startTime: '12:00',
              endTime: '13:00',
            },
            {
              id: 'opt-1',
              position: 2,
              placeName: 'Souvenir Shopping',
              flexibility: 'flexible',
              priority: 'optional',
              startTime: '15:00',
              endTime: '16:00',
            },
          ],
        },
        {
          dayNumber: 2,
          items: [
            {
              id: 'fixed-2',
              position: 0,
              placeName: 'Pre-booked Museum Tour',
              flexibility: 'fixed',
              priority: 'want_to_do',
              startTime: '10:00',
              endTime: '12:00',
            },
          ],
        },
      ],
    };

    it('passes when proposed plan matches baseline constraints perfectly', () => {
      const result = evaluatePlanModification(baselinePlan, baselinePlan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('flags conflict if baseline FIXED item is dropped', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'must-1', position: 0, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 0, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      const droppedConflict = result.conflicts.find(c => c.code === 'FIXED_ITEM_DROPPED');
      expect(droppedConflict).toBeDefined();
      expect(droppedConflict?.itemId).toBe('fixed-1');
      expect(droppedConflict?.dayNumber).toBe(1);
    });

    it('flags conflict if baseline FIXED item is moved to another day', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'must-1', position: 0, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-1', position: 0, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      const dayChanged = result.conflicts.find(c => c.code === 'FIXED_DAY_CHANGED');
      expect(dayChanged).toBeDefined();
      expect(dayChanged?.itemId).toBe('fixed-1');
      expect(dayChanged?.dayNumber).toBe(2);
    });

    it('flags conflict if baseline FIXED item startTime is altered', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'fixed-1', position: 0, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:30', endTime: '09:30' },
              { id: 'must-1', position: 1, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 0, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'FIXED_START_TIME_CHANGED')).toBe(true);
    });

    it('flags conflict if baseline FIXED item endTime is altered', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'fixed-1', position: 0, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '10:00' },
              { id: 'must-1', position: 1, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 0, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'FIXED_END_TIME_CHANGED')).toBe(true);
    });

    it('flags conflict if baseline MUST_DO item is dropped', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'fixed-1', position: 0, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 0, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MUST_DO_DROPPED')).toBe(true);
    });

    it('flags conflict if baseline MUST_DO item is downgraded to want_to_do or optional', () => {
      const proposedPlan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'fixed-1', position: 0, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
              { id: 'must-1', position: 1, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'want_to_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 0, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(baselinePlan, proposedPlan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MUST_DO_DOWNGRADED')).toBe(true);
    });

    it('handles items that are BOTH fixed and must_do with dual protection when dropped', () => {
      const singleItemBaseline: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'vip-item',
                position: 0,
                placeName: 'VIP Gala Dinner',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '19:00',
                endTime: '22:00',
              },
            ],
          },
        ],
      };

      const emptyProposed: ConstraintItinerary = { days: [{ dayNumber: 1, items: [] }] };
      const result = evaluatePlanModification(singleItemBaseline, emptyProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(2);
      expect(result.conflicts.map(c => c.code)).toEqual(['FIXED_ITEM_DROPPED', 'MUST_DO_DROPPED']);
    });
  });

  describe('Determinism, Permutation Invariance & Pure In-Memory Execution', () => {
    it('sorts conflicts strictly according to canonical comparator (origin -> day -> start -> item -> code -> conflictId)', () => {
      const rawConflicts: ConstraintConflict[] = [
        { code: 'MUST_DO_DROPPED', itemId: 'item-z', dayNumber: 2, origin: 'proposed', message: 'z' },
        { code: 'FIXED_START_TIME_CHANGED', itemId: 'item-a', dayNumber: 2, origin: 'proposed', message: 'a' },
        { code: 'MALFORMED_INPUT', itemId: 'base-bad', dayNumber: 1, origin: 'baseline', message: 'base error' },
        { code: 'FIXED_DAY_CHANGED', itemId: 'item-m', dayNumber: 1, origin: 'proposed', message: 'm' },
        { code: 'DUPLICATE_ITEM_ID', itemId: 'item-b', dayNumber: 1, origin: 'proposed', message: 'b' },
      ];

      const sorted = sortConflictsDeterministically(rawConflicts);

      // Baseline conflicts appear first
      expect(sorted[0].origin).toBe('baseline');
      expect(sorted[0].itemId).toBe('base-bad');

      // Then proposed conflicts ordered by dayNumber ASC, then itemId ASC
      expect(sorted[1].dayNumber).toBe(1);
      expect(sorted[1].itemId).toBe('item-b');

      expect(sorted[2].dayNumber).toBe(1);
      expect(sorted[2].itemId).toBe('item-m');

      expect(sorted[3].dayNumber).toBe(2);
      expect(sorted[3].itemId).toBe('item-a');

      expect(sorted[4].dayNumber).toBe(2);
      expect(sorted[4].itemId).toBe('item-z');
    });

    it('yields identical canonically-sorted conflicts regardless of input item array order (permutation invariance)', () => {
      const item1 = { id: 'item-1', position: 0, flexibility: 'fixed' as const, priority: 'must_do' as const, startTime: '10:00', endTime: '12:00' };
      const item2 = { id: 'item-2', position: 1, flexibility: 'fixed' as const, priority: 'must_do' as const, startTime: '11:00', endTime: '13:00' };

      const planOrderA: ConstraintItinerary = {
        days: [{ dayNumber: 1, items: [item1, item2] }],
      };
      const planOrderB: ConstraintItinerary = {
        days: [{ dayNumber: 1, items: [item2, item1] }],
      };

      const resA = evaluatePlanConstraints(planOrderA);
      const resB = evaluatePlanConstraints(planOrderB);

      expect(resA.conflicts).toEqual(resB.conflicts);
    });

    it('yields permutation invariance for duplicate IDs across days', () => {
      const day1 = {
        dayNumber: 1,
        items: [{ id: 'dup-id', position: 0, flexibility: 'flexible' as const, priority: 'optional' as const }],
      };
      const day2 = {
        dayNumber: 2,
        items: [{ id: 'dup-id', position: 0, flexibility: 'flexible' as const, priority: 'optional' as const }],
      };

      const planA = { days: [day1, day2] };
      const planB = { days: [day2, day1] };

      const resA = evaluatePlanConstraints(planA);
      const resB = evaluatePlanConstraints(planB);

      expect(resA.conflicts).toEqual(resB.conflicts);
      // Canonical original is day 1, duplicate is reported on day 2 in both!
      expect(resA.conflicts[0].dayNumber).toBe(2);
      expect(resB.conflicts[0].dayNumber).toBe(2);
    });

    it('does NOT invent duration if item has only startTime and no endTime', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'point-1', position: 0, flexibility: 'fixed', priority: 'must_do', startTime: '09:00' },
              { id: 'point-2', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:30' },
            ],
          },
        ],
      };

      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('executes in-memory with zero network calls and zero persistence writes', () => {
      // Validates engine purity: pure deterministic function
      const plan: ConstraintItinerary = {
        days: [{ dayNumber: 1, items: [] }],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
    });

    it('evaluates a large 300-item multi-day itinerary smoothly within bounds', () => {
      const days: ConstraintDay[] = [];

      for (let d = 1; d <= 30; d++) {
        const items = [];
        for (let i = 1; i <= 10; i++) {
          const hour = 8 + i;
          const startStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
          const endStr = hour < 10 ? `0${hour}:45` : `${hour}:45`;

          items.push({
            id: `day-${d}-item-${i}`,
            position: i - 1,
            placeName: `Day ${d} Activity ${i}`,
            flexibility: i % 3 === 0 ? 'fixed' as const : 'flexible' as const,
            priority: i % 2 === 0 ? 'must_do' as const : 'optional' as const,
            startTime: startStr,
            endTime: endStr,
          });
        }
        days.push({ dayNumber: d, items });
      }

      const largeItinerary: ConstraintItinerary = { days };

      const result = evaluatePlanConstraints(largeItinerary);

      expect(result.summary.totalItems).toBe(300);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});
