import type { Session, User } from '@supabase/supabase-js';

import type { Profile } from '../profile/data/profileRepository';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
};

export type SignUpResult = {
  confirmationRequired: boolean;
};
