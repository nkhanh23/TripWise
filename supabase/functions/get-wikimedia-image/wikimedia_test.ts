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
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, () => Promise.resolve(responseFor({
    title: 'File:Wat Arun Bangkok.jpg',
    description: 'Wat Arun, Temple of Dawn in Bangkok, Thailand',
    categories: 'Wat Arun Bangkok',
    latitude: '13.7437',
    longitude: '100.4889',
  })));
  assert.equal(result.source, 'WIKIMEDIA_PLACE');
  assert.equal(result.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');
  assert.equal(result.attribution?.displayName, 'Jane Photographer');
  assert.equal(result.attribution?.license, 'CC BY-SA 4.0');
  assert.equal(result.confidence, 0.99);
});

Deno.test('Wikimedia ambiguous generic temple candidate is rejected', async () => {
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, () => Promise.resolve(responseFor({
    title: 'File:Thai temple.jpg',
    description: 'A temple in Bangkok, Thailand',
    categories: 'Temples in Thailand',
  })));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia exact name in the wrong city is rejected', async () => {
  const result = await fetchExactPlaceImageFromWikimedia(context, 800, () => Promise.resolve(responseFor({
    title: 'File:Wat Arun model in Tokyo.jpg',
    description: 'Wat Arun scale model in Tokyo Japan',
    categories: 'Museums in Tokyo',
  })));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia destination cover keeps direct Nha Trang identity search and accepts correct geographic context', async () => {
  let requestUrl = '';
  const result = await fetchDestinationCoverFromWikimedia('Nha Trang, Khanh Hoa, Vietnam', 160, (input) => {
    requestUrl = String(input);
    return Promise.resolve(responseFor({
      title: 'File:Nha Trang, Khanh Hoa Province, Vietnam.jpg',
      description: 'Nha Trang, Khanh Hoa Province, Vietnam',
      categories: 'Nha Trang Vietnam',
    }));
  });
  assert.match(requestUrl, /gsrsearch=Nha\+Trang%2C\+Khanh\+Hoa%2C\+Vietnam/);
  assert.doesNotMatch(requestUrl, /landmark|skyline/);
  assert.equal(result.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');
  assert.equal(result.source, 'DESTINATION_COVER');
});

Deno.test('Wikimedia destination cover rejects Paris, Texas for Paris, France', async () => {
  const result = await fetchDestinationCoverFromWikimedia('Paris, France', 800, () => Promise.resolve(responseFor({
    title: 'File:Paris Texas downtown.jpg',
    description: 'Paris, Texas, USA',
    categories: 'Paris Texas',
  })));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia destination cover rejects Paris, France for Paris, TX, USA', async () => {
  const result = await fetchDestinationCoverFromWikimedia('Paris, TX, USA', 800, () => Promise.resolve(responseFor({
    title: 'File:Paris France.jpg',
    description: 'Paris, France',
    categories: 'Paris France',
  })));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia destination cover accepts Paris, TX, USA only with both short context tokens', async () => {
  const result = await fetchDestinationCoverFromWikimedia('Paris, TX, USA', 800, () => Promise.resolve(responseFor({
    title: 'File:Paris Texas USA.jpg',
    description: 'Paris, TX, USA',
    categories: 'Paris Texas USA',
  })));
  assert.equal(result.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');
});

Deno.test('Wikimedia destination cover rejects a same-name city in the wrong country and region', async () => {
  const result = await fetchDestinationCoverFromWikimedia('San Jose, California, USA', 800, () => Promise.resolve(responseFor({
    title: 'File:San Jose Costa Rica.jpg',
    description: 'San Jose, Costa Rica',
    categories: 'San Jose Costa Rica',
  })));
  assert.equal(result.uri, null);
});

Deno.test('Wikimedia destination cover accepts a city without extra geographic context only when its identity matches', async () => {
  const accepted = await fetchDestinationCoverFromWikimedia('Bangkok', 800, () => Promise.resolve(responseFor({
    title: 'File:Bangkok skyline.jpg',
    description: 'Bangkok skyline at dusk',
    categories: 'Skyline of Bangkok',
  })));
  assert.equal(accepted.source, 'DESTINATION_COVER');
  assert.equal(accepted.uri, 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg');

  const rejected = await fetchDestinationCoverFromWikimedia('Tokyo', 800, () => Promise.resolve(responseFor({
    title: 'File:Bangkok skyline.jpg',
    description: 'Bangkok skyline at dusk',
    categories: 'Skyline of Bangkok',
  })));
  assert.equal(rejected.uri, null);
});
