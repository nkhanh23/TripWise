jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError, mapWorkspaceMutationError } from '../src/integration/errors';
import { SupabaseTravelWorkspaceRepository } from '../src/integration/remote/supabaseTripRepositories';
import { validateWorkspaceMutationCommand } from '../src/integration/validation';

const tripId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';

describe('FEATURE-P1-T003 workspace mutation transport', () => {
  it('sends only a typed CAS command and returns the server revision', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: { revision: 9 }, error: null });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const repository = new SupabaseTravelWorkspaceRepository({ rpc } as unknown as SupabaseClient<Database>);
    await expect(repository.mutate({ type: 'update_item', tripId: tripId as never, itemId: itemId as never, expectedRevision: 8, patch: { note: 'Owner note' } })).resolves.toEqual({ revision: 9 });
    expect(rpc).toHaveBeenCalledWith('mutate_travel_workspace', { p_command: expect.objectContaining({ expectedRevision: 8, patch: { note: 'Owner note' } }) });
  });

  it('rejects forged provider/owner fields, invalid kind pairs, unsafe links and oversized payloads before transport', () => {
    const base = { tripId, itemId, expectedRevision: 1 };
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { googlePlaceId: 'forged' } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { ownerId: tripId } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { kind: 'invalid' } })).toThrow('workspace item patch');
    expect(() => validateWorkspaceMutationCommand({ type: 'replace_source_links', ...base, links: [{ type: 'website', url: 'javascript:alert(1)' }] })).toThrow('workspace source link');
    expect(() => validateWorkspaceMutationCommand({ type: 'update_item', ...base, patch: { note: 'x'.repeat(501) } })).toThrow('workspace item patch');
  });

  it('maps the stable revision conflict without retry/overwrite semantics', () => {
    const error = mapWorkspaceMutationError({ code: 'TW009', message: 'internal detail is ignored' });
    expect(error).toBeInstanceOf(IntegrationError);
    expect(error.code).toBe('conflict');
    expect(error.message).toBe('The request conflicts with an existing operation.');
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
