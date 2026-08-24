jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError } from '../src/integration/errors';
import { SupabaseAuthRepository } from '../src/integration/remote/supabaseAuthRepository';
import { SupabaseProfileRepository } from '../src/integration/remote/supabaseProfileRepository';
import { asUserId } from '../src/integration/validation';

const userId = '11111111-1111-4111-8111-111111111111';
const session = {
  access_token: 'must-not-cross-repository-boundary',
  refresh_token: 'must-not-cross-repository-boundary',
  expires_at: 1_787_200_000,
  user: { id: userId, email: 'owner@example.com', user_metadata: { display_name: 'Remote Owner' } },
} as unknown as Session;

describe('Supabase auth repository integration with mocked transport', () => {
  it('normalizes login input, maps the session, and exposes no token fields', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { session }, error: null });
    const client = { auth: { signInWithPassword } } as unknown as SupabaseClient<Database>;
    const result = await new SupabaseAuthRepository(client).signIn(' Owner@Example.COM ', 'not-logged');
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'not-logged' });
    expect(result).toEqual({
      user: { id: userId, email: 'owner@example.com', displayName: 'Remote Owner' },
      expiresAt: 1_787_200_000,
    });
    expect(result).not.toHaveProperty('access_token');
    expect(result).not.toHaveProperty('refresh_token');
    expect(result).not.toHaveProperty('accessToken');
  });

  it('supports both immediate-session and verification-required registration', async () => {
    const signUp = jest.fn()
      .mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    const repository = new SupabaseAuthRepository({ auth: { signUp } } as unknown as SupabaseClient<Database>);
    await expect(repository.signUp(' Remote Owner ', ' OWNER@example.com ', 'not-logged')).resolves.toMatchObject({
      confirmationRequired: false,
    });
    await expect(repository.signUp('Remote Owner', 'owner2@example.com', 'not-logged')).resolves.toEqual({
      session: null, confirmationRequired: true,
    });
    expect(signUp).toHaveBeenNthCalledWith(1, {
      email: 'owner@example.com', password: 'not-logged', options: { data: { display_name: 'Remote Owner' } },
    });
  });

  it('maps auth failures semantically and invokes reset/sign-out methods exactly once', async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const failing = new SupabaseAuthRepository({ auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: { code: 'invalid_credentials', status: 400 } }),
    } } as unknown as SupabaseClient<Database>);
    await expect(failing.signIn('owner@example.com', 'not-logged')).rejects.toMatchObject<Partial<IntegrationError>>({ code: 'invalidCredentials' });
    const repository = new SupabaseAuthRepository({ auth: { resetPasswordForEmail, signOut } } as unknown as SupabaseClient<Database>);
    await repository.resetPassword(' OWNER@example.com ');
    await repository.signOut();
    expect(resetPasswordForEmail).toHaveBeenCalledWith('owner@example.com');
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe('Supabase profile repository integration with mocked transport', () => {
  const row = {
    id: userId, display_name: 'Remote Owner', avatar_url: null,
    created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z',
  };

  it('reads the authenticated owner profile through the typed select boundary', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const abortSignal = jest.fn().mockReturnValue({ maybeSingle });
    const eq = jest.fn().mockReturnValue({ abortSignal });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    const repository = new SupabaseProfileRepository({ from } as unknown as SupabaseClient<Database>);
    await expect(repository.getOwnProfile(asUserId(userId))).resolves.toMatchObject({
      id: userId, displayName: 'Remote Owner', avatarUrl: null,
    });
    expect(from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('id', userId);
  });

  it('updates reviewed profile fields, including a blank-safe home country, and returns validated remote state', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { ...row, display_name: 'Updated', home_country: 'VN' }, error: null,
    });
    const abortSignal = jest.fn().mockReturnValue({ single });
    const selectAfterUpdate = jest.fn().mockReturnValue({ abortSignal });
    const eq = jest.fn().mockReturnValue({ select: selectAfterUpdate });
    const update = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ update });
    const repository = new SupabaseProfileRepository({ from } as unknown as SupabaseClient<Database>);
    await expect(repository.updateOwnProfile(asUserId(userId), {
      displayName: ' Updated ', homeCountry: ' VN ', avatarUrl: null,
    })).resolves.toMatchObject({
      displayName: 'Updated', homeCountry: 'VN', avatarUrl: null,
    });
    expect(update).toHaveBeenCalledWith({
      display_name: 'Updated', home_country: 'VN', avatar_url: null,
    });
    expect(eq).toHaveBeenCalledWith('id', userId);
  });
});
