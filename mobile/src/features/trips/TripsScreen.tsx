import { useMemo } from 'react';
import { SequentialTripCoverImageRepository } from '../../integration/imageResolution';
import type { PlacePhotoRepository, SavedTripsRepository, TripCoverImageRepository } from '../../integration/repositories';
import { SupabasePlacePhotoRepository } from '../../integration/remote/supabasePlacePhotoRepository';
import { SupabaseWikimediaImageRepository } from '../../integration/remote/supabaseWikimediaImageRepository';
import { SupabaseSavedTripsRepository } from '../../integration/remote/supabaseTripRepositories';
import { supabase } from '../../lib/supabase/client';
import { MyTripsScreen } from './screens/MyTripsScreen';

type Props = {
  repository?: SavedTripsRepository;
  photoRepository?: PlacePhotoRepository;
  tripCoverRepository?: TripCoverImageRepository;
};

export function TripsScreen({ repository, photoRepository, tripCoverRepository }: Props) {
  const effectiveRepository = useMemo(
    () => repository ?? new SupabaseSavedTripsRepository(supabase),
    [repository],
  );
  const effectivePhotoRepository = useMemo(
    () => photoRepository ?? new SupabasePlacePhotoRepository(supabase),
    [photoRepository],
  );
  const effectiveTripCoverRepository = useMemo(() => {
    if (tripCoverRepository) return tripCoverRepository;
    const wikimedia = new SupabaseWikimediaImageRepository(supabase);
    return new SequentialTripCoverImageRepository(effectivePhotoRepository, wikimedia, wikimedia);
  }, [effectivePhotoRepository, tripCoverRepository]);
  return (
    <MyTripsScreen
      repository={effectiveRepository}
      tripCoverRepository={effectiveTripCoverRepository}
    />
  );
}

export { MyTripsScreen };
