jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError, mapWorkspaceMutationError } from '../src/integration/errors';
import { SupabaseTravelWorkspaceRepository } from '../src/integration/remote/supabaseTripRepositories';
import { validateWorkspaceMutationCommand } from '../src/integration/validation';

const tripId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const dayId = '33333333-3333-4333-8333-333333333333';

describe('FEATURE-P1-T003 workspace mutation transport', () => {
  it('sends only a typed CAS command and returns the server revision', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: { revision: 9 }, error: null });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const repository = new SupabaseTravelWorkspaceRepository({ rpc } as unknown as SupabaseClient<Database>);
    await expect(repository.mutate({ type: 'update_item', tripId: tripId as never, itemId: itemId as never, expectedRevision: 8, patch: { note: 'Owner note' } })).resolves.toEqual({ revision: 9 });
    expect(rpc).toHaveBeenCalledWith('mutate_travel_workspace', { p_command: expect.objectContaining({ expectedRevision: 8, patch: { note: 'Owner note' } }) });
  });

  it('accepts an explicit null note and sends the existing clear-note contract', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: { revision: 10 }, error: null });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const repository = new SupabaseTravelWorkspaceRepository({ rpc } as unknown as SupabaseClient<Database>);
    await expect(repository.mutate({ type: 'update_item', tripId: tripId as never, itemId: itemId as never, expectedRevision: 9, patch: { note: null } })).resolves.toEqual({ revision: 10 });
    expect(rpc).toHaveBeenCalledWith('mutate_travel_workspace', { p_command: expect.objectContaining({ itemId, expectedRevision: 9, patch: { note: null } }) });
  });

  it('sends a custom-activity create command to the owner-scoped create RPC', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: { revision: 9, itemId }, error: null });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const repository = new SupabaseTravelWorkspaceRepository({ rpc } as unknown as SupabaseClient<Database>);
    await expect(repository.mutate({ type: 'create_item', tripId: tripId as never, dayId: dayId as never, expectedRevision: 8, item: { itemKind: 'custom_activity', title: 'Museum visit', flexibility: 'flexible', priority: 'want_to_do', startTime: '09:00', endTime: '10:00' } })).resolves.toEqual({ revision: 9, itemId });
    expect(rpc).toHaveBeenCalledWith('create_travel_workspace_item', expect.objectContaining({ p_command: expect.objectContaining({ dayId, item: expect.objectContaining({ itemKind: 'custom_activity' }) }) }));
  });

  it('rejects provider spoofing and invalid custom-activity time before transport', () => {
    expect(() => validateWorkspaceMutationCommand({ type: 'create_item', tripId, dayId, expectedRevision: 1, item: { itemKind: 'custom_activity', title: 'x', flexibility: 'fixed', priority: 'must_do', googlePlaceId: 'forged' } })).toThrow('create custom activity');
    expect(() => validateWorkspaceMutationCommand({ type: 'create_item', tripId, dayId, expectedRevision: 1, item: { itemKind: 'custom_activity', title: 'x', flexibility: 'fixed', priority: 'must_do', startTime: '11:00', endTime: '10:00' } })).toThrow('create custom activity');
  });

  it('rejects forged provider/owner fields, invalid kind pairs, unsafe links and oversized payloads before transport', () => {
    const base = { tripId, itemId, expectedRevision: 1 };
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { googlePlaceId: 'forged' } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { ownerId: tripId } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { kind: 'transport' } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: {} })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'replace_source_links', ...base, links: [{ type: 'website', url: 'javascript:alert(1)' }] })).toThrow('workspace source link');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { note: 'x'.repeat(501) } })).toThrow('workspace item patch');
  });

  it('requires strict scalar DTO types before transport', () => {
    const base = { tripId, itemId, expectedRevision: 1 };
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, expectedRevision: '1', patch: { note: 'x' } })).toThrow('workspace mutation command');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { placeName: 7 } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { note: true } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { contact: { phone: 7 } } })).toThrow('workspace contact patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { transport: { plannedCostAmount: '7' } } })).toThrow('workspace transport patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { accommodation: { nights: '2' } } })).toThrow('workspace accommodation patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'replace_source_links', ...base, links: [{ type: 7, url: true }] })).toThrow('workspace source link');
  });

  it('maps the stable revision conflict without retry/overwrite semantics', () => {
    const error = mapWorkspaceMutationError({ code: 'TW009', message: 'internal detail is ignored' });
    expect(error).toBeInstanceOf(IntegrationError);
    expect(error.code).toBe('conflict');
    expect(error.message).toBe('The request conflicts with an existing operation.');
  });

  it('maps every documented workspace SQLSTATE to a sanitized application error', () => {
    const expected = {
      TW006: 'unauthorized', TW007: 'invalidRequest', TW008: 'notFound', TW009: 'conflict',
      TW010: 'invalidRequest', TW011: 'invalidRequest', TW012: 'invalidRequest',
      TW013: 'invalidRequest', TW014: 'invalidRequest',
    } as const;
    for (const [sqlState, code] of Object.entries(expected)) {
      const error = mapWorkspaceMutationError({ code: sqlState, message: 'internal table/token/provider body' });
      expect(error.code).toBe(code);
      expect(error.message).not.toContain('internal table');
      expect(error.message).not.toContain('token');
    }
  });

  it('does not retry a server revision conflict', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: null, error: { code: 'TW009' } });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const repository = new SupabaseTravelWorkspaceRepository({ rpc } as unknown as SupabaseClient<Database>);
    await expect(repository.mutate({ type: 'transition_item_status', tripId: tripId as never, itemId: itemId as never, expectedRevision: 3, status: 'completed' }))
      .rejects.toMatchObject({ code: 'conflict' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
