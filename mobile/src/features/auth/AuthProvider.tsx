import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase/client';
import { getMyProfile, upsertMyProfile } from '../profile/data/profileRepository';
import { signInWithEmail, signOut as signOutFromService, signUpWithEmail } from './services/authService';
import type { AuthState, SignUpResult } from './types';

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const initialState: AuthState = { status: 'loading', session: null, user: null, profile: null };
const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(session: Session) {
  const existingProfile = await getMyProfile(session.user.id);
  if (existingProfile) {
    return existingProfile;
  }

  const displayName = typeof session.user.user_metadata.display_name === 'string'
    ? session.user.user_metadata.display_name
    : null;
  return upsertMyProfile(session.user.id, displayName);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialState);
  const requestVersion = useRef(0);

  const resolveSession = useCallback(async (session: Session | null) => {
    const version = ++requestVersion.current;
    if (!session) {
      setState({ status: 'unauthenticated', session: null, user: null, profile: null });
      return;
    }

    setState({ status: 'loading', session, user: session.user, profile: null });
    let profile = null;
    try {
      profile = await loadProfile(session);
    } catch {
      // Authentication remains valid even if a transient profile request fails.
    }

    if (requestVersion.current === version) {
      setState({ status: 'authenticated', session, user: session.user, profile });
    }
  }, []);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => resolveSession(data.session))
      .catch(() => resolveSession(null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, [resolveSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Mock demo account bypass for quick UI testing
    if (normalizedEmail === 'demo@tripwise.io' || normalizedEmail === 'test@tripwise.io') {
      const mockSession = {
        access_token: 'mock_jwt_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 86400,
        token_type: 'bearer',
        user: {
          id: 'mock_user_123',
          app_metadata: {},
          user_metadata: { display_name: 'Alex Morgan' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: normalizedEmail,
        },
      } as unknown as Session;

      setState({
        status: 'authenticated',
        session: mockSession,
        user: mockSession.user,
        profile: {
          id: 'mock_user_123',
          userId: 'mock_user_123',
          displayName: 'Alex Morgan',
          homeAirport: 'BKK',
          travelStyle: 'culture',
        } as any,
      });
      return;
    }

    const { session } = await signInWithEmail(email, password);
    await resolveSession(session);
  }, [resolveSession]);

  const signUp = useCallback(async (displayName: string, email: string, password: string): Promise<SignUpResult> => {
    const { session } = await signUpWithEmail(displayName, email, password);
    if (session) {
      await resolveSession(session);
    }
    return { confirmationRequired: session === null };
  }, [resolveSession]);

  const signOut = useCallback(async () => {
    await signOutFromService();
    await resolveSession(null);
  }, [resolveSession]);

  return <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
