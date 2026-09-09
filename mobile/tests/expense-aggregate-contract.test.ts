jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import type { TripId } from '../src/integration/contracts';
import { accountingMinorUnits, parseAccountingDecimal, parseExpenseAggregatePage, validateExpenseAggregateRequest } from '../src/integration/expenseAggregate';
import { SupabaseTripExpenseAggregateRepository } from '../src/integration/remote/supabaseTripExpenseAggregateRepository';
import { ContractValidationError } from '../src/integration/validation';

const tripId = '82000000-0000-4000-8000-000000000001' as TripId;
const request = { tripId, groupBy: 'currency' as const };
const row = { key: 'c|USD', currency: 'USD', category: null, day: null, planned: '0.30', actual: '0.20', unplanned: '0.10', actualPlusUnplanned: '0.30', variance: '0.00' };
const page = { ...request, items: [row], nextCursor: null };
function mockRepository(response: unknown) {
  const abortSignal = jest.fn().mockResolvedValue(response);
  const rpc = jest.fn().mockReturnValue({ abortSignal });
  return { repo: new SupabaseTripExpenseAggregateRepository({ rpc } as unknown as SupabaseClient<Database>), rpc, abortSignal };
}
describe('FEATURE-P3-T002 aggregate contract', () => {
  it('validates request and supplies bounded default', () => {
    expect(validateExpenseAggregateRequest(request)).toEqual({ ...request, limit: 20 });
  });
  it.each([{ ownerId: 'spoof' }, { userId: 'spoof' }, { unknown: 1 }, { limit: 0 }, { limit: 51 }, { limit: NaN }, { limit: 1.5 }, { cursor: null }, { cursor: 'k:food|USD' }, { groupBy: 'risk' }, { tripId: 'bad' }])('rejects invalid request %j', invalid => {
    expect(() => validateExpenseAggregateRequest({ ...request, ...invalid })).toThrow(ContractValidationError);
  });
  it('parses exact original currencies and large values without number conversion', () => {
    const huge = { ...row, key: 'c|VND', currency: 'VND', planned: '9999999999999999999999.99', actual: '0.00', unplanned: '0.00', actualPlusUnplanned: '0.00', variance: '-9999999999999999999999.99' };
    const result = parseExpenseAggregatePage({ ...page, items: [row, huge] }, request);
    expect(result.items[0].planned).toBe('0.30');
    expect(accountingMinorUnits(result.items[0].planned)).toBe(BigInt(30));
    expect(accountingMinorUnits(result.items[1].planned).toString()).toBe('999999999999999999999999');
  });
  it.each([NaN, Infinity, 0.30, 'NaN', 'Infinity', '1e3', '0.300', '00.30', '-0.00', '-1.00', '10000000000000000000000.00', null])('rejects malformed/out-of-bound decimal %j', value => {
    expect(() => parseAccountingDecimal(value)).toThrow(ContractValidationError);
  });
  it('accepts empty aggregate without inventing currencies', () => {
    expect(parseExpenseAggregatePage({ ...page, items: [] }, request).items).toEqual([]);
  });
  it.each([{ planned: 'bad' }, { variance: '1.00' }, { actualPlusUnplanned: '0.31' }, { category: 'food' }, { currency: 'VND' }, { extra: 1 }, { day: {} }])('rejects inconsistent/malformed row %j', invalid => {
    expect(() => parseExpenseAggregatePage({ ...page, items: [{ ...row, ...invalid }] }, request)).toThrow(ContractValidationError);
  });
  it('rejects duplicate, unsorted, over-limit and foreign-trip pages', () => {
    for (const invalid of [{ ...page, items: [row, row] }, { ...page, tripId: 'foreign' }, { ...page, items: Array(51).fill(row) }, { ...page, nextCursor: 'c|USD' }]) {
      expect(() => parseExpenseAggregatePage(invalid, request)).toThrow(ContractValidationError);
    }
  });
  it('accepts category, attached, UTC date and unassigned groups', () => {
    const id = '82000000-0000-4000-8000-000000000011';
    for (const variant of [
      { groupBy: 'category' as const, data: { ...row, key: 'k:food|USD', category: 'food' } },
      { groupBy: 'day' as const, data: { ...row, key: `i:${id}|USD`, day: { kind: 'itinerary', itineraryDayId: id, date: null } } },
      { groupBy: 'day' as const, data: { ...row, key: 's:2028-01-02|USD', day: { kind: 'spentDate', itineraryDayId: null, date: '2028-01-02' } } },
      { groupBy: 'day' as const, data: { ...row, key: 'u|USD', day: { kind: 'unassigned', itineraryDayId: null, date: null } } },
    ]) {
      expect(parseExpenseAggregatePage({ ...page, groupBy: variant.groupBy, items: [variant.data] }, { ...request, groupBy: variant.groupBy }).items).toHaveLength(1);
    }
  });
  it('sends one validated RPC without client owner ID or ledger pagination', async () => {
    const { repo, rpc, abortSignal } = mockRepository({ data: page, error: null });
    expect(await repo.getAggregate(request)).toEqual(page);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('get_trip_expense_aggregate', { p_request: { ...request, limit: 20 } });
    expect(abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
  it.each([['P0002', 'notFound'], ['22023', 'invalidRequest'], ['22003', 'invalidResponse'], ['42501', 'forbidden'], ['28000', 'unauthorized']])('maps %s safely without retry', async (code, mapped) => {
    const { repo, rpc } = mockRepository({ data: null, error: { code, message: 'private detail' } });
    await expect(repo.getAggregate(request)).rejects.toMatchObject({ code: mapped });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('rejects owner spoof before transport', async () => {
    const { repo, rpc } = mockRepository({ data: page, error: null });
    await expect(repo.getAggregate({ ...request, ownerId: 'spoof' } as typeof request)).rejects.toThrow(ContractValidationError);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('cancels in-flight read and never returns late data', async () => {
    const { repo, rpc, abortSignal } = mockRepository(null);
    abortSignal.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = repo.getAggregate(request, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    expect(abortSignal.mock.calls[0][0].aborted).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('does not call transport for pre-cancelled read', async () => {
    const { repo, rpc } = mockRepository(null);
    const controller = new AbortController(); controller.abort();
    await expect(repo.getAggregate(request, controller.signal)).rejects.toMatchObject({ code: 'cancelled' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('retries transient network failure once under existing read policy', async () => {
    const { repo, rpc, abortSignal } = mockRepository({ data: page, error: null });
    abortSignal.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(repo.getAggregate(request)).resolves.toEqual(page);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
