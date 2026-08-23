import { useMemo } from 'react';
import type { SavedTripsRepository } from '../../integration/repositories';
import { SupabaseSavedTripsRepository } from '../../integration/remote/supabaseTripRepositories';
import { supabase } from '../../lib/supabase/client';
import { MyTripsScreen } from './screens/MyTripsScreen';

type Props = {
  repository?: SavedTripsRepository;
};

export function TripsScreen({ repository }: Props) {
  const effectiveRepository = useMemo(
    () => repository ?? new SupabaseSavedTripsRepository(supabase),
    [repository],
  );
  return <MyTripsScreen repository={effectiveRepository} />;
}

export { MyTripsScreen };
