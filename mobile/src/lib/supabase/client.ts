import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";
import { supabaseSecureStorage } from "./secureStoreAdapter";

const config = getSupabaseConfig();

export const supabase = createClient<Database>(
  config.url,
  config.publishableKey,
  {
    auth: {
      storage: supabaseSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
