jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError } from '../src/integration/errors';
import { SupabaseTripExpenseLedgerRepository } from '../src/integration/remote/supabaseTripExpenseRepository';
import {
  ContractValidationError,
  validateCreateTripExpenseCommand,
  validateUpdateTripExpenseCommand,
  validateDeleteTripExpenseCommand,
  validateListTripExpensesRequest,
  parseTripExpenseRecord,
  parseTripExpensesPage,
} from '../src/integration/validation';

const tripId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const expenseId = '33333333-3333-4333-8333-333333333333';

describe('FEATURE-P3-T001-S001 Expense Ledger Contract', () => {
  describe('validateCreateTripExpenseCommand', () => {
    it('accepts a valid planned expense without attachment', () => {
      const cmd = validateCreateTripExpenseCommand({
        tripId,
        category: 'food',
        origin: 'planned',
        amount: 150000,
        currency: 'VND',
        note: 'Dinner reservation',
        spentAt: '2026-09-10T19:00:00.000Z',
      });
      expect(cmd.tripId).toBe(tripId);
      expect(cmd.category).toBe('food');
      expect(cmd.origin).toBe('planned');
      expect(cmd.amount).toBe(150000);
      expect(cmd.currency).toBe('VND');
      expect(cmd.note).toBe('Dinner reservation');
      expect(cmd.itineraryItemId).toBeNull();
    });

    it('accepts a valid actual expense with itinerary item attachment', () => {
      const cmd = validateCreateTripExpenseCommand({
        tripId,
        itineraryItemId: itemId,
        category: 'transport',
        origin: 'actual',
        amount: 45.5,
        currency: 'USD',
        spentAt: '2026-09-10T08:30:00.000Z',
      });
      expect(cmd.itineraryItemId).toBe(itemId);
      expect(cmd.currency).toBe('USD');
      expect(cmd.origin).toBe('actual');
      expect(cmd.note).toBeNull();
    });

    it('accepts an unplanned expense', () => {
      const cmd = validateCreateTripExpenseCommand({
        tripId,
        category: 'shopping',
        origin: 'unplanned',
        amount: 200000,
        currency: 'VND',
        spentAt: '2026-09-10T15:00:00.000Z',
      });
      expect(cmd.origin).toBe('unplanned');
    });

    it('rejects invalid categories outside the 9 frozen allowlist', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'invalid_category' as never,
          origin: 'planned',
          amount: 100,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects invalid origins outside planned, actual, unplanned', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'estimated' as never,
          amount: 100,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects non-positive, NaN, or non-finite amounts', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: 0,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);

      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: -50,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);

      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: Number.NaN,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects invalid currency codes', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: 100,
          currency: 'TOOLONG',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects invalid or non-ISO spentAt dates', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: 100,
          currency: 'VND',
          spentAt: 'not-a-date',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects notes exceeding 500 characters', () => {
      expect(() =>
        validateCreateTripExpenseCommand({
          tripId,
          category: 'food',
          origin: 'planned',
          amount: 100,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
          note: 'a'.repeat(501),
        })
      ).toThrow(ContractValidationError);
    });
  });

  describe('validateUpdateTripExpenseCommand', () => {
    it('accepts valid partial patch', () => {
      const cmd = validateUpdateTripExpenseCommand({
        tripId,
        expenseId,
        patch: {
          amount: 250000,
          note: 'Updated dinner bill',
          origin: 'actual',
        },
      });
      expect(cmd.tripId).toBe(tripId);
      expect(cmd.expenseId).toBe(expenseId);
      expect(cmd.patch.amount).toBe(250000);
      expect(cmd.patch.note).toBe('Updated dinner bill');
      expect(cmd.patch.origin).toBe('actual');
    });

    it('accepts clearing attachment and note with explicit null', () => {
      const cmd = validateUpdateTripExpenseCommand({
        tripId,
        expenseId,
        patch: {
          itineraryItemId: null,
          note: null,
        },
      });
      expect(cmd.patch.itineraryItemId).toBeNull();
      expect(cmd.patch.note).toBeNull();
    });

    it('rejects empty patch', () => {
      expect(() =>
        validateUpdateTripExpenseCommand({
          tripId,
          expenseId,
          patch: {},
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects invalid uuid in expenseId', () => {
      expect(() =>
        validateUpdateTripExpenseCommand({
          tripId,
          expenseId: 'not-a-uuid',
          patch: { amount: 100 },
        })
      ).toThrow(ContractValidationError);
    });
  });

  describe('validateDeleteTripExpenseCommand', () => {
    it('accepts valid tripId and expenseId', () => {
      const cmd = validateDeleteTripExpenseCommand({ tripId, expenseId });
      expect(cmd.tripId).toBe(tripId);
      expect(cmd.expenseId).toBe(expenseId);
    });

    it('rejects non-uuid expenseId', () => {
      expect(() => validateDeleteTripExpenseCommand({ tripId, expenseId: 'invalid' })).toThrow(ContractValidationError);
    });
  });

  describe('validateListTripExpensesRequest', () => {
    it('accepts valid list request with pagination and filters', () => {
      const req = validateListTripExpensesRequest({
        tripId,
        limit: 20,
        category: 'food',
        origin: 'actual',
        cursor: {
          createdAt: '2026-09-10T12:00:00.000Z',
          id: expenseId,
        },
      });
      expect(req.tripId).toBe(tripId);
      expect(req.limit).toBe(20);
      expect(req.category).toBe('food');
      expect(req.origin).toBe('actual');
      expect(req.cursor?.id).toBe(expenseId);
    });

    it('rejects limit out of bounds', () => {
      expect(() => validateListTripExpensesRequest({ tripId, limit: 0 })).toThrow(ContractValidationError);
      expect(() => validateListTripExpensesRequest({ tripId, limit: 51 })).toThrow(ContractValidationError);
    });
  });

  describe('parseTripExpenseRecord & parseTripExpensesPage', () => {
    const rawRecord = {
      id: expenseId,
      tripId,
      itineraryItemId: itemId,
      category: 'transport',
      origin: 'actual',
      amount: 50000,
      currency: 'VND',
      note: 'Taxi',
      spentAt: '2026-09-10T10:00:00.000Z',
      createdAt: '2026-09-10T10:05:00.000Z',
      updatedAt: '2026-09-10T10:05:00.000Z',
    };

    it('correctly parses raw record into typed record', () => {
      const record = parseTripExpenseRecord(rawRecord);
      expect(record.id).toBe(expenseId);
      expect(record.tripId).toBe(tripId);
      expect(record.itineraryItemId).toBe(itemId);
      expect(record.category).toBe('transport');
      expect(record.origin).toBe('actual');
      expect(record.amount).toBe(50000);
      expect(record.currency).toBe('VND');
      expect(record.note).toBe('Taxi');
    });

    it('correctly parses a page response', () => {
      const rawPage = {
        items: [rawRecord],
        nextCursor: {
          createdAt: '2026-09-10T10:00:00.000Z',
          id: expenseId,
        },
      };
      const page = parseTripExpensesPage(rawPage);
      expect(page.items).toHaveLength(1);
      expect(page.nextCursor?.id).toBe(expenseId);
    });
  });

  describe('SupabaseTripExpenseLedgerRepository', () => {
    it('creates expense via create_trip_expense RPC and returns typed record', async () => {
      const mockResult = {
        id: expenseId,
        tripId,
        itineraryItemId: null,
        category: 'accommodation',
        origin: 'planned',
        amount: 1200000,
        currency: 'VND',
        note: 'Hotel stay',
        spentAt: '2026-09-11T14:00:00.000Z',
        createdAt: '2026-09-07T12:00:00.000Z',
        updatedAt: '2026-09-07T12:00:00.000Z',
      };

      const abortSignal = jest.fn().mockResolvedValue({ data: mockResult, error: null });
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      const repo = new SupabaseTripExpenseLedgerRepository({ rpc } as unknown as SupabaseClient<Database>);

      const result = await repo.createExpense({
        tripId: tripId as never,
        category: 'accommodation',
        origin: 'planned',
        amount: 1200000,
        currency: 'VND',
        note: 'Hotel stay',
        spentAt: '2026-09-11T14:00:00.000Z',
      });

      expect(result.id).toBe(expenseId);
      expect(result.category).toBe('accommodation');
      expect(rpc).toHaveBeenCalledWith('create_trip_expense', {
        p_command: expect.objectContaining({
          tripId,
          category: 'accommodation',
          origin: 'planned',
          amount: 1200000,
        }),
      });
    });

    it('updates expense via update_trip_expense RPC and returns updated record', async () => {
      const mockResult = {
        id: expenseId,
        tripId,
        itineraryItemId: null,
        category: 'accommodation',
        origin: 'actual',
        amount: 1100000,
        currency: 'VND',
        note: 'Discounted hotel stay',
        spentAt: '2026-09-11T14:00:00.000Z',
        createdAt: '2026-09-07T12:00:00.000Z',
        updatedAt: '2026-09-07T13:00:00.000Z',
      };

      const abortSignal = jest.fn().mockResolvedValue({ data: mockResult, error: null });
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      const repo = new SupabaseTripExpenseLedgerRepository({ rpc } as unknown as SupabaseClient<Database>);

      const result = await repo.updateExpense({
        tripId: tripId as never,
        expenseId: expenseId as never,
        patch: {
          origin: 'actual',
          amount: 1100000,
          note: 'Discounted hotel stay',
        },
      });

      expect(result.amount).toBe(1100000);
      expect(result.origin).toBe('actual');
      expect(rpc).toHaveBeenCalledWith('update_trip_expense', {
        p_command: expect.objectContaining({
          tripId,
          expenseId,
          patch: expect.objectContaining({
            amount: 1100000,
            origin: 'actual',
          }),
        }),
      });
    });

    it('deletes expense via delete_trip_expense RPC and returns true', async () => {
      const abortSignal = jest.fn().mockResolvedValue({ data: true, error: null });
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      const repo = new SupabaseTripExpenseLedgerRepository({ rpc } as unknown as SupabaseClient<Database>);

      const result = await repo.deleteExpense({ tripId: tripId as never, expenseId: expenseId as never });
      expect(result).toBe(true);
      expect(rpc).toHaveBeenCalledWith('delete_trip_expense', { p_expense_id: expenseId });
    });

    it('lists expenses via list_trip_expenses RPC and returns parsed page', async () => {
      const mockPage = {
        items: [
          {
            id: expenseId,
            tripId,
            itineraryItemId: null,
            category: 'ticket',
            origin: 'planned',
            amount: 300000,
            currency: 'VND',
            note: null,
            spentAt: '2026-09-12T09:00:00.000Z',
            createdAt: '2026-09-07T12:00:00.000Z',
            updatedAt: '2026-09-07T12:00:00.000Z',
          },
        ],
        nextCursor: null,
      };

      const abortSignal = jest.fn().mockResolvedValue({ data: mockPage, error: null });
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      const repo = new SupabaseTripExpenseLedgerRepository({ rpc } as unknown as SupabaseClient<Database>);

      const page = await repo.listExpenses({
        tripId: tripId as never,
        limit: 10,
        category: 'ticket',
      });

      expect(page.items).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
      expect(rpc).toHaveBeenCalledWith('list_trip_expenses', {
        p_trip_id: tripId,
        p_limit: 10,
        p_cursor_created_at: undefined,
        p_cursor_id: undefined,
        p_category: 'ticket',
        p_origin: undefined,
      });
    });

    it('maps RPC error into IntegrationError', async () => {
      const abortSignal = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '22023', message: 'Category must be one of allowlist' },
      });
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      const repo = new SupabaseTripExpenseLedgerRepository({ rpc } as unknown as SupabaseClient<Database>);

      await expect(
        repo.createExpense({
          tripId: tripId as never,
          category: 'food',
          origin: 'planned',
          amount: 100,
          currency: 'VND',
          spentAt: '2026-09-10T12:00:00.000Z',
        })
      ).rejects.toThrow(IntegrationError);
    });
  });
});
