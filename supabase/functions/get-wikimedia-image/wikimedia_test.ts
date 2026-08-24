import assert from 'node:assert/strict';
import {
  fetchDestinationCoverFromWikimedia,
  fetchExactPlaceImageFromWikimedia,
} from './wikimedia.ts';
import type { TrustedPlaceContext } from './types.ts';

const context: TrustedPlaceContext = {
  placeName: 'Chùa Arun',
  placeQuery: 'Wat Arun Bangkok Thailand',
  placeAddress: 'Bangkok Yai, Bangkok, Thailand',
  destination: 'Bangkok, Thailand',
  latitude: 13.7437,
  longitude: 100.4889,
};

function metadata(value: string): { value: string } {
  return { value };
}

function responseFor(input: {
  title: string;
  description: string;
  categories: string;
  latitude?: string;
  longitude?: string;
}) {
  return new Response(JSON.stringify({
    query: {
      pages: {
        1: {
          title: input.title,
          imageinfo: [{
            thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Wat_Arun.jpg',
            extmetadata: {
              Artist: metadata('<a>Jane Photographer</a>'),
              LicenseShortName: metadata('CC BY-SA 4.0'),
              LicenseUrl: metadata('https://creativecommons.org/licenses/by-sa/4.0/'),
              ImageDescription: metadata(input.description),
              Categories: metadata(input.categories),
              ...(input.latitude ? { GPSLatitude: metadata(input.latitude) } : {}),
              ...(input.longitude ? { GPSLongitude: metadata(input.longitude) } : {}),
            },
          }],
        },
      },
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

Deno.test('Wikimedia exact landmark match retains attribution and license', async () => {
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, async () => responseFor({
    title: 'File:Wat Arun Bangkok.jpg',
    description: 'Wat Arun, Temple of Dawn in Bangkok, Thailand',
    categories: 'Wat Arun Bangkok',
    latitude: '13.7437',
    longitude: '100.4889',
  }));
  assert.equal(result.source, 'WIKIMEDIA_PLACE');
  assert.equal(result.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');
  assert.equal(result.attribution?.displayName, 'Jane Photographer');
  assert.equal(result.attribution?.license, 'CC BY-SA 4.0');
  assert.equal(result.confidence, 0.99);
});

Deno.test('Wikimedia ambiguous generic temple candidate is rejected', async () => {
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, async () => responseFor({
    title: 'File:Thai temple.jpg',
    description: 'A temple in Bangkok, Thailand',
    categories: 'Temples in Thailand',
  }));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia exact name in the wrong city is rejected', async () => {
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, async () => responseFor({
    title: 'File:Wat Arun model in Tokyo.jpg',
    description: 'Wat Arun scale model in Tokyo Japan',
    categories: 'Museums in Tokyo',
  }));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia destination cover requires the destination identity', async () => {
  const accepted = await fetchDestinationCoverFromWikimedia('Bangkok, Thailand', 800, async () => responseFor({
    title: 'File:Bangkok skyline.jpg',
    description: 'Bangkok skyline at dusk',
    categories: 'Skyline of Bangkok',
  }));
  assert.equal(accepted.source, 'DESTINATION_COVER');
  assert.equal(accepted.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');

  const rejected = await fetchDestinationCoverFromWikimedia('Tokyo, Japan', 800, async () => responseFor({
    title: 'File:Bangkok skyline.jpg',
    description: 'Bangkok skyline at dusk',
    categories: 'Skyline of Bangkok',
  }));
  assert.equal(rejected.uri, null);
});
