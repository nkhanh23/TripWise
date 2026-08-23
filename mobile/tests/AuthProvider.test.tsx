jest.mock('../src/lib/supabase/client', () => ({ supabase: {} }));

import { act, cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Button, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import type { AuthenticatedSession, Profile } from '../src/integration/contracts';
import { IntegrationError } from '../src/integration/errors';
import type { AuthRepository, ProfileRepository } from '../src/integration/repositories';
import { asUserId } from '../src/integration/validation';

const userId = asUserId('11111111-1111-4111-8111-111111111111');
const session: AuthenticatedSession = {
  user: { id: userId, email: 'owner@example.com', displayName: 'Owner' }, expiresAt: null,
};
const profile: Profile = {
  id: userId, displayName: 'Remote Owner', avatarUrl: null,
      homeCountry: '',
  createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
};

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function createRepositories(restore: Promise<AuthenticatedSession | null> = Promise.resolve(null)) {
  let listener: (value: AuthenticatedSession | null) => void = () => undefined;
  const unsubscribe = jest.fn();
  const auth: AuthRepository = {
    restoreSession: jest.fn(() => restore),
    signIn: jest.fn().mockResolvedValue(session),
    signUp: jest.fn().mockResolvedValue({ session: null, confirmationRequired: true }),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn((next) => { listener = next; return unsubscribe; }),
  };
  const profiles: ProfileRepository = {
    getOwnProfile: jest.fn().mockResolvedValue(profile),
    updateOwnProfile: jest.fn().mockResolvedValue({ ...profile, displayName: 'Updated' }),
  };
  return { auth, profiles, unsubscribe, emit: (value: AuthenticatedSession | null) => listener(value) };
}

function Probe() {
  const auth = useAuth();
  const [failure, setFailure] = useState('none');
  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="profile-status">{auth.profileStatus}</Text>
      <Text testID="email">{auth.user?.email ?? 'none'}</Text>
      <Text testID="failure">{failure}</Text>
      <Button title="sign-in" onPress={() => void auth.signIn('owner@example.com', 'not-logged').catch(() => setFailure('sign-in'))} />
      <Button title="sign-out" onPress={() => void auth.signOut().catch(() => setFailure('sign-out'))} />
      <Button title="update" onPress={() => void auth.updateProfile({ displayName: 'Updated' })} />
    </View>
  );
}

describe('AuthProvider session lifecycle', () => {
  afterEach(cleanup);

  it('holds the bootstrap state until restore resolves, then renders signed out without guessing', async () => {
    const restore = deferred<AuthenticatedSession | null>();
    const repositories = createRepositories(restore.promise);
    await render(<AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}><Probe /></AuthProvider>);
    expect(screen.getByTestId('status').props.children).toBe('bootstrapping');
    await act(async () => restore.resolve(null));
    expect(screen.getByTestId('status').props.children).toBe('signedOut');
  });

  it('restores a valid session and fetches the RLS-owned profile', async () => {
    const repositories = createRepositories(Promise.resolve(session));
    await render(<AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('signedIn'));
    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    expect(screen.getByTestId('email').props.children).toBe('owner@example.com');
    expect(repositories.profiles.getOwnProfile).toHaveBeenCalledWith(userId);
  });

  it('treats an invalid restored session as signed out and responds to later auth events', async () => {
    const repositories = createRepositories(Promise.reject(new IntegrationError('sessionExpired')));
    await render(<AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('signedOut'));
    await act(async () => repositories.emit(session));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('signedIn'));
  });

  it('keeps signed-in state when remote sign-out fails and reconciles a successful profile update', async () => {
    const repositories = createRepositories(Promise.resolve(session));
    jest.mocked(repositories.auth.signOut).mockRejectedValueOnce(new IntegrationError('network'));
    const user = userEvent.setup();
    await render(<AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('signedIn'));
    await user.press(screen.getByText('sign-out'));
    await waitFor(() => expect(screen.getByTestId('failure').props.children).toBe('sign-out'));
    expect(screen.getByTestId('status').props.children).toBe('signedIn');
    await user.press(screen.getByText('update'));
    await waitFor(() => expect(repositories.profiles.updateOwnProfile).toHaveBeenCalledWith(userId, { displayName: 'Updated' }));
    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
  });

  it('unsubscribes and ignores pending profile work after unmount', async () => {
    const pendingProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(session));
    jest.mocked(repositories.profiles.getOwnProfile).mockReturnValueOnce(pendingProfile.promise);
    const view = await render(<AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('profile-status').props.children).toBe('loading'));
    await view.unmount();
    await act(async () => pendingProfile.resolve(profile));
    expect(repositories.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
