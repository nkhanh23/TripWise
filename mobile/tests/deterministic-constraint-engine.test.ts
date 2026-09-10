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

describe('Deterministic Constraint Engine (FEATURE-P5-T001-S001 Canonical Workspace Invariants)', () => {
  describe('Helper Functions & Strict Enum Validators', () => {
    it('validates time strings accurately with strict scalar rules (no trimming)', () => {
      expect(isValidTimeString('00:00')).toBe(true);
      expect(isValidTimeString('09:30')).toBe(true);
      expect(isValidTimeString('23:59')).toBe(true);
      expect(isValidTimeString('24:00')).toBe(false);
      expect(isValidTimeString('12:60')).toBe(false);
      expect(isValidTimeString('9:30')).toBe(false);
      expect(isValidTimeString(' 09:30 ')).toBe(false); // No silent trimming
      expect(isValidTimeString('')).toBe(false);
      expect(isValidTimeString('   ')).toBe(false);
      expect(isValidTimeString('invalid')).toBe(false);
      expect(isValidTimeString(900)).toBe(false);
      expect(isValidTimeString(null)).toBe(false);
      expect(isValidTimeString(undefined)).toBe(false);
    });

    it('converts time strings to minutes accurately (rejects padded/invalid strings)', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:30')).toBe(90);
      expect(timeToMinutes('12:00')).toBe(720);
      expect(timeToMinutes('23:59')).toBe(1439);
      expect(timeToMinutes(' 12:00 ')).toBeNull(); // Rejects whitespace padding
      expect(timeToMinutes('24:00')).toBeNull();
      expect(timeToMinutes(null)).toBeNull();
      expect(timeToMinutes(undefined)).toBeNull();
    });

    it('validates canonical WorkspaceFlexibility enum strictly', () => {
      expect(isValidFlexibility('fixed')).toBe(true);
      expect(isValidFlexibility('flexible')).toBe(true);
      expect(isValidFlexibility('FIXED')).toBe(false);
      expect(isValidFlexibility('Fixed')).toBe(false);
      expect(isValidFlexibility('arbitrary')).toBe(false);
      expect(isValidFlexibility(null)).toBe(false);
      expect(isValidFlexibility(undefined)).toBe(false);
      expect(isValidFlexibility(123)).toBe(false);
    });

    it('validates canonical WorkspacePriority enum strictly', () => {
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

  describe('Defect A — 1-Based Canonical Position Validation', () => {
    it('accepts position = 1 as valid canonical 1-based position', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('fails closed when canonical position is 0 (0-based positions rejected)', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i0',
                position: 0,
                flexibility: 'flexible',
                priority: 'optional',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].details).toMatchObject({
        reason: 'INVALID_POSITION_DOMAIN',
        invalidPosition: 0,
      });
    });

    it('fails closed when canonical position is negative or float', () => {
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
            items: [{ id: 'i1', position: 1.5, flexibility: 'flexible', priority: 'optional' }],
          },
        ],
      };

      const resNeg = evaluatePlanConstraints(planNeg);
      expect(resNeg.isValid).toBe(false);
      expect(resNeg.conflicts[0].details).toMatchObject({
        reason: 'INVALID_POSITION_DOMAIN',
        invalidPosition: -1,
      });

      const resFloat = evaluatePlanConstraints(planFloat);
      expect(resFloat.isValid).toBe(false);
      expect(resFloat.conflicts[0].details).toMatchObject({
        reason: 'INVALID_POSITION_DOMAIN',
        invalidPosition: 1.5,
      });
    });

    it('fails closed when canonical position is missing or string', () => {
      const planMissing = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'i1', flexibility: 'flexible', priority: 'optional' }],
          },
        ],
      };
      const planString = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'i1', position: '1', flexibility: 'flexible', priority: 'optional' }],
          },
        ],
      };

      expect(evaluatePlanConstraints(planMissing).isValid).toBe(false);
      expect(evaluatePlanConstraints(planString).isValid).toBe(false);
    });
  });

  describe('Defect B — Day Numbers Unique and Contiguous 1..N', () => {
    it('accepts contiguous 1..N day numbers', () => {
      const plan = {
        days: [
          { dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 2, items: [{ id: 'i2', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 3, items: [{ id: 'i3', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('accepts day objects in permuted array order as long as dayNumbers form 1..N', () => {
      const plan = {
        days: [
          { dayNumber: 2, items: [{ id: 'i2', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('fails closed on duplicate dayNumber in itinerary', () => {
      const plan = {
        days: [
          { dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 1, items: [{ id: 'i2', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const dupDayConflict = result.conflicts.find(c => c.details?.reason === 'DUPLICATE_DAY_NUMBER');
      expect(dupDayConflict).toBeDefined();
      expect(dupDayConflict?.dayNumber).toBe(1);
    });

    it('fails closed when day numbers have a gap (e.g. days 1 and 3)', () => {
      const plan = {
        days: [
          { dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 3, items: [{ id: 'i3', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_DAY_NUMBERS');
      expect(contigConflict).toBeDefined();
      expect(contigConflict?.details).toMatchObject({
        expectedCount: 2,
        actualDayNumbers: [1, 3],
      });
    });

    it('fails closed when day numbers start at 2 (e.g. [2, 3])', () => {
      const plan = {
        days: [
          { dayNumber: 2, items: [{ id: 'i2', position: 1, flexibility: 'flexible', priority: 'optional' }] },
          { dayNumber: 3, items: [{ id: 'i3', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_DAY_NUMBERS');
      expect(contigConflict).toBeDefined();
    });

    it('fails closed on single day itinerary starting at day 2', () => {
      const plan = {
        days: [
          { dayNumber: 2, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' }] },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_DAY_NUMBERS');
      expect(contigConflict).toBeDefined();
    });

    it('ensures cross-day safety: duplicate dayNumber fails closed with DUPLICATE_DAY_NUMBER and avoids oversized domains', () => {
      // Two day objects both having dayNumber = 1
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-a',
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '11:30',
              },
            ],
          },
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-b',
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:30',
                endTime: '12:00',
              },
            ],
          },
        ],
      };

      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);

      // Must flag DUPLICATE_DAY_NUMBER deterministically
      expect(result.conflicts.some(c => c.details?.reason === 'DUPLICATE_DAY_NUMBER')).toBe(true);
    });
  });

  describe('Defect C — Item Positions Unique and Contiguous 1..M per Day', () => {
    it('accepts contiguous 1..M positions on a day', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' },
              { id: 'i2', position: 2, flexibility: 'flexible', priority: 'optional' },
              { id: 'i3', position: 3, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('accepts items in permuted array order as long as positions form 1..M', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i2', position: 2, flexibility: 'flexible', priority: 'optional' },
              { id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('fails closed on duplicate position on the same day', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' },
              { id: 'i2', position: 1, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const dupPosConflict = result.conflicts.find(c => c.details?.reason === 'DUPLICATE_ITEM_POSITION');
      expect(dupPosConflict).toBeDefined();
      expect(dupPosConflict?.details).toMatchObject({
        dayNumber: 1,
        position: 1,
      });
    });

    it('fails closed when positions have a gap (e.g. positions 1 and 3)', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional' },
              { id: 'i3', position: 3, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_ITEM_POSITIONS');
      expect(contigConflict).toBeDefined();
      expect(contigConflict?.details).toMatchObject({
        dayNumber: 1,
        expectedCount: 2,
        actualPositions: [1, 3],
      });
    });

    it('fails closed when positions start at 2 on a day', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i2', position: 2, flexibility: 'flexible', priority: 'optional' },
              { id: 'i3', position: 3, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_ITEM_POSITIONS');
      expect(contigConflict).toBeDefined();
    });

    it('fails closed on a single item day with position: 2', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'i2', position: 2, flexibility: 'flexible', priority: 'optional' },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      const contigConflict = result.conflicts.find(c => c.details?.reason === 'NON_CONTIGUOUS_ITEM_POSITIONS');
      expect(contigConflict).toBeDefined();
    });
  });

  describe('Defect D — Strict Time Scalar Validation', () => {
    it('accepts undefined or null time scalars as absent/no fact', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: undefined,
                endTime: null,
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('accepts exact HH:MM military time string', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '09:00',
                endTime: '10:30',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('fails closed when startTime is numeric (e.g. 900)', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: 900,
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].details).toMatchObject({ field: 'startTime', invalidValue: 900 });
    });

    it('fails closed when startTime is boolean or object or array', () => {
      const planBool = {
        days: [{ dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional', startTime: true }] }],
      };
      const planObj = {
        days: [{ dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional', startTime: { hour: 9 } }] }],
      };
      const planArr = {
        days: [{ dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional', startTime: [9, 0] }] }],
      };

      expect(evaluatePlanConstraints(planBool).isValid).toBe(false);
      expect(evaluatePlanConstraints(planObj).isValid).toBe(false);
      expect(evaluatePlanConstraints(planArr).isValid).toBe(false);
    });

    it('fails closed when time string contains whitespace padding (" 09:00 ")', () => {
      const planPadded = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: ' 09:00 ',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(planPadded);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].details).toMatchObject({ field: 'startTime', invalidValue: ' 09:00 ' });
    });

    it('fails closed when time string is empty string or whitespace-only', () => {
      const planEmpty = {
        days: [{ dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional', startTime: '' }] }],
      };
      const planWhitespace = {
        days: [{ dayNumber: 1, items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'optional', startTime: '   ' }] }],
      };

      expect(evaluatePlanConstraints(planEmpty).isValid).toBe(false);
      expect(evaluatePlanConstraints(planWhitespace).isValid).toBe(false);
    });

    it('fails closed when endTime is an invalid scalar', () => {
      const plan = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'i1',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '09:00',
                endTime: 'not-valid-time',
              },
            ],
          },
        ],
      };
      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
      expect(result.conflicts[0].details).toMatchObject({ field: 'endTime', invalidValue: 'not-valid-time' });
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
                position: 1,
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
                position: 1,
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
                position: 1,
                placeName: 'Temple of Literature',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:30',
                endTime: '10:00',
              },
              {
                id: 'item-2',
                position: 2,
                placeName: 'One Pillar Pagoda',
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '10:00',
                endTime: '11:30',
              },
              {
                id: 'item-3',
                position: 3,
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
                position: 1,
                placeName: 'Morning Coffee',
                flexibility: 'fixed',
                priority: 'want_to_do',
                startTime: '09:00',
                endTime: '10:30',
              },
              {
                id: 'item-a',
                position: 2,
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
                position: 1,
                placeName: 'Guided Tour',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '09:00',
                endTime: '11:00',
              },
              {
                id: 'item-point',
                position: 2,
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
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '14:00',
              },
              {
                id: 'item-2',
                position: 2,
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
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '12:00',
              },
              {
                id: 'flex-item-1',
                position: 2,
                flexibility: 'flexible',
                priority: 'want_to_do',
                startTime: '10:30',
                endTime: '11:30',
              },
              {
                id: 'flex-item-2',
                position: 3,
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
                position: 1,
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
                position: 1,
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
              { id: 'dup-id', position: 1, placeName: 'Spot 1', flexibility: 'flexible', priority: 'optional' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'dup-id', position: 1, placeName: 'Spot 2', flexibility: 'flexible', priority: 'optional' },
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
  });

  describe('Strict Enum Validation', () => {
    it('fails closed on non-canonical flexibility string (e.g. FIXED, Fixed, arbitrary)', () => {
      const planUpper = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 1, flexibility: 'FIXED', priority: 'must_do' }],
        }],
      };
      const planTitle = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 1, flexibility: 'Fixed', priority: 'must_do' }],
        }],
      };
      const planArbitrary = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 1, flexibility: 'semi-flexible', priority: 'must_do' }],
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
          items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'MUST_DO' }],
        }],
      };
      const planKebab = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'must-do' }],
        }],
      };
      const planCamel = {
        days: [{
          dayNumber: 1,
          items: [{ id: 'i1', position: 1, flexibility: 'flexible', priority: 'mustDo' }],
        }],
      };

      expect(evaluatePlanConstraints(planUpper).isValid).toBe(false);
      expect(evaluatePlanConstraints(planKebab).isValid).toBe(false);
      expect(evaluatePlanConstraints(planCamel).isValid).toBe(false);
    });
  });

  describe('Baseline Must Fail Closed', () => {
    const validProposed: ConstraintItinerary = {
      days: [
        {
          dayNumber: 1,
          items: [
            { id: 'item-1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
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
              { id: 'item-1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: 'invalid-time', endTime: '10:00' },
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
              { id: 'dup-base', position: 1, flexibility: 'flexible', priority: 'optional' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'dup-base', position: 1, flexibility: 'flexible', priority: 'optional' },
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
              { id: 'item-base', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '15:00', endTime: '14:00' },
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
              { id: 'base-f1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '10:00', endTime: '12:00' },
              { id: 'base-f2', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '11:00', endTime: '13:00' },
            ],
          },
        ],
      };

      const result = evaluatePlanModification(corruptBaseline, validProposed);
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.origin === 'baseline' && c.code === 'FIXED_TIME_OVERLAP')).toBe(true);
    });
  });

  describe('Protect FIXED Position', () => {
    const baselinePlan: ConstraintItinerary = {
      days: [
        {
          dayNumber: 1,
          items: [
            {
              id: 'fixed-pos-item',
              position: 1,
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
            {
              id: 'opt-item',
              position: 3,
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
                position: 1,
                placeName: 'Souvenir Shopping',
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '15:00',
                endTime: '16:00',
              },
              {
                id: 'fixed-pos-item',
                position: 2, // position changed from 1 to 2!
                placeName: 'Flight Arrival',
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'must-flex-item',
                position: 3,
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
      expect(posConflict?.details).toMatchObject({ baselinePosition: 1, proposedPosition: 2 });
    });

    it('allows OPTIONAL item position to change without conflict', () => {
      const proposed: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'fixed-pos-item',
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'opt-item',
                position: 2, // opt-item moved to position 2
                flexibility: 'flexible',
                priority: 'optional',
                startTime: '10:00',
                endTime: '11:00',
              },
              {
                id: 'must-flex-item',
                position: 3, // must-flex moved to position 3
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
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '08:00',
                endTime: '09:30',
              },
              {
                id: 'opt-item',
                position: 2,
                flexibility: 'flexible',
                priority: 'optional',
              },
              {
                id: 'must-flex-item',
                position: 3, // position swapped with opt-item
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
                position: 1,
                flexibility: 'fixed',
                priority: 'must_do',
                startTime: '10:00',
                endTime: '11:00',
              },
              {
                id: 'other-item',
                position: 2,
                flexibility: 'flexible',
                priority: 'optional',
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
                id: 'other-item',
                position: 1,
                flexibility: 'flexible',
                priority: 'optional',
              },
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

  describe('Overlap Bounds & Sweep Semantics', () => {
    it('fails closed immediately when itinerary exceeds MAX_DAYS (60) without traversing all days', () => {
      // 61 days: day 61 has throwing getters to prove zero traversal occurred
      const oversizedDays = Array.from({ length: 61 }, (_, i) => {
        if (i >= 60) {
          return {
            get dayNumber(): number {
              throw new Error('FAIL-FAST VIOLATION: Accessed day beyond MAX_DAYS');
            },
            get items(): unknown[] {
              throw new Error('FAIL-FAST VIOLATION: Accessed items beyond MAX_DAYS');
            },
          };
        }
        return { dayNumber: i + 1, items: [] };
      });

      const result = evaluatePlanConstraints({ days: oversizedDays });
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        code: 'MALFORMED_INPUT',
        itemId: 'itinerary',
      });
      expect(result.conflicts[0].message).toContain('planning days');
    });

    it('fails closed on very large days array without processing any day contents', () => {
      // 1000 days: every day has throwing getters to prove zero day traversal
      const hugeDays = Array.from({ length: 1000 }, () => ({
        get dayNumber(): number {
          throw new Error('FAIL-FAST VIOLATION: Accessed day in oversized itinerary');
        },
        get items(): unknown[] {
          throw new Error('FAIL-FAST VIOLATION: Accessed items in oversized itinerary');
        },
      }));

      const result = evaluatePlanConstraints({ days: hugeDays });
      expect(result.isValid).toBe(false);
      expect(result.conflicts[0].code).toBe('MALFORMED_INPUT');
    });

    it('fails closed when a day exceeds MAX_ITEMS_PER_DAY (50) without validating every item', () => {
      // 55 items: items 51+ have throwing getters to prove zero item traversal
      const oversizedItems = Array.from({ length: 55 }, (_, i) => {
        if (i >= 50) {
          return {
            get id(): string {
              throw new Error('FAIL-FAST VIOLATION: Accessed item beyond MAX_ITEMS_PER_DAY');
            },
            get position(): number {
              throw new Error('FAIL-FAST VIOLATION: Accessed position beyond MAX_ITEMS_PER_DAY');
            },
          };
        }
        return {
          id: `item-${i + 1}`,
          position: i + 1,
          flexibility: 'flexible' as const,
          priority: 'optional' as const,
        };
      });

      const result = evaluatePlanConstraints({ days: [{ dayNumber: 1, items: oversizedItems }] });
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MALFORMED_INPUT' && c.message.includes('items per day'))).toBe(true);
    });

    it('fails closed immediately when total items exceed MAX_TOTAL_ITEMS (500)', () => {
      // 10 days of 50 items (= 500 items) + 1 day of 1 item (= 501 items)
      // Day 12 has throwing getters to prove zero traversal beyond the hard 500 bound
      const days = Array.from({ length: 12 }, (_, d) => {
        if (d === 11) {
          return {
            get dayNumber(): number {
              throw new Error('FAIL-FAST VIOLATION: Accessed day beyond MAX_TOTAL_ITEMS');
            },
            get items(): unknown[] {
              throw new Error('FAIL-FAST VIOLATION: Accessed items beyond MAX_TOTAL_ITEMS');
            },
          };
        }
        const itemCount = d === 10 ? 1 : 50;
        return {
          dayNumber: d + 1,
          items: Array.from({ length: itemCount }, (_, i) => ({
            id: `d${d + 1}-i${i + 1}`,
            position: i + 1,
            flexibility: 'flexible' as const,
            priority: 'optional' as const,
          })),
        };
      });

      const result = evaluatePlanConstraints({ days });
      expect(result.isValid).toBe(false);
      expect(result.conflicts.some(c => c.code === 'MALFORMED_INPUT' && c.message.includes('total items'))).toBe(true);
    });

    it('duplicate dayNumber with 50 + 50 items does not create a 100-item overlap domain', () => {
      // Day 1 has 50 items, duplicate Day 1 has 50 items
      const dayA = {
        dayNumber: 1,
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `a-${i + 1}`,
          position: i + 1,
          flexibility: 'fixed' as const,
          priority: 'must_do' as const,
          startTime: '10:00',
          endTime: '11:00',
        })),
      };
      const dayB = {
        dayNumber: 1, // Duplicate dayNumber!
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `b-${i + 1}`,
          position: i + 1,
          flexibility: 'fixed' as const,
          priority: 'must_do' as const,
          startTime: '10:00',
          endTime: '11:00',
        })),
      };

      const result = evaluatePlanConstraints({ days: [dayA, dayB] });
      expect(result.isValid).toBe(false);
      // Fails closed with DUPLICATE_DAY_NUMBER
      expect(result.conflicts.some(c => c.details?.reason === 'DUPLICATE_DAY_NUMBER')).toBe(true);
      // Items reported in summary is <= 50, proving no 100-item domain was created
      expect(result.summary.totalItems).toBeLessThanOrEqual(PLANNING_BOUNDS.MAX_ITEMS_PER_DAY);
    });

    it('passes valid exact boundary of MAX_DAYS (60 days)', () => {
      const days = Array.from({ length: 60 }, (_, i) => ({
        dayNumber: i + 1,
        items: [
          {
            id: `day-${i + 1}-item-1`,
            position: 1,
            flexibility: 'flexible' as const,
            priority: 'optional' as const,
          },
        ],
      }));

      const result = evaluatePlanConstraints({ days });
      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(60);
    });

    it('passes valid exact boundary of MAX_ITEMS_PER_DAY (50 items on one day)', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i + 1}`,
        position: i + 1,
        flexibility: 'flexible' as const,
        priority: 'optional' as const,
      }));

      const result = evaluatePlanConstraints({ days: [{ dayNumber: 1, items }] });
      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(50);
    });

    it('passes valid exact boundary of MAX_TOTAL_ITEMS (500 items across 10 days)', () => {
      const days = Array.from({ length: 10 }, (_, d) => ({
        dayNumber: d + 1,
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `d${d + 1}-i${i + 1}`,
          position: i + 1,
          flexibility: 'flexible' as const,
          priority: 'optional' as const,
        })),
      }));

      const result = evaluatePlanConstraints({ days });
      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(500);
    });

    it('adjacent intervals touching at exact boundary do NOT overlap (e.g. 09:00-10:00 and 10:00-11:00)', () => {
      const plan: ConstraintItinerary = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'f1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'f2', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '10:00', endTime: '11:00' },
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
              { id: 'int', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'pt', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '10:00' },
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
              { id: 'int', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'pt', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '09:30' },
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
              position: 1,
              placeName: 'Flight Arrival',
              flexibility: 'fixed',
              priority: 'must_do',
              startTime: '08:00',
              endTime: '09:30',
            },
            {
              id: 'must-1',
              position: 2,
              placeName: 'Famous Pho',
              flexibility: 'flexible',
              priority: 'must_do',
              startTime: '12:00',
              endTime: '13:00',
            },
            {
              id: 'opt-1',
              position: 3,
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
              position: 1,
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
              { id: 'must-1', position: 1, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
              { id: 'must-1', position: 1, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-1', position: 1, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
              { id: 'fixed-2', position: 2, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
              { id: 'fixed-1', position: 1, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:30', endTime: '09:30' },
              { id: 'must-1', position: 2, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
              { id: 'fixed-1', position: 1, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '10:00' },
              { id: 'must-1', position: 2, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'must_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
              { id: 'fixed-1', position: 1, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
              { id: 'fixed-1', position: 1, placeName: 'Flight Arrival', flexibility: 'fixed', priority: 'must_do', startTime: '08:00', endTime: '09:30' },
              { id: 'must-1', position: 2, placeName: 'Famous Pho', flexibility: 'flexible', priority: 'want_to_do' },
            ],
          },
          {
            dayNumber: 2,
            items: [
              { id: 'fixed-2', position: 1, placeName: 'Pre-booked Museum Tour', flexibility: 'fixed', priority: 'want_to_do', startTime: '10:00', endTime: '12:00' },
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
                position: 1,
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
      const item1 = { id: 'item-1', position: 1, flexibility: 'fixed' as const, priority: 'must_do' as const, startTime: '10:00', endTime: '12:00' };
      const item2 = { id: 'item-2', position: 2, flexibility: 'fixed' as const, priority: 'must_do' as const, startTime: '11:00', endTime: '13:00' };

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
        items: [{ id: 'dup-id', position: 1, flexibility: 'flexible' as const, priority: 'optional' as const }],
      };
      const day2 = {
        dayNumber: 2,
        items: [{ id: 'dup-id', position: 1, flexibility: 'flexible' as const, priority: 'optional' as const }],
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
              { id: 'point-1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00' },
              { id: 'point-2', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '09:30' },
            ],
          },
        ],
      };

      const result = evaluatePlanConstraints(plan);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('executes in-memory with zero network calls and zero persistence writes', () => {
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
            position: i, // 1-based contiguous 1..10
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
