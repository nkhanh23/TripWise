import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from './config';
import type { Database } from './database.types';

const config = getSupabaseConfig();

// P2 will add a SecureStore-backed session adapter before enabling persistence.
export const supabase = createClient<Database>(config.url, config.publishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
