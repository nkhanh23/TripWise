import { getResolvedImageSource } from '../src/features/images/resolvedImageSource';

describe('getResolvedImageSource', () => {
  it('uses an array source so Android forwards the Wikimedia user agent header', () => {
    expect(
      getResolvedImageSource('https://upload.wikimedia.org/example.jpg', {
        uri: 'https://upload.wikimedia.org/example.jpg',
        source: 'WIKIMEDIA_PLACE',
      }),
    ).toEqual([
      {
        uri: 'https://upload.wikimedia.org/example.jpg',
        headers: {
          'User-Agent': 'TripWise/1.0 (https://github.com/nkhanh23/TripWise)',
        },
      },
    ]);
  });

  it.each(['GOOGLE_PLACE', 'DESTINATION_COVER'] as const)(
    'does not add Wikimedia headers to %s images',
    (source) => {
      expect(
        getResolvedImageSource('https://example.com/image.jpg', {
          uri: 'https://example.com/image.jpg',
          source,
        }),
      ).toEqual({ uri: 'https://example.com/image.jpg' });
    },
  );
});
