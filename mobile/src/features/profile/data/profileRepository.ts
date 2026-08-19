import { supabase } from '../../../lib/supabase/client';
import type { Database } from '../../../lib/supabase/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export async function upsertMyProfile(userId: string, displayName: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) {
    throw error;
  }
  return data;
}
