import {
  CompositePlaceImageRepository,
  maximumConcurrentImageRequests,
  maximumTripImageResolutionAttempts,
  SequentialTripCoverImageRepository,
} from '../src/integration/imageResolution';
import type { ResolvedImage } from '../src/integration/contracts';
import type {
  DestinationCoverRepository,
  PlacePhotoRepository,
  WikimediaImageRepository,
} from '../src/integration/repositories';

const none: ResolvedImage = { uri: null, source: 'WIKIMEDIA_PLACE' };
const wikiImage: ResolvedImage = {
  uri: 'https://upload.wikimedia.org/example.jpg',
  source: 'WIKIMEDIA_PLACE',
  matchedEntity: 'File:Wat Arun.jpg',
  confidence: 0.95,
  attribution: {
    displayName: 'Example author',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wat_Arun.jpg',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

function google(results: Array<string | null | Error>): PlacePhotoRepository {
  return {
    getPhoto: jest.fn(async ({ googlePlaceId }) => {
      const result = results.shift() ?? null;
      if (result instanceof Error) throw result;
      return { googlePlaceId, photoUri: result };
    }),
  };
}

function wikimedia(results: ResolvedImage[]): WikimediaImageRepository {
  return { getImage: jest.fn(async () => results.shift() ?? none) };
}

function destination(result: ResolvedImage): DestinationCoverRepository {
  return { getDestinationCover: jest.fn(async () => result) };
}

describe('semantic image resolution', () => {
  it('uses Google first for an exact place image', async () => {
    const wiki = wikimedia([wikiImage]);
    const result = await new CompositePlaceImageRepository(google(['https://google/photo']), wiki)
      .getPlaceImage({ googlePlaceId: 'google_place_123' });
    expect(result).toEqual({ uri: 'https://google/photo', source: 'GOOGLE_PLACE' });
    expect(wiki.getImage).not.toHaveBeenCalled();
  });

  it('maps Google author attribution into the provider-neutral model', async () => {
    const googleRepo: PlacePhotoRepository = {
      getPhoto: jest.fn(async ({ googlePlaceId }) => ({
        googlePlaceId,
        photoUri: 'https://google/photo',
        authorAttribution: {
          displayName: 'Google contributor',
          uri: 'https://maps.google.com/contributor',
        },
      })),
    };
    const result = await new CompositePlaceImageRepository(googleRepo, wikimedia([]))
      .getPlaceImage({ googlePlaceId: 'google_place_123' });
    expect(result.attribution).toEqual({
      displayName: 'Google contributor',
      sourceUrl: 'https://maps.google.com/contributor',
    });
  });

  it('falls back to exact Wikimedia and preserves attribution', async () => {
    const result = await new CompositePlaceImageRepository(google([null]), wikimedia([wikiImage]))
      .getPlaceImage({ googlePlaceId: 'google_place_123' });
    expect(result).toEqual(wikiImage);
    expect(result.attribution?.license).toBe('CC BY-SA 4.0');
  });

  it('falls back after a Google provider failure', async () => {
    const result = await new CompositePlaceImageRepository(google([new Error('provider')]), wikimedia([wikiImage]))
      .getPlaceImage({ googlePlaceId: 'google_place_123' });
    expect(result.source).toBe('WIKIMEDIA_PLACE');
  });

  it('never uses a destination cover for a place image', async () => {
    const result = await new CompositePlaceImageRepository(google([null]), wikimedia([none]))
      .getPlaceImage({ googlePlaceId: 'google_place_123' });
    expect(result).toEqual({ uri: null, source: 'PLACEHOLDER' });
    expect(result.source).not.toBe('DESTINATION_COVER');
  });

  it('uses the first Google trip candidate when available', async () => {
    const googleRepo = google(['https://google/first']);
    const wiki = wikimedia([]);
    const destinationRepo = destination({ uri: null, source: 'DESTINATION_COVER' });
    const result = await new SequentialTripCoverImageRepository(googleRepo, wiki, destinationRepo)
      .getTripCover({ googlePlaceIds: ['place_123456', 'place_234567'], destination: 'Bangkok' });
    expect(result.uri).toBe('https://google/first');
    expect(googleRepo.getPhoto).toHaveBeenCalledTimes(1);
  });

  it('tries the second Google candidate before fallback providers', async () => {
    const googleRepo = google([null, 'https://google/second']);
    const wiki = wikimedia([]);
    const result = await new SequentialTripCoverImageRepository(
      googleRepo,
      wiki,
      destination({ uri: null, source: 'DESTINATION_COVER' }),
    ).getTripCover({ googlePlaceIds: ['place_123456', 'place_234567'], destination: 'Bangkok' });
    expect(result.uri).toBe('https://google/second');
    expect(googleRepo.getPhoto).toHaveBeenCalledTimes(2);
    expect(wiki.getImage).not.toHaveBeenCalled();
  });

  it('tries Wikimedia candidates only after both Google candidates', async () => {
    const wiki = wikimedia([none, wikiImage]);
    const result = await new SequentialTripCoverImageRepository(
      google([null, null]),
      wiki,
      destination({ uri: null, source: 'DESTINATION_COVER' }),
    ).getTripCover({ googlePlaceIds: ['place_123456', 'place_234567'], destination: 'Bangkok' });
    expect(result).toEqual(wikiImage);
    expect(wiki.getImage).toHaveBeenCalledTimes(2);
  });

  it('uses a destination cover only after place providers fail', async () => {
    const cover: ResolvedImage = { uri: 'https://upload.wikimedia.org/bangkok.jpg', source: 'DESTINATION_COVER' };
    const result = await new SequentialTripCoverImageRepository(
      google([null, null]),
      wikimedia([none, none]),
      destination(cover),
    ).getTripCover({ googlePlaceIds: ['place_123456', 'place_234567'], destination: 'Bangkok' });
    expect(result).toEqual(cover);
  });

  it('returns a placeholder after at most five bounded attempts', async () => {
    const googleRepo = google([null, null, 'https://google/should-not-run']);
    const wiki = wikimedia([none, none, wikiImage]);
    const destinationRepo = destination({ uri: null, source: 'DESTINATION_COVER' });
    const result = await new SequentialTripCoverImageRepository(googleRepo, wiki, destinationRepo)
      .getTripCover({
        googlePlaceIds: ['place_123456', 'place_234567', 'place_345678'],
        destination: 'Bangkok',
      });
    expect(result).toEqual({ uri: null, source: 'PLACEHOLDER' });
    expect(googleRepo.getPhoto).toHaveBeenCalledTimes(2);
    expect(wiki.getImage).toHaveBeenCalledTimes(2);
    expect(destinationRepo.getDestinationCover).toHaveBeenCalledTimes(1);
    expect(maximumTripImageResolutionAttempts).toBe(5);
    expect(maximumConcurrentImageRequests).toBe(3);
  });
});
