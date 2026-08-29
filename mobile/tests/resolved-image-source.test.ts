import { getResolvedImageSource } from '../src/features/images/resolvedImageSource';

const wikimediaHeaders = {
  'User-Agent': 'TripWise/1.0 (https://github.com/nkhanh23/TripWise)',
};

describe('getResolvedImageSource', () => {
  it.each(['WIKIMEDIA_PLACE', 'DESTINATION_COVER'] as const)(
    'uses the shared Android Wikimedia header for %s',
    (source) => {
      expect(
        getResolvedImageSource('https://upload.wikimedia.org/example.jpg', {
          uri: 'https://upload.wikimedia.org/example.jpg',
          source,
        }),
      ).toEqual([{ uri: 'https://upload.wikimedia.org/example.jpg', headers: wikimediaHeaders }]);
    },
  );

  it('does not add Wikimedia headers to Google images', () => {
    expect(
      getResolvedImageSource('https://example.com/image.jpg', {
        uri: 'https://example.com/image.jpg',
        source: 'GOOGLE_PLACE',
      }),
    ).toEqual({ uri: 'https://example.com/image.jpg' });
  });
});